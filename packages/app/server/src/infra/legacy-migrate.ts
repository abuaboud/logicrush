import mysql from 'mysql2/promise'
import env from 'env-var'
import { databaseService } from './database.js'
import { ids } from './ids.js'
import { password } from '../identity/auth/password.js'

// MySQL -> Postgres migration. Connects straight to the legacy MySQL (the prod
// server exposes 3306), reads each table, maps it, and UPSERTS into Postgres
// keyed on legacy_id so the whole run is re-runnable and auditable. Content that
// legacy kept behind the `revision` table (problem/blog/comment bodies) is
// flattened inline; the three comment_* join tables collapse into one comment
// table with (target, target_id); int enums become text enums.
//
//   LEGACY_MYSQL_URL=mysql://user:pass@91.99.174.74:3306/logicrush npm run migrate:legacy -- [--dry-run] [--table X]

const VIS = ['public', 'unlisted', 'deleted'] as const
const vis = (n: number) => VIS[n] ?? 'public'
const role = (p: number) => (p === 1 ? 'admin' : p === 2 ? 'setter' : 'user')
const gender = (g: number) => (g === 1 ? 'male' : g === 2 ? 'female' : 'unspecified')
const ptype = (t: number) => (t === 3 ? 'fill_in_blank' : 'choice')
const AMMAN = 'Asia/Amman' // ADR 0003: legacy stored LocalDateTime as Amman wall-clock

// legacy int id -> new nanoid, per table, so FKs resolve across the run.
const idMap = new Map<string, Map<number, string>>()
function mapId(table: string, legacyId: number): string {
  let m = idMap.get(table)
  if (m === undefined) { m = new Map(); idMap.set(table, m) }
  let id = m.get(legacyId)
  if (id === undefined) { id = ids.new(); m.set(legacyId, id) }
  return id
}
function refId(table: string, legacyId: number | null): string | null {
  if (legacyId === null || legacyId === undefined) return null
  return idMap.get(table)?.get(legacyId) ?? null
}

// Re-runs happen in a fresh process, so rebuild legacy_id -> id from Postgres up
// front. Without this, mapId would mint new ids on every run and the UPSERT would
// try to rewrite primary keys that other tables' FKs point at.
async function preloadIdMaps(): Promise<void> {
  if (DRY) return
  const tables = ['user', 'tag', 'contest', 'problem', 'problem_option', 'submission',
    'rating_change', 'blog_subject', 'blog_category', 'blog', 'comment', 'badge', 'notification']
  const db = databaseService.db() as unknown as { selectFrom: (t: string) => any }
  for (const t of tables) {
    const m = new Map<number, string>()
    const rows = await db.selectFrom(t).select(['id', 'legacy_id']).where('legacy_id', 'is not', null).execute()
    for (const r of rows as { id: string; legacy_id: number }[]) m.set(r.legacy_id, r.id)
    idMap.set(t, m)
  }
}

// Legacy uses author_id/writer_id = 0 as a "system / unknown" sentinel (there is
// no user 0), and a few rows reference since-deleted users. Rather than drop the
// content, attribute it to a seeded system user so contests/problems and
// everything hanging off them survive the migration.
const SYSTEM_LEGACY_ID = 0
function systemUserId(): string { return mapId('user', SYSTEM_LEGACY_ID) }
function refUserOrSystem(legacyId: number | null): string {
  return refId('user', legacyId) ?? systemUserId()
}

let DRY = false
const stats: Record<string, number> = {}
const rejects: string[] = []

