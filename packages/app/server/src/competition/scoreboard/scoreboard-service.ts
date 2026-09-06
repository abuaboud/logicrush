import { AppError, ErrorCode, contestCellPoints, ratingAlgorithm, type Contestant } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import { contestService } from '../contests/contest-service.js'
import { ratingBandColor } from '../../identity/users/user-service.js'

// The scoreboard is computed from submissions, not stored. The blind rule is
// derived here and includes the active-contest term: a contestant who exhausted
// their attempts is blind ONLY while the contest runs; once it ends, the cell
// scores normally.
export const scoreboardService = {
  async forContest({ slug }: { slug: string }): Promise<PublicScoreboardRow[]> {
    const db = databaseService.db()
    const contest = await db.selectFrom('contest').selectAll().where('slug', '=', slug).executeTakeFirst()
    if (contest === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { slug } })

    const start = contest.starts_at.getTime()
    const end = start + contest.length_minutes * 60_000
    const active = contestService.stateOf(contest.starts_at, contest.length_minutes, clock.now()) === 'active'

    const problems = await db
      .selectFrom('problem')
      .select(['id', 'points', 'correct_option', 'order_index'])
      .where('contest_id', '=', contest.id)
      .where('visibility', '!=', 'deleted')
      .orderBy('order_index', 'asc')
      .execute()

    const registrants = await db
      .selectFrom('contest_register')
      .innerJoin('user', 'user.id', 'contest_register.user_id')
      .select(['user.id as id', 'user.username as username', 'user.rating as rating', 'user.country_code as country'])
      .where('contest_register.contest_id', '=', contest.id)
      .execute()

    const userIds = registrants.map((r) => r.id)
    const submissions =
      userIds.length === 0
        ? []
        : await db
            .selectFrom('submission')
            .select(['user_id', 'problem_id', 'answer', 'submitted_at'])
            .where('problem_id', 'in', problems.map((p) => p.id))
            .where('user_id', 'in', userIds)
            .where('submitted_at', '>=', new Date(start))
            .where('submitted_at', '<=', new Date(end))
            .orderBy('submitted_at', 'asc')
            .execute()

    // One pass over submissions builds every (user, problem) cell -- no N+1.
    const byCell = new Map<string, { tries: number; solvedAt: number | null; lastAt: number }>()
    for (const s of submissions) {
      const key = `${s.user_id}:${s.problem_id}`
      const cell = byCell.get(key) ?? { tries: 0, solvedAt: null, lastAt: 0 }
      cell.tries += 1
      cell.lastAt = s.submitted_at.getTime()
      const problem = problems.find((p) => p.id === s.problem_id)!
      if (cell.solvedAt === null && s.answer.trim().toLowerCase() === problem.correct_option.trim().toLowerCase()) {
        cell.solvedAt = s.submitted_at.getTime()
      }
      byCell.set(key, cell)
    }

    const rows: ScoreboardRow[] = registrants.map((user) => {
      let totalPoints = 0
      let lastSolveAt = 0
      const cells = problems.map((problem) => {
        const cell = byCell.get(`${user.id}:${problem.id}`) ?? { tries: 0, solvedAt: null, lastAt: 0 }
        const blind = active && cell.tries >= contest.allowed_attempts && cell.solvedAt === null
        const elapsedMinutes = cell.solvedAt === null ? 0 : Math.floor((cell.solvedAt - start) / 60_000)
        const points =
          cell.solvedAt === null
            ? 0
            : contestCellPoints({ points: problem.points, elapsedMinutes, tries: cell.tries, blind })
        totalPoints += points
        if (cell.solvedAt !== null) lastSolveAt = Math.max(lastSolveAt, cell.solvedAt)
        return {
          tries: cell.tries,
          blind,
          points,
          solvedAtMinute: cell.solvedAt === null ? null : elapsedMinutes,
        }
      })
      return {
        username: user.username,
        rating: user.rating,
        countryCode: user.country,
        bandColor: ratingBandColor(user.rating),
        rank: 0,
        totalPoints,
        lastSolveAt,
        cells,
      }
    })

    // Rank by points desc, ties broken by earlier last-solve (the faster
    // finisher at equal points ranks higher) -- matching the legacy ordering.
    rows.sort((a, b) => b.totalPoints - a.totalPoints || a.lastSolveAt - b.lastSolveAt)
    rows.forEach((r, i) => (r.rank = i + 1))
    return rows.map(({ lastSolveAt: _drop, ...r }) => r)
  },

  // Turn a finished contest's standings into rating_change rows. Idempotent:
  // rerunning replaces the prior rows and the derived user.rating in one
  // transaction.
  async applyRatings({ slug }: { slug: string }): Promise<number> {
    const db = databaseService.db()
    const contest = await db.selectFrom('contest').selectAll().where('slug', '=', slug).executeTakeFirst()
    if (contest === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { slug } })
    if (contestService.stateOf(contest.starts_at, contest.length_minutes, clock.now()) !== 'past') {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'contest_not_finished' } })
    }

    const board = await scoreboardService.forContest({ slug })
    const withIds = await db
      .selectFrom('contest_register')
      .innerJoin('user', 'user.id', 'contest_register.user_id')
      .select(['user.id as id', 'user.username as username', 'user.rating as rating'])
      .where('contest_register.contest_id', '=', contest.id)
      .execute()
    const idByName = new Map(withIds.map((u) => [u.username, u]))

    // Entry rating: a user with prior rating_change history keeps their stored
    // rating; a first-timer enters at 1500.
    const contestants: Contestant[] = []
    for (const row of board) {
      const u = idByName.get(row.username)!
      const hist = await db
        .selectFrom('rating_change')
        .select('id')
        .where('user_id', '=', u.id)
        .where('contest_id', '<>', contest.id)
        .executeTakeFirst()
      contestants.push({
        userId: u.id,
        points: row.totalPoints,
        rating: ratingAlgorithm.entryRating({ hasHistory: hist !== undefined, storedRating: u.rating }),
      })
    }

    const results = ratingAlgorithm.compute({ contestants })

    await db.transaction().execute(async (tx) => {
      await tx.deleteFrom('rating_change').where('contest_id', '=', contest.id).execute()
      for (const r of results) {
        await tx
          .insertInto('rating_change')
          .values({
            id: ids.new(),
            legacy_id: null,
            user_id: r.userId,
            contest_id: contest.id,
            rank: r.rank,
            new_rating: r.newRating,
          })
          .execute()
        await tx.updateTable('user').set({ rating: r.newRating }).where('id', '=', r.userId).execute()
      }
    })
    return results.length
  },
}

export interface ScoreboardCell {
  tries: number
  blind: boolean
  points: number
  solvedAtMinute: number | null
}

interface ScoreboardRow {
  username: string
  rating: number
  countryCode: string | null
  bandColor: string
  rank: number
  totalPoints: number
  lastSolveAt: number
  cells: ScoreboardCell[]
}

export type PublicScoreboardRow = Omit<ScoreboardRow, 'lastSolveAt'>
