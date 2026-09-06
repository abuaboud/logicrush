import { databaseService } from './database.js'
import { ids } from './ids.js'
import { password } from '../identity/auth/password.js'

// Deterministic development/E2E data, shaped like the live site: an Arabic
// problemset with mixed point values (100 is not a multiple of 250 -- the case
// that catches integer-vs-real scoring), a contest, a forum, and a leaderboard.
// Idempotent: keyed on slugs/usernames, safe to re-run.
export const seed = {
  async run(): Promise<void> {
    const db = databaseService.db()
    const pw = await password.hash('password123')

    const users = [
      { username: 'superjava', full: 'سوبر جافا', rating: 2397, role: 'admin' as const, contrib: 40 },
      { username: 'titanium', full: 'تيتانيوم', rating: 2133, role: 'setter' as const, contrib: 25 },
      { username: 'younes38', full: 'يونس', rating: 2067, role: 'user' as const, contrib: 18 },
      { username: 'logic_ps', full: 'لوجيك', rating: 2030, role: 'user' as const, contrib: 15 },
      { username: 'omar', full: 'عمر', rating: 1972, role: 'user' as const, contrib: 12 },
      { username: 'Saqqattack', full: 'صقر', rating: 1930, role: 'user' as const, contrib: 9 },
      { username: 'demo', full: 'مستخدم تجريبي', rating: 1500, role: 'user' as const, contrib: 3 },
    ]
    const userId = new Map<string, string>()
    for (const u of users) {
      const id = ids.new()
      await db.insertInto('user').values({
        id, legacy_id: null, username: u.username, full_name: u.full, email: `${u.username}@logicrush.test`,
        password_hash: pw, role: u.role, rating: u.rating, contribution_points: u.contrib,
        country_code: 'JO', gender: 'unspecified', birthday: null, img_url: null, email_validated: true,
        registered_at: new Date('2019-05-01T10:00:00Z'), last_online_at: new Date(),
      }).onConflict((oc) => oc.column('id').doNothing()).execute()
      const row = await db.selectFrom('user').select('id').where('username', '=', u.username).executeTakeFirst()
      userId.set(u.username, row?.id ?? id)
    }

    const tags = ['combinatrics', 'pattern', 'graph', 'algebra', 'logic', 'discrete-math']
    const tagId = new Map<string, string>()
    for (const name of tags) {
      const existing = await db.selectFrom('tag').select('id').where('name', '=', name).executeTakeFirst()
      const id = existing?.id ?? ids.new()
      if (existing === undefined) await db.insertInto('tag').values({ id, legacy_id: null, name, description: null }).execute()
      tagId.set(name, id)
    }

    const author = userId.get('superjava')!
    const writer = userId.get('titanium')!
    const problems = [
      { slug: 'even-numbers', title: 'عيسى يكره الأرقام الفردية', points: 500, solved: 1218, correct: 'ب', tags: ['combinatrics'] },
      { slug: 'vegetable-shop', title: 'محل الخضار', points: 100, solved: 1180, correct: 'أ', tags: [] },
      { slug: 'missing-numbers', title: 'الأرقام المفقودة', points: 750, solved: 1025, correct: 'ج', tags: ['pattern'] },
      { slug: 'eid-trip', title: 'رحلة العيد', points: 250, solved: 1016, correct: 'د', tags: [] },
      { slug: 'jaber-defeat', title: 'أحمد جابر لا يعرف الهزيمة', points: 1000, solved: 989, correct: 'ب', tags: ['graph'] },
      { slug: 'math-physics-exam', title: 'امتحان رياضيات و فيزياء', points: 500, solved: 959, correct: 'أ', tags: ['combinatrics', 'discrete-math'] },
      { slug: 'honey-jars', title: 'مرطبان من العسل', points: 300, solved: 938, correct: 'ج', tags: ['algebra'] },
      { slug: 'treasure-box', title: 'صندوق الكنز', points: 750, solved: 933, correct: 'ب', tags: ['logic'] },
    ]
    for (const p of problems) {
      const existing = await db.selectFrom('problem').select('id').where('slug', '=', p.slug).executeTakeFirst()
      const id = existing?.id ?? ids.new()
      if (existing === undefined) {
        await db.insertInto('problem').values({
          id, legacy_id: null, slug: p.slug, title: p.title, type: 'choice', author_id: author, writer_id: writer,
          description: `<p>هذا سؤال منطقي تجريبي: ${p.title}. اختر الإجابة الصحيحة من الخيارات التالية.</p>`,
          solution: `<p>الحل: الإجابة الصحيحة هي «${p.correct}».</p>`, correct_option: `الخيار ${p.correct}`,
          visibility: 'public', approved: true, points: p.points, solved_count: p.solved, number_of_attempts: 4,
          contest_id: null, order_index: 0, created_at: new Date('2019-06-01T10:00:00Z'), updated_at: new Date(),
        }).execute()
        for (const [i, letter] of ['أ', 'ب', 'ج', 'د'].entries()) {
          await db.insertInto('problem_option').values({
            id: ids.new(), legacy_id: null, problem_id: id, content: `الخيار ${letter}`, visibility: 'public', order_index: i,
          }).execute()
        }
        for (const t of p.tags) {
          await db.insertInto('problem_tag').values({ problem_id: id, tag_id: tagId.get(t)! })
            .onConflict((oc) => oc.doNothing()).execute()
        }
      }
    }

    // Forum: two subjects, a few categories.
    const subjects = [{ title: 'مدونات عامة', order: 0 }, { title: 'مدونات أُخرى', order: 1 }]
    const subjectId = new Map<string, string>()
    for (const s of subjects) {
      const existing = await db.selectFrom('blog_subject').select('id').where('title', '=', s.title).executeTakeFirst()
      const id = existing?.id ?? ids.new()
      if (existing === undefined) await db.insertInto('blog_subject').values({ id, legacy_id: null, title: s.title, order_index: s.order }).execute()
      subjectId.set(s.title, id)
    }
    const categories = [
      { slug: 'announcements', title: 'إعلانات مهمة', desc: 'إعلانات الموقع', subject: 'مدونات عامة' },
      { slug: 'contests', title: 'مسابقات', desc: 'هنا تجدون جميع مسابقات الموقع', subject: 'مدونات عامة' },
      { slug: 'bugs', title: 'إصلاح المشكلات', desc: 'واجهتك مشكلة في الموقع؟', subject: 'مدونات عامة' },
      { slug: 'introductions', title: 'التعارف', desc: 'هل أنت مستخدم جديد؟', subject: 'مدونات أُخرى' },
    ]
    const catId = new Map<string, string>()
    for (const [i, c] of categories.entries()) {
      const existing = await db.selectFrom('blog_category').select('id').where('slug', '=', c.slug).executeTakeFirst()
      const id = existing?.id ?? ids.new()
      if (existing === undefined) {
        await db.insertInto('blog_category').values({
          id, legacy_id: null, slug: c.slug, title: c.title, description: c.desc,
          subject_id: subjectId.get(c.subject)!, order_index: i,
        }).execute()
      }
      catId.set(c.slug, id)
    }

    const annExists = await db.selectFrom('blog').select('id').where('title', '=', 'مرحبا بكم في لوجيك رَش').executeTakeFirst()
    if (annExists === undefined) {
      await db.insertInto('blog').values({
        id: ids.new(), legacy_id: null, title: 'مرحبا بكم في لوجيك رَش',
        content: '<p>موقع تعليميّ، أسّس ليُنمّي مَلَكات التفكير الحسابي والمنطقي من خلال إقامة مسابقات دوريّة.</p>',
        author_id: author, category_id: catId.get('announcements')!, visibility: 'public', announcement: true,
        up_votes: 12, down_votes: 0, comment_count: 0, created_at: new Date('2019-05-24T11:43:00Z'), last_activity_at: new Date(),
      }).execute()
    }

    // A finished contest with its problems, so scoreboard/rating have data.
    const contestExists = await db.selectFrom('contest').select('id').where('slug', '=', 'meshka-1').executeTakeFirst()
    if (contestExists === undefined) {
      const cid = ids.new()
      await db.insertInto('contest').values({
        id: cid, legacy_id: null, slug: 'meshka-1', title: 'MESHKA #1', author_id: author,
        starts_at: new Date('2020-11-19T19:00:00Z'), length_minutes: 60, allowed_attempts: 3,
        visibility: 'public', created_at: new Date('2020-11-01T10:00:00Z'), updated_at: new Date(),
      }).execute()
      for (const [i, slug] of ['even-numbers', 'honey-jars', 'treasure-box'].entries()) {
        const pr = await db.selectFrom('problem').select(['id', 'points', 'correct_option']).where('slug', '=', slug).executeTakeFirst()
        if (pr === undefined) continue
        const contestProblemId = ids.new()
        const orig = await db.selectFrom('problem').selectAll().where('id', '=', pr.id).executeTakeFirstOrThrow()
        await db.insertInto('problem').values({
          ...orig, id: contestProblemId, slug: `meshka-1-${slug}`, legacy_id: null,
          contest_id: cid, order_index: i, solved_count: 0,
        }).execute()
      }
      // register three users, seed some submissions inside the window
      const cproblems = await db.selectFrom('problem').select(['id', 'correct_option']).where('contest_id', '=', cid).orderBy('order_index').execute()
      const start = new Date('2020-11-19T19:00:00Z').getTime()
      for (const [ui, uname] of ['younes38', 'omar', 'logic_ps'].entries()) {
        const uid = userId.get(uname)!
        await db.insertInto('contest_register').values({ contest_id: cid, user_id: uid, registered_at: new Date(start - 60000) })
          .onConflict((oc) => oc.doNothing()).execute()
        for (const [pi, cp] of cproblems.entries()) {
          if (pi > ui) continue // each user solves fewer problems, so ranks differ
          await db.insertInto('submission').values({
            id: ids.new(), legacy_id: null, user_id: uid, problem_id: cp.id, answer: cp.correct_option,
            correct: true, blind: false, submitted_at: new Date(start + (pi * 5 + ui * 2 + 1) * 60000),
          }).execute()
        }
      }
    }

    console.log('✔ seeded')
  },
}

const invokedDirectly = process.argv[1]?.includes('seed') === true
if (invokedDirectly) {
  seed.run().then(async () => databaseService.close()).catch(async (e) => { console.error(e); await databaseService.close(); process.exit(1) })
}
