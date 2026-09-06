import { z } from 'zod'

export const SubmissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  problemId: z.string(),
  answer: z.string(),
  correct: z.boolean(),
  blind: z.boolean(),
  submittedAt: z.iso.datetime(),
})

export const RatingChangeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  contestId: z.string(),
  rank: z.number().int(),
  newRating: z.number().int(),
})

// A contestant with no rating history enters their first rated contest at 1500.
export const DEFAULT_RATING = 1500

export type Submission = z.infer<typeof SubmissionSchema>
export type RatingChange = z.infer<typeof RatingChangeSchema>
