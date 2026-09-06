import { z } from 'zod'

// Legacy `visibility` int: 0=public, 1=unlisted, 2=deleted. Shared by problem,
// contest, blog, comment and problem_option.
export const VisibilitySchema = z.enum(['public', 'unlisted', 'deleted'])

// Legacy `type` int: 2=CIRCLE (pick one option), 3=FILL_IN_BLANK (type answer).
export const ProblemTypeSchema = z.enum(['choice', 'fill_in_blank'])

export const ProblemOptionSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  content: z.string(),
  visibility: VisibilitySchema,
  orderIndex: z.number().int(),
})

export const ProblemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(200),
  type: ProblemTypeSchema,
  authorId: z.string(),
  writerId: z.string(),
  description: z.string(),
  solution: z.string(),
  correctOption: z.string(),
  visibility: VisibilitySchema,
  approved: z.boolean(),
  points: z.number().int(),
  solvedCount: z.number().int(),
  contestId: z.string().nullable(),
  orderIndex: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
})

// Practice attempts on a fill-in-blank problem are capped; the legacy constant
// was MAX_NUMBER_OF_TRIES_PRACTICE_FILL_BLANK = 30.
export const MAX_PRACTICE_TRIES_FILL_IN_BLANK = 30

export type Problem = z.infer<typeof ProblemSchema>
export type ProblemOption = z.infer<typeof ProblemOptionSchema>
export type Visibility = z.infer<typeof VisibilitySchema>
