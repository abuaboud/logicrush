import { z } from 'zod'
import { ProblemTypeSchema, VisibilitySchema } from '../catalog/problem.js'
import { paged } from './pagination.js'

// --- Problems ---
export const ProblemListItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  type: ProblemTypeSchema,
  points: z.number().int(),
  solvedCount: z.number().int(),
  tags: z.array(z.string()),
})
export const ProblemListResponse = paged(ProblemListItemSchema)

export const ProblemListQuery = z.object({
  tag: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export const PublicProblemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  type: ProblemTypeSchema,
  description: z.string(),
  points: z.number().int(),
  solvedCount: z.number().int(),
  options: z.array(z.object({ id: z.string(), content: z.string(), orderIndex: z.number().int() })),
})

export const SubmitBody = z.object({ answer: z.string().min(1).max(500) })
export const SubmitResponse = z.object({ correct: z.boolean(), solved: z.boolean() })
export const ProblemStatusResponse = z.object({ attempts: z.number().int(), solved: z.boolean() })
export const SolutionResponse = z.object({ solution: z.string() })

export const TagWithCountSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  problemCount: z.number().int(),
})
export const TagListResponse = z.array(TagWithCountSchema)

export type ProblemListItem = z.infer<typeof ProblemListItemSchema>
export type PublicProblem = z.infer<typeof PublicProblemSchema>
export type TagWithCount = z.infer<typeof TagWithCountSchema>

// --- Admin (problem authoring) ---
export const CreateProblemBody = z.object({
  title: z.string().min(1).max(200),
  type: ProblemTypeSchema.default('choice'),
  description: z.string().default(''),
  solution: z.string().default(''),
  correctOption: z.string().default(''),
  points: z.number().int().min(0).default(500),
  options: z.array(z.string()).default([]),
})
export const UpdateProblemBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  solution: z.string().optional(),
  correctOption: z.string().optional(),
  points: z.number().int().min(0).optional(),
  approved: z.boolean().optional(),
  visibility: VisibilitySchema.optional(),
})
export const AdminProblemRow = z.object({
  slug: z.string(),
  title: z.string(),
  approved: z.boolean(),
  visibility: VisibilitySchema,
  points: z.number().int(),
  solvedCount: z.number().int(),
  authorUsername: z.string(),
})
export const AdminProblemListResponse = paged(AdminProblemRow)
