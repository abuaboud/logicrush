import { z } from 'zod'

export const ContestStateSchema = z.enum(['upcoming', 'active', 'past'])

export const ContestSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  lengthMinutes: z.number().int(),
  state: ContestStateSchema,
})
export const ContestListResponse = z.object({ items: z.array(ContestSummarySchema) })

export const ContestDetailSchema = ContestSummarySchema.extend({
  allowedAttempts: z.number().int(),
  registered: z.boolean(),
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
  countryCode: z.string().nullable(),
  bandColor: z.string(),
  rank: z.number().int(),
  totalPoints: z.number().int(),
  cells: z.array(ScoreboardCellSchema),
})
export const ScoreboardResponse = z.object({ items: z.array(ScoreboardRowSchema) })

export const SubmissionFeedItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  rating: z.number().int(),
  problemSlug: z.string(),
  problemTitle: z.string(),
  correct: z.boolean(),
  submittedAt: z.iso.datetime(),
})
export const SubmissionFeedResponse = z.object({
  items: z.array(SubmissionFeedItemSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export type ContestSummary = z.infer<typeof ContestSummarySchema>
export type ContestDetail = z.infer<typeof ContestDetailSchema>
export type ScoreboardRow = z.infer<typeof ScoreboardRowSchema>
export type SubmissionFeedItem = z.infer<typeof SubmissionFeedItemSchema>

export const ContestListQuery = z.object({ state: z.enum(['active', 'upcoming', 'past']).default('active') })
