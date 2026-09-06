import { sql } from 'kysely'
import { AppError, ErrorCode, MAX_PRACTICE_TRIES_FILL_IN_BLANK } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import type { Principal } from '../../identity/auth/security.js'

// Submissions are append-only and are the sole record of "solved". Judging is
// case-insensitive with surrounding whitespace trimmed off the submitted answer
// (legacy compared with equalsIgnoreCase; trimming is an additive guard against a
// trailing space, documented as a deliberate divergence in CODING notes).
export const submissionService = {
  async submit({
    slug,
    answer,
    viewer,
  }: {
    slug: string
    answer: string
    viewer: Principal
  }): Promise<{ correct: boolean; solved: boolean }> {
    const db = databaseService.db()
    const problem = await db.selectFrom('problem').selectAll().where('slug', '=', slug).executeTakeFirst()
    if (problem === undefined || problem.visibility === 'deleted') {
      throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'problem', slug } })
    }

    const prior = await db
      .selectFrom('submission')
      .select(['answer', 'correct'])
      .where('user_id', '=', viewer.userId)
      .where('problem_id', '=', problem.id)
      .execute()

    if (prior.some((p) => p.correct)) {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'already_solved' } })
    }

    // A repeat of an answer already tried is a no-op: no row, no consumed attempt.
    const normalized = answer.trim().toLowerCase()
    if (prior.some((p) => p.answer.trim().toLowerCase() === normalized)) {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'duplicate_answer' } })
    }

    if (problem.type === 'fill_in_blank' && prior.length >= MAX_PRACTICE_TRIES_FILL_IN_BLANK) {
      throw new AppError({ code: ErrorCode.RATE_LIMITED, params: { reason: 'attempts_exhausted' } })
    }

    const correct = problem.correct_option.trim().toLowerCase() === normalized

    await db
      .insertInto('submission')
      .values({
        id: ids.new(),
        legacy_id: null,
        user_id: viewer.userId,
        problem_id: problem.id,
        answer,
        correct,
        blind: false,
        submitted_at: clock.now(),
      })
      .execute()

    if (correct) {
      await db
        .updateTable('problem')
        .set((eb) => ({ solved_count: eb('solved_count', '+', 1) }))
        .where('id', '=', problem.id)
        .execute()
    }

    return { correct, solved: correct }
  },

  async statusFor({ slug, viewer }: { slug: string; viewer: Principal }): Promise<{ attempts: number; solved: boolean }> {
    const db = databaseService.db()
    const problem = await db.selectFrom('problem').select('id').where('slug', '=', slug).executeTakeFirst()
    if (problem === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { slug } })
    const rows = await db
      .selectFrom('submission')
      .select(['correct'])
      .where('user_id', '=', viewer.userId)
      .where('problem_id', '=', problem.id)
      .execute()
    return { attempts: rows.length, solved: rows.some((r) => r.correct) }
  },

  // Site-wide latest feed. In-contest submissions stay hidden until the contest
  // ends; the answer text is never exposed.
  async latest({ page, pageSize }: { page: number; pageSize: number }) {
    const db = databaseService.db()
    const now = clock.now()
    const rows = await db
      .selectFrom('submission')
      .innerJoin('user', 'user.id', 'submission.user_id')
      .innerJoin('problem', 'problem.id', 'submission.problem_id')
      .leftJoin('contest', 'contest.id', 'problem.contest_id')
      .select([
        'submission.id as id',
        'user.username as username',
        'user.rating as rating',
        'problem.slug as problemSlug',
        'problem.title as problemTitle',
        'submission.correct as correct',
        'submission.submitted_at as submittedAt',
      ])
      .where((eb) =>
        eb.or([
          eb('problem.contest_id', 'is', null),
          eb(sql<Date>`contest.starts_at + (contest.length_minutes * interval '1 minute')`, '<=', now),
        ]),
      )
      .orderBy('submission.submitted_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute()
    return {
      items: rows.map((r) => ({
        id: r.id,
        username: r.username,
        rating: r.rating,
        problemSlug: r.problemSlug,
        problemTitle: r.problemTitle,
        correct: r.correct,
        submittedAt: r.submittedAt.toISOString(),
      })),
      page,
      pageSize,
    }
  },
}
