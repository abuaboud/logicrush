import { z } from 'zod'
import { VisibilitySchema } from '../catalog/problem.js'

export const ContestSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(200),
  authorId: z.string(),
  startsAt: z.iso.datetime(),
  lengthMinutes: z.number().int().positive(),
  visibility: VisibilitySchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const ScoreboardCellSchema = z.object({
  tries: z.number().int(),
  blind: z.boolean(),
  points: z.number().int(),
  solvedAtMinute: z.number().int().nullable(),
})

export const ScoreboardRowSchema = z.object({
  username: z.string(),
  rating: z.number().int(),
  countryCode: z.string().length(2).nullable(),
  rank: z.number().int(),
  totalPoints: z.number().int(),
  cells: z.array(ScoreboardCellSchema),
})

// Contest scoring, ported verbatim from the legacy ScoreboardService.
//
// READ THIS BEFORE CHANGING ANYTHING: `P / 250` is INTEGER division in the Java
// original — `getPoints()` returns int and DEDUCE_POINT_PER is `static final int`.
// So the decay is a whole number of points per minute, and a problem worth less
// than 250 points does not decay AT ALL (100 / 250 == 0).
//
//   decayPerMinute = P div 250              <- integer division, floors to 0
//   raw            = P - M * decayPerMinute
//   points         = max(raw - (T - 1) * 20, floor(0.30 * P))
//
// The floor applies to the 0.30 * P floor term on its own, not to the whole
// expression — everything else is already integer arithmetic.
//
// Nobody noticed this for nine years because every point value in use is a
// multiple of 250 (250/500/750/1000/1250), where integer and real division agree.
// Writing it as real division silently rescores every problem that is not.
//
// A "blind" cell scores zero, but ONLY while the contest is still running — see
// BLIND_REQUIRES_ACTIVE_CONTEST below.
export const WRONG_ANSWER_PENALTY = 20
export const POINT_DECAY_DIVISOR = 250
export const MIN_POINTS_FRACTION = 0.3

// The legacy blind check is `tries == 1 + allowedAttempts && contest.isActive()`.
// The clock term is load-bearing: once a contest ends, cells stop being blind and
// score normally, so final standings differ from the standings shown mid-contest.
// Dropping it makes every past contest replay with lower totals than recorded.
export const BLIND_REQUIRES_ACTIVE_CONTEST = true

export function contestCellPoints({
  points,
  elapsedMinutes,
  tries,
  blind,
}: {
  points: number
  elapsedMinutes: number
  tries: number
  blind: boolean
}): number {
  if (blind) return 0
  const decayPerMinute = Math.trunc(points / POINT_DECAY_DIVISOR)
  const raw = points - elapsedMinutes * decayPerMinute
  return Math.max(raw - (tries - 1) * WRONG_ANSWER_PENALTY, Math.floor(MIN_POINTS_FRACTION * points))
}

export type Contest = z.infer<typeof ContestSchema>
export type ScoreboardRow = z.infer<typeof ScoreboardRowSchema>
