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
// A problem worth P points, solved M minutes in after T total tries, scores:
//   floor(max(P - M * (P / 250) - (T - 1) * 20, 0.30 * P))
// A "blind" cell (all allowed attempts used while the contest is still running)
// scores zero.
export const WRONG_ANSWER_PENALTY = 20
export const POINT_DECAY_DIVISOR = 250
export const MIN_POINTS_FRACTION = 0.3

export type Contest = z.infer<typeof ContestSchema>
export type ScoreboardRow = z.infer<typeof ScoreboardRowSchema>
