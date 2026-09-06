import { AppError, ErrorCode } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import { contestService } from '../contests/contest-service.js'
import type { Principal } from '../../identity/auth/security.js'

export const contestAdminService = {
  async list() {
    const db = databaseService.db()
    const rows = await db
      .selectFrom('contest')
      .leftJoin('problem', (j) => j.onRef('problem.contest_id', '=', 'contest.id').on('problem.visibility', '!=', 'deleted'))
      .select((eb) => ['contest.slug as slug', 'contest.title as title', 'contest.starts_at as startsAt',
        'contest.length_minutes as lengthMinutes', eb.fn.count('problem.id').as('problemCount')])
      .where('contest.visibility', '!=', 'deleted')
      .groupBy(['contest.id']).orderBy('contest.starts_at', 'desc').execute()
    const now = clock.now()
    return {
      items: rows.map((r) => ({
        slug: r.slug, title: r.title, startsAt: r.startsAt.toISOString(), lengthMinutes: r.lengthMinutes,
        problemCount: Number(r.problemCount), state: contestService.stateOf(r.startsAt, r.lengthMinutes, now),
      })),
    }
  },

  async create({ viewer, slug, title, startsAt, lengthMinutes, allowedAttempts }: {
    viewer: Principal; slug: string; title: string; startsAt: string; lengthMinutes: number; allowedAttempts: number
  }) {
    const db = databaseService.db()
    const clash = await db.selectFrom('contest').select('id').where('slug', '=', slug).executeTakeFirst()
    if (clash !== undefined) throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'slug_taken' } })
    await db.insertInto('contest').values({
      id: ids.new(), legacy_id: null, slug, title, author_id: viewer.userId, starts_at: new Date(startsAt),
      length_minutes: lengthMinutes, allowed_attempts: allowedAttempts, visibility: 'public',
      created_at: clock.now(), updated_at: clock.now(),
    }).execute()
    return { slug }
  },

  async addProblem({ slug, problemSlug }: { slug: string; problemSlug: string }) {
    const db = databaseService.db()
    const contest = await db.selectFrom('contest').select(['id', 'starts_at', 'length_minutes']).where('slug', '=', slug).executeTakeFirst()
    if (contest === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { slug } })
    if (contestService.stateOf(contest.starts_at, contest.length_minutes, clock.now()) !== 'upcoming') {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'contest_started' } })
    }
    const problem = await db.selectFrom('problem').select('id').where('slug', '=', problemSlug).executeTakeFirst()
    if (problem === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { problemSlug } })
    const count = await db.selectFrom('problem').select((eb) => eb.fn.countAll().as('n')).where('contest_id', '=', contest.id).executeTakeFirstOrThrow()
    await db.updateTable('problem').set({ contest_id: contest.id, order_index: Number(count.n) }).where('id', '=', problem.id).execute()
    return { ok: true }
  },
}
