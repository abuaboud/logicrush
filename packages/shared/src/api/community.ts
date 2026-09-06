import { z } from 'zod'

export const ForumCategorySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  blogCount: z.number().int(),
  commentCount: z.number().int(),
})
export const ForumIndexResponse = z.object({
  subjects: z.array(z.object({ title: z.string(), categories: z.array(ForumCategorySchema) })),
})

export const HomeResponse = z.object({
  announcements: z.array(
    z.object({ id: z.string(), title: z.string(), content: z.string(), author: z.string(), createdAt: z.iso.datetime() }),
  ),
  contests: z.array(
    z.object({ slug: z.string(), title: z.string(), startsAt: z.iso.datetime(), lengthMinutes: z.number().int(), state: z.string() }),
  ),
  topRated: z.array(z.object({ rank: z.number().int(), username: z.string(), rating: z.number().int(), bandColor: z.string() })),
  topContributors: z.array(z.object({ rank: z.number().int(), username: z.string(), contributionPoints: z.number().int() })),
})

export const CommentViewSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  content: z.string().nullable(),
  deleted: z.boolean(),
  upVotes: z.number().int(),
  downVotes: z.number().int(),
  author: z.string(),
  authorBandColor: z.string(),
  createdAt: z.iso.datetime(),
})

export type ForumCategory = z.infer<typeof ForumCategorySchema>
export type HomeData = z.infer<typeof HomeResponse>

export const BlogListQuery = z.object({
  category: z.string(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
})
export const CommentListQuery = z.object({ target: z.enum(['blog', 'problem', 'solution']), targetId: z.string() })
export const CreateBlogBody = z.object({ categorySlug: z.string(), title: z.string().min(1).max(200), content: z.string() })
export const UpdateBlogBody = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  announcement: z.boolean().optional(),
})
export const CreateCommentBody = z.object({
  target: z.enum(['blog', 'problem', 'solution']),
  targetId: z.string(),
  parentId: z.string().nullable().optional(),
  content: z.string().min(1).max(5000),
})
export const VoteBody = z.object({ value: z.union([z.literal(1), z.literal(-1)]) })