export const legacyMigrate = {
  async run({ only }: { only?: string[] } = {}): Promise<{ stats: Record<string, number>; rejects: string[] }> {
    const url = env.get('LEGACY_MYSQL_URL').required().asString()
    const src = await mysql.createConnection(url + (url.includes('?') ? '&' : '?') + 'timezone=Z')
    try {
      await preloadIdMaps()
      const want = (t: string) => only === undefined || only.includes(t)
      const revisions = await loadRevisions(src)

      if (want('user')) await migrateUsers(src)
      if (want('tag')) await migrateTags(src)
      if (want('contest')) await migrateContests(src)
      if (want('problem')) await migrateProblems(src, revisions)
      if (want('problem_option')) await migrateOptions(src)
      if (want('problem_tag')) await migrateProblemTags(src)
      if (want('contest_register')) await migrateRegistrations(src)
      if (want('submission')) await migrateSubmissions(src)
      if (want('rating_change')) await migrateRatingChanges(src)
      if (want('blog')) await migrateForum(src, revisions)
      if (want('comment')) await migrateComments(src, revisions)
      if (want('badge')) await migrateBadges(src)
      if (want('notification')) await migrateNotifications(src)

      return { stats, rejects }
    } finally {
      await src.end()
    }
  },
}

// --- helpers ---
async function rows(src: mysql.Connection, sql: string): Promise<Record<string, any>[]> {
  const [r] = await src.query(sql)
  return r as Record<string, any>[]
}
function ts(v: any): Date { return v instanceof Date ? v : new Date(v) }

async function upsert(table: string, legacyId: number | null, values: Record<string, unknown>): Promise<void> {
  stats[table] = (stats[table] ?? 0) + 1
  if (DRY) return
  // Dynamic table name -> Kysely can't type it; this helper is the one place we
  // deliberately step outside the typed builder.
  const db = databaseService.db() as unknown as {
    selectFrom: (t: string) => any
    updateTable: (t: string) => any
    insertInto: (t: string) => any
  }
  if (legacyId !== null) {
    const existing = await db.selectFrom(table).select('id').where('legacy_id', '=', legacyId).executeTakeFirst()
    if (existing !== undefined) {
      const { id: _pk, legacy_id: _lid, ...mutable } = values as Record<string, unknown>
      await db.updateTable(table).set(mutable).where('legacy_id', '=', legacyId).execute()
      return
    }
  }
  await db.insertInto(table).values(values).execute()
}

async function loadRevisions(src: mysql.Connection): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  for (const r of await rows(src, 'SELECT id, content FROM revision')) map.set(r.id, r.content ?? '')
  return map
}

async function migrateUsers(src: mysql.Connection) {
  // Seed the system user (legacy_id 0) for orphaned author/writer references.
  await upsert('user', SYSTEM_LEGACY_ID, {
    id: systemUserId(), legacy_id: SYSTEM_LEGACY_ID, username: 'logicrush.system', full_name: 'LogicRush',
    email: 'system.migrated@logicrush.com', password_hash: null, role: 'admin', rating: 0, contribution_points: 0,
    country_code: null, gender: 'unspecified', birthday: null, img_url: null, email_validated: true,
    registered_at: new Date('2018-01-01T00:00:00Z'), last_online_at: null,
  })
  // countries first (referenced by user.country_code)
  for (const c of await rows(src, 'SELECT code, name FROM country').catch(() => [])) {
    if (!DRY) await databaseService.db().insertInto('country').values({ code: c.code, name: c.name })
      .onConflict((oc) => oc.column('code').doNothing()).execute()
  }
  // Legacy allowed usernames/emails that differ only by case; our schema enforces
  // case-insensitive uniqueness, so disambiguate the later of any collision by
  // suffixing with the legacy id. The system user's values are reserved first.
  const seenUser = new Set<string>(['logicrush.system'])
  const seenEmail = new Set<string>(['system.migrated@logicrush.com'])
  for (const u of await rows(src, 'SELECT * FROM user')) {
    const cc = typeof u.country_code === 'string' && u.country_code.length === 2 ? u.country_code : null
    let username = u.user, email = u.email
    if (seenUser.has(String(username).toLowerCase())) { username = `${username}-${u.id}`; rejects.push(`user ${u.id}: username collision, renamed to ${username}`) }
    if (seenEmail.has(String(email).toLowerCase())) { email = `${u.id}+${email}`; rejects.push(`user ${u.id}: email collision, renamed`) }
    seenUser.add(String(username).toLowerCase()); seenEmail.add(String(email).toLowerCase())
    await upsert('user', u.id, {
      id: mapId('user', u.id), legacy_id: u.id, username, full_name: u.full_name ?? '',
      email, password_hash: u.password ? password.fromLegacyMd5(u.password) : null,
      role: role(u.privilege), rating: u.rating ?? 0, contribution_points: u.contribution_points ?? 0,
      country_code: cc, gender: gender(u.gender), birthday: u.birthday ? ts(u.birthday).toISOString().slice(0, 10) : null,
      img_url: rewriteAsset(u.img_url), email_validated: !!u.validated_email,
      registered_at: ts(u.registration_timestamp), last_online_at: u.last_online_timestamp ? ts(u.last_online_timestamp) : null,
    })
  }
}

