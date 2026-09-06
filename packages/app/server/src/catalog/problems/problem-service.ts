import { AppError, ErrorCode, type Problem, type ProblemOption } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import type { Principal } from '../../identity/auth/security.js'
import { isStaff } from '../../identity/auth/security.js'

// A problem's solution and correct option never appear on list payloads or on a
// read by someone who has not earned them. That rule lives here so no controller
// can forget it.
export const problemService = {
  async list({
    tag,
    query,
    page,
    pageSize,
    viewer,
  }: {
    tag?: string
    query?: string
    page: number
    pageSize: number
    viewer?: Principal
  }): Promise<{ items: ProblemListItem[]; page: number; pageSize: number; total: number }> {
    const db = databaseService.db()
    let q = db
      .selectFrom('problem')
      .select(['problem.id', 'slug', 'title', 'type', 'points', 'solved_count', 'visibility', 'approved'])

    // Legacy never filtered on `approved` for public reads, and the dump holds
    // public-but-unapproved problems that are live today. So public listing is
    // visibility-only; approval gates the admin dashboard, not the problemset.
    if (!isStaff(viewer)) q = q.where('visibility', '=', 'public')
    else q = q.where('visibility', '!=', 'deleted')
    // Legacy's practice list is visibility-only (GetPublicProblems filters on
    // visibility alone): a problem used in a past contest still appears here.
    // The active-contest leak is prevented on the detail endpoint, not by hiding
    // the problem from every list forever.

    if (query !== undefined && query.length > 0) {
      q = q.where('title', 'ilike', `%${query}%`)
    }
    if (tag !== undefined && tag.length > 0) {
      // Legacy makes tag and search mutually exclusive; tag wins. Kept.
      const tagRow = await db.selectFrom('tag').select('id').where('name', '=', tag).executeTakeFirst()
      if (tagRow === undefined) return { items: [], page, pageSize, total: 0 }
      q = q.where('problem.id', 'in', (eb) =>
        eb.selectFrom('problem_tag').select('problem_id').where('tag_id', '=', tagRow.id),
      )
    }

    const rows = await q.orderBy('solved_count', 'desc').limit(pageSize).offset((page - 1) * pageSize).execute()
    const total = await q
      .clearSelect()
      .clearOrderBy()
      .select((eb) => eb.fn.countAll().as('n'))
      .executeTakeFirstOrThrow()

    const tagsByProblem = await tagsFor(rows.map((r) => r.id))
    return {
      items: rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        type: r.type,
        points: r.points,
        solvedCount: r.solved_count,
        tags: tagsByProblem.get(r.id) ?? [],
      })),
      page,
      pageSize,
      total: Number(total.n),
    }
  },

  async getBySlugOrThrow({ slug, viewer }: { slug: string; viewer?: Principal }): Promise<PublicProblem> {
    const row = await databaseService.db().selectFrom('problem').selectAll().where('slug', '=', slug).executeTakeFirst()
    if (row === undefined || (row.visibility !== 'public' && !isStaff(viewer))) {
      throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'problem', slug } })
    }
    // Legacy serves a contest's problem statement through the normal read; the
    // one thing we add is that while its contest is CURRENTLY running, only staff
    // and registered contestants may read it (so it can't be scraped mid-contest
    // by guessing the slug). Past and contest-less problems read normally.
    if (row.contest_id !== null && !isStaff(viewer)) {
      const contest = await databaseService
        .db()
        .selectFrom('contest')
        .select(['starts_at', 'length_minutes'])
        .where('id', '=', row.contest_id)
        .executeTakeFirst()
      if (contest !== undefined) {
        const start = contest.starts_at.getTime()
        const end = start + contest.length_minutes * 60_000
        const now = clock.now().getTime()
        const active = now >= start && now <= end
        if (active) {
          const registered =
            viewer !== undefined &&
            (await databaseService
              .db()
              .selectFrom('contest_register')
              .select('user_id')
              .where('contest_id', '=', row.contest_id)
              .where('user_id', '=', viewer.userId)
              .executeTakeFirst()) !== undefined
          if (!registered) {
            throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'problem', slug } })
          }
        }
      }
    }

    const options =
      row.type === 'choice'
        ? await databaseService
            .db()
            .selectFrom('problem_option')
            .select(['id', 'content', 'order_index'])
            .where('problem_id', '=', row.id)
            .where('visibility', '=', 'public')
            .orderBy('order_index', 'asc')
            .execute()
        : []

    // Never ships solution or correctOption on a read.
    return {
      slug: row.slug,
      title: row.title,
      type: row.type,
      description: row.description,
      points: row.points,
      solvedCount: row.solved_count,
      options: options.map((o) => ({ id: o.id, content: o.content, orderIndex: o.order_index })),
    }
  },

  async getSolution({ slug, viewer }: { slug: string; viewer: Principal }): Promise<{ solution: string }> {
    const db = databaseService.db()
    const row = await db.selectFrom('problem').selectAll().where('slug', '=', slug).executeTakeFirst()
    if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { slug } })

    const privileged = isStaff(viewer) || row.author_id === viewer.userId || row.writer_id === viewer.userId
    if (!privileged) {
      const solved = await db
        .selectFrom('submission')
        .select('id')
        .where('user_id', '=', viewer.userId)
        .where('problem_id', '=', row.id)
        .where('correct', '=', true)
        .executeTakeFirst()
      const unlocked = await db
        .selectFrom('problem_tutorial_access')
        .select('user_id')
        .where('user_id', '=', viewer.userId)
        .where('problem_id', '=', row.id)
        .executeTakeFirst()
      if (solved === undefined && unlocked === undefined) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'solution_locked' } })
      }
    }
    return { solution: row.solution }
  },

  async unlockTutorial({ slug, viewer }: { slug: string; viewer: Principal }): Promise<void> {
    const problem = await problemIdBySlug(slug)
    await databaseService
      .db()
      .insertInto('problem_tutorial_access')
      .values({ user_id: viewer.userId, problem_id: problem, unlocked_at: clock.now() })
      .onConflict((oc) => oc.columns(['user_id', 'problem_id']).doNothing())
      .execute()
  },
}

async function problemIdBySlug(slug: string): Promise<string> {
  const row = await databaseService.db().selectFrom('problem').select('id').where('slug', '=', slug).executeTakeFirst()
  if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'problem', slug } })
  return row.id
}

async function tagsFor(problemIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (problemIds.length === 0) return result
  const rows = await databaseService
    .db()
    .selectFrom('problem_tag')
    .innerJoin('tag', 'tag.id', 'problem_tag.tag_id')
    .select(['problem_tag.problem_id as pid', 'tag.name as name'])
    .where('problem_tag.problem_id', 'in', problemIds)
    .execute()
  for (const r of rows) {
    const list = result.get(r.pid) ?? []
    list.push(r.name)
    result.set(r.pid, list)
  }
  return result
}

export interface ProblemListItem {
  slug: string
  title: string
  type: Problem['type']
  points: number
  solvedCount: number
  tags: string[]
}

export interface PublicProblem {
  slug: string
  title: string
  type: Problem['type']
  description: string
  points: number
  solvedCount: number
  options: Pick<ProblemOption, 'id' | 'content'> & { orderIndex: number } extends never ? never : { id: string; content: string; orderIndex: number }[]
}
