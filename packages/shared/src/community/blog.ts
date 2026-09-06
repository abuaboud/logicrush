import { z } from 'zod'
import { VisibilitySchema } from '../catalog/problem.js'

export const BlogSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string(),
  authorId: z.string(),
  categoryId: z.string(),
  visibility: VisibilitySchema,
  announcement: z.boolean(),
  upVotes: z.number().int(),
  downVotes: z.number().int(),
  commentCount: z.number().int(),
  createdAt: z.iso.datetime(),
  lastActivityAt: z.iso.datetime(),
})

// Legacy split comments across three tables (comment_blog, comment_problem,
// comment_solution) all pointing at one `comment` row. The new schema keeps one
// comment table with a discriminated target.
export const CommentTargetSchema = z.enum(['blog', 'problem', 'solution'])

export const CommentSchema = z.object({
  id: z.string(),
  target: CommentTargetSchema,
  targetId: z.string(),
  parentId: z.string().nullable(),
  authorId: z.string(),
  content: z.string(),
  visibility: VisibilitySchema,
  upVotes: z.number().int(),
  downVotes: z.number().int(),
  createdAt: z.iso.datetime(),
})

export type Blog = z.infer<typeof BlogSchema>
export type Comment = z.infer<typeof CommentSchema>