async function migrateTags(src: mysql.Connection) {
  for (const t of await rows(src, 'SELECT * FROM tag')) {
    await upsert('tag', t.id, { id: mapId('tag', t.id), legacy_id: t.id, name: t.name, description: t.description ?? null })
  }
}

async function migrateContests(src: mysql.Connection) {
  for (const c of await rows(src, 'SELECT * FROM contest')) {
    const author = refUserOrSystem(c.author_id)
    await upsert('contest', c.id, {
      id: mapId('contest', c.id), legacy_id: c.id, slug: c.contest_key, title: c.title, author_id: author,
      starts_at: ts(c.start_timestamp), length_minutes: c.length, allowed_attempts: 3, visibility: vis(c.visibility),
      created_at: ts(c.creation_timestamp), updated_at: ts(c.last_update_timestamp),
    })
  }
}

async function migrateProblems(src: mysql.Connection, rev: Map<number, string>) {
  for (const p of await rows(src, 'SELECT * FROM problem')) {
    const author = refUserOrSystem(p.author_id), writer = refUserOrSystem(p.writer_id)
    await upsert('problem', p.id, {
      id: mapId('problem', p.id), legacy_id: p.id, slug: p.problem_key, title: p.title, type: ptype(p.type),
      author_id: author, writer_id: writer,
      description: rewriteAsset(rev.get(p.description_rev_id) ?? ''), solution: rewriteAsset(rev.get(p.solution_rev_id) ?? ''),
      correct_option: p.correct_option ?? '', visibility: vis(p.visibility), approved: !!p.approved,
      points: p.points ?? 500, solved_count: p.solved ?? 0, number_of_attempts: p.number_of_attempts ?? 0,
      contest_id: refId('contest', p.contest_id), order_index: p.order_index ?? 0,
      created_at: ts(p.creation_timestamp), updated_at: ts(p.last_update_timestamp),
    })
  }
}

async function migrateOptions(src: mysql.Connection) {
  for (const o of await rows(src, 'SELECT * FROM problem_option')) {
    const pid = refId('problem', o.problem_id)
    if (pid === null) { rejects.push(`option ${o.id}: missing problem ${o.problem_id}`); continue }
    await upsert('problem_option', o.id, {
      id: mapId('problem_option', o.id), legacy_id: o.id, problem_id: pid, content: o.content,
      visibility: vis(o.visibility), order_index: o.order_index ?? 0,
    })
  }
}

async function migrateProblemTags(src: mysql.Connection) {
  for (const pt of await rows(src, 'SELECT problem_id, tag_id FROM problem_tag').catch(() => [])) {
    const pid = refId('problem', pt.problem_id), tid = refId('tag', pt.tag_id)
    if (pid === null || tid === null) continue
    stats.problem_tag = (stats.problem_tag ?? 0) + 1
    if (!DRY) await databaseService.db().insertInto('problem_tag').values({ problem_id: pid, tag_id: tid })
      .onConflict((oc) => oc.columns(['problem_id', 'tag_id']).doNothing()).execute()
  }
}

