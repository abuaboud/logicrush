import { AppError, ErrorCode, type Visibility } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import type { Principal } from '../../identity/auth/security.js'

// Admin/setter authoring. Approval and visibility are PATCHed fields, not verb
// endpoints (ADR 0001). A setter may only touch problems they author or write; an
// admin may touch any. Editing a problem inside a running contest is refused.
export const problemAdminService = {
  async list({ page, pageSize }: { page: number; pageSize: number }) {
    const db = databaseService.db()
    const rows = await db
      .selectFrom('problem')
      .innerJoin('user', 'user.id', 'problem.author_id')
      .select(['problem.slug as slug', 'problem.title as title', 'problem.approved as approved',
        'problem.visibility as visibility', 'problem.points as points', 'problem.solved_count as solvedCount',
        'user.username as authorUsername'])
      .where('problem.visibility', '!=', 'deleted')
      .orderBy('problem.created_at', 'desc')
      .limit(pageSize).offset((page - 1) * pageSize).execute()
    const total = await db.selectFrom('problem').select((eb) => eb.fn.countAll().as('n'))
      .where('visibility', '!=', 'deleted').executeTakeFirstOrThrow()
    return { items: rows, page, pageSize, total: Number(total.n) }
  },

  async create({ viewer, title, type, description, solution, correctOption, points, options }: {
    viewer: Principal; title: string; type: 'choice' | 'fill_in_blank'
    description: string; solution: string; correctOption: string; points: number; options: string[]
  }) {
    const db = databaseService.db()
    const id = ids.new()
    const slug = ids.slugify(title)
    await db.insertInto('problem').values({
      id, legacy_id: null, slug, title, type, author_id: viewer.userId, writer_id: viewer.userId,
      description, solution, correct_option: correctOption, visibility: 'unlisted', approved: false,
      points, solved_count: 0, number_of_attempts: 4, contest_id: null, order_index: 0,
      created_at: clock.now(), updated_at: clock.now(),
    }).execute()
    for (const [i, content] of options.entries()) {
      await db.insertInto('problem_option').values({
        id: ids.new(), legacy_id: null, problem_id: id, content, visibility: 'public', order_index: i,
      }).execute()
    }
    return { slug }
  },

  async update({ viewer, slug, patch }: {
    viewer: Principal; slug: string
    patch: { title?: string; description?: string; solution?: string; correctOption?: string; points?: number; approved?: boolean; visibility?: Visibility }
  }) {
    const db = databaseService.db()
    const row = await db.selectFrom('problem').select(['id', 'author_id', 'writer_id', 'contest_id']).where('slug', '=', slug).executeTakeFirst()
    if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { slug } })
    const owns = row.author_id === viewer.userId || row.writer_id === viewer.userId
    if (viewer.role !== 'admin' && !owns) throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'not_owner' } })
    // Only an admin may approve.
    if (patch.approved !== undefined && viewer.role !== 'admin') {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'approve_admin_only' } })
    }
    if (row.contest_id !== null) {
      const contest = await db.selectFrom('contest').select(['starts_at', 'length_minutes']).where('id', '=', row.contest_id).executeTakeFirst()
      if (contest !== undefined) {
        const now = clock.now().getTime(), start = contest.starts_at.getTime()
        if (now >= start && now <= start + contest.length_minutes * 60_000) {
          throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'contest_running' } })
        }
      }
    }
    const set: Record<string, unknown> = { updated_at: clock.now() }
    if (patch.title !== undefined) set.title = patch.title
    if (patch.description !== undefined) set.description = patch.description
    if (patch.solution !== undefined) set.solution = patch.solution
    if (patch.correctOption !== undefined) set.correct_option = patch.correctOption
    if (patch.points !== undefined) set.points = patch.points
    if (patch.approved !== undefined) set.approved = patch.approved
    if (patch.visibility !== undefined) set.visibility = patch.visibility
    await db.updateTable('problem').set(set).where('id', '=', row.id).execute()
    return { ok: true }
  },
}
