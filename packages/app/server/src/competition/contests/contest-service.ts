import { AppError, ErrorCode } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import type { Principal } from '../../identity/auth/security.js'
import { isStaff } from '../../identity/auth/security.js'

// Contest state is always derived from the clock against starts_at +
// length_minutes -- never stored. active / upcoming / past are read-time facts.
export const contestService = {
  stateOf(startsAt: Date, lengthMinutes: number, now: Date): 'upcoming' | 'active' | 'past' {
    const start = startsAt.getTime()
    const end = start + lengthMinutes * 60_000
    const t = now.getTime()
    if (t < start) return 'upcoming'
    if (t <= end) return 'active'
    return 'past'
  },

  async list({ state }: { state: 'active' | 'upcoming' | 'past' }) {
    const now = clock.now()
    const rows = await databaseService
      .db()
      .selectFrom('contest')
      .select(['slug', 'title', 'starts_at', 'length_minutes'])
      .where('visibility', '=', 'public')
      .execute()
    return rows
      .map((r) => ({
        slug: r.slug,
        title: r.title,
        startsAt: r.starts_at.toISOString(),
        lengthMinutes: r.length_minutes,
        state: contestService.stateOf(r.starts_at, r.length_minutes, now),
      }))
      .filter((r) => r.state === state)
      .sort((a, b) =>
        state === 'past'
          ? new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
          : new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
  },

  async getBySlugOrThrow({ slug, viewer }: { slug: string; viewer?: Principal }) {
    const row = await databaseService.db().selectFrom('contest').selectAll().where('slug', '=', slug).executeTakeFirst()
    if (row === undefined || (row.visibility !== 'public' && !isStaff(viewer))) {
      throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'contest', slug } })
    }
    const now = clock.now()
    let registered = false
    if (viewer !== undefined) {
      const reg = await databaseService
        .db()
        .selectFrom('contest_register')
        .select('user_id')
        .where('contest_id', '=', row.id)
        .where('user_id', '=', viewer.userId)
        .executeTakeFirst()
      registered = reg !== undefined
    }
    return {
      slug: row.slug,
      title: row.title,
      startsAt: row.starts_at.toISOString(),
      lengthMinutes: row.length_minutes,
      allowedAttempts: row.allowed_attempts,
      state: contestService.stateOf(row.starts_at, row.length_minutes, now),
      registered,
    }
  },

  async register({ slug, viewer }: { slug: string; viewer: Principal }): Promise<void> {
    const contest = await contestRow(slug)
    if (contestService.stateOf(contest.starts_at, contest.length_minutes, clock.now()) === 'past') {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'contest_finished' } })
    }
    await databaseService
      .db()
      .insertInto('contest_register')
      .values({ contest_id: contest.id, user_id: viewer.userId, registered_at: clock.now() })
      .onConflict((oc) => oc.columns(['contest_id', 'user_id']).doNothing())
      .execute()
  },

  async unregister({ slug, viewer }: { slug: string; viewer: Principal }): Promise<void> {
    const contest = await contestRow(slug)
    if (contestService.stateOf(contest.starts_at, contest.length_minutes, clock.now()) !== 'upcoming') {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'contest_started' } })
    }
    await databaseService
      .db()
      .deleteFrom('contest_register')
      .where('contest_id', '=', contest.id)
      .where('user_id', '=', viewer.userId)
      .execute()
  },

  // Problems are only readable once the contest has started; before that, not
  // even by URL guessing.
  async problems({ slug, viewer }: { slug: string; viewer: Principal }) {
    const contest = await contestRow(slug)
    const state = contestService.stateOf(contest.starts_at, contest.length_minutes, clock.now())
    if (state === 'upcoming') throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'not_started' } })

    const registered = await databaseService
      .db()
      .selectFrom('contest_register')
      .select('user_id')
      .where('contest_id', '=', contest.id)
      .where('user_id', '=', viewer.userId)
      .executeTakeFirst()
    if (registered === undefined && !isStaff(viewer)) {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'not_registered' } })
    }

    const rows = await databaseService
      .db()
      .selectFrom('problem')
      .select(['slug', 'title', 'points', 'order_index'])
      .where('contest_id', '=', contest.id)
      .where('visibility', '!=', 'deleted')
      .orderBy('order_index', 'asc')
      .execute()
    return rows.map((r) => ({ slug: r.slug, title: r.title, points: r.points, orderIndex: r.order_index }))
  },
}

async function contestRow(slug: string) {
  const row = await databaseService.db().selectFrom('contest').selectAll().where('slug', '=', slug).executeTakeFirst()
  if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'contest', slug } })
  return row
}