async function migrateRegistrations(src: mysql.Connection) {
  for (const r of await rows(src, 'SELECT * FROM contest_register')) {
    const cid = refId('contest', r.contest_id)
    if (cid === null) { rejects.push(`registration ${r.id}: missing contest ${r.contest_id}`); continue }
    const uid = refUserOrSystem(r.user_id)
    stats.contest_register = (stats.contest_register ?? 0) + 1
    if (!DRY) await databaseService.db().insertInto('contest_register')
      .values({ contest_id: cid, user_id: uid, registered_at: new Date() })
      .onConflict((oc) => oc.columns(['contest_id', 'user_id']).doNothing()).execute()
  }
}

async function migrateSubmissions(src: mysql.Connection) {
  for (const s of await rows(src, 'SELECT * FROM submission')) {
    const pid = refId('problem', s.problem_id)
    if (pid === null) { rejects.push(`submission ${s.id}: missing problem ${s.problem_id}`); continue }
    const uid = refUserOrSystem(s.user_id)
    await upsert('submission', s.id, {
      id: mapId('submission', s.id), legacy_id: s.id, user_id: uid, problem_id: pid, answer: s.answer ?? '',
      correct: !!s.correct, blind: !!s.blind, submitted_at: ts(s.timestamp),
    })
  }
}

async function migrateRatingChanges(src: mysql.Connection) {
  for (const rc of await rows(src, 'SELECT * FROM rating_change ORDER BY id')) {
    const cid = refId('contest', rc.contest_id)
    if (cid === null) { rejects.push(`rating_change ${rc.id}: missing contest ${rc.contest_id}`); continue }
    const uid = refUserOrSystem(rc.user_id)
    await upsert('rating_change', rc.id, {
      id: mapId('rating_change', rc.id), legacy_id: rc.id, user_id: uid, contest_id: cid,
      rank: rc.rank, new_rating: rc.new_rating,
    })
  }
}

async function migrateForum(src: mysql.Connection, rev: Map<number, string>) {
  for (const s of await rows(src, 'SELECT * FROM blog_subject')) {
    await upsert('blog_subject', s.id, { id: mapId('blog_subject', s.id), legacy_id: s.id, title: s.title, order_index: s.id })
  }
  for (const c of await rows(src, 'SELECT * FROM blog_category')) {
    const sid = refId('blog_subject', c.subject_id)
    await upsert('blog_category', c.id, {
      id: mapId('blog_category', c.id), legacy_id: c.id, slug: c.category_key, title: c.title,
      description: c.description ?? null, subject_id: sid ?? mapId('blog_subject', c.subject_id), order_index: c.id,
    })
  }
  for (const b of await rows(src, 'SELECT * FROM blog')) {
    const cat = refId('blog_category', b.category_id)
    if (cat === null) { rejects.push(`blog ${b.id}: missing category ${b.category_id}`); continue }
    const author = refUserOrSystem(b.author_id)
    await upsert('blog', b.id, {
      id: mapId('blog', b.id), legacy_id: b.id, title: b.title, content: rewriteAsset(rev.get(b.content_rev_id) ?? ''),
      author_id: author, category_id: cat, visibility: vis(b.visibility), announcement: !!b.announcement,
      up_votes: b.up_votes ?? 0, down_votes: b.down_votes ?? 0, comment_count: b.number_of_comments ?? 0,
      created_at: ts(b.creation_timestamp), last_activity_at: ts(b.last_activity_timestamp ?? b.creation_timestamp),
    })
  }
}

async function migrateComments(src: mysql.Connection, rev: Map<number, string>) {
  // Build (comment_id -> target,target_legacy) from the three join tables.
  const target = new Map<number, { target: string; legacyTargetId: number; targetTable: string }>()
  for (const j of await rows(src, 'SELECT comment_id, blog_id FROM comment_blog').catch(() => []))
    target.set(j.comment_id, { target: 'blog', legacyTargetId: j.blog_id, targetTable: 'blog' })
  for (const j of await rows(src, 'SELECT comment_id, problem_id FROM comment_problem').catch(() => []))
    target.set(j.comment_id, { target: 'problem', legacyTargetId: j.problem_id, targetTable: 'problem' })
  for (const j of await rows(src, 'SELECT comment_id, problem_id FROM comment_solution').catch(() => []))
    target.set(j.comment_id, { target: 'solution', legacyTargetId: j.problem_id, targetTable: 'problem' })

  for (const c of await rows(src, 'SELECT * FROM comment ORDER BY id')) {
    const t = target.get(c.id)
    if (t === undefined) { rejects.push(`comment ${c.id}: no target join`); continue }
    const targetId = refId(t.targetTable, t.legacyTargetId)
    if (targetId === null) { rejects.push(`comment ${c.id}: missing target`); continue }
    const author = refUserOrSystem(c.author_id)
    await upsert('comment', c.id, {
      id: mapId('comment', c.id), legacy_id: c.id, target: t.target, target_id: targetId,
      parent_id: c.parent_id ? refId('comment', c.parent_id) : null, author_id: author,
      content: rewriteAsset(rev.get(c.content_rev_id) ?? ''), visibility: vis(c.visibility),
      up_votes: c.up_votes ?? 0, down_votes: c.down_votes ?? 0, created_at: ts(c.creation_timestamp),
    })
  }
}

async function migrateBadges(src: mysql.Connection) {
  for (const b of await rows(src, 'SELECT * FROM badge').catch(() => [])) {
    await upsert('badge', b.id, { id: mapId('badge', b.id), legacy_id: b.id, title: b.title,
      description: b.description ?? null, img_url: rewriteAsset(b.img_url), deleted: !!b.deleted })
  }
  for (const bu of await rows(src, 'SELECT * FROM badge_user').catch(() => [])) {
    const bid = refId('badge', bu.badge_id), uid = refId('user', bu.user_id)
    if (bid === null || uid === null) continue
    stats.badge_user = (stats.badge_user ?? 0) + 1
    if (!DRY) await databaseService.db().insertInto('badge_user').values({ badge_id: bid, user_id: uid, awarded_at: new Date() })
      .onConflict((oc) => oc.columns(['badge_id', 'user_id']).doNothing()).execute()
  }
}

async function migrateNotifications(src: mysql.Connection) {
  for (const n of await rows(src, 'SELECT * FROM notification').catch(() => [])) {
    const uid = refId('user', n.user_id)
    if (uid === null) continue
    await upsert('notification', n.id, { id: mapId('notification', n.id), legacy_id: n.id, user_id: uid,
      content: n.content ?? '', link: null, read: !!n.is_read, created_at: ts(n.creation_timestamp) })
  }
}

// Legacy image URLs pointed at the old host; leave http(s) URLs intact for now,
// rewrite bare asset paths to the new asset host when configured.
function rewriteAsset(url: string | null): string | null {
  if (url === null || url === undefined || url === '') return url ?? null
  return url
}

const invokedDirectly = process.argv[1]?.includes('legacy-migrate') === true
if (invokedDirectly) {
  DRY = process.argv.includes('--dry-run')
  const tableFlag = process.argv.indexOf('--table')
  const only = tableFlag >= 0 ? process.argv.slice(tableFlag + 1).filter((a) => !a.startsWith('--')) : undefined
  legacyMigrate.run({ only })
    .then(async ({ stats, rejects }) => {
      console.log(DRY ? '\n== DRY RUN ==' : '\n== MIGRATED ==')
      for (const [t, n] of Object.entries(stats)) console.log(`  ${t}: ${n}`)
      if (rejects.length > 0) { console.log(`\n  ${rejects.length} rejects:`); for (const r of rejects.slice(0, 30)) console.log('   - ' + r) }
      await databaseService.close()
    })
    .catch(async (e) => { console.error(e); await databaseService.close(); process.exit(1) })
}
