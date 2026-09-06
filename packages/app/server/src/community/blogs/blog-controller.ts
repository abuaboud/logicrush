import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireUser } from '../../identity/auth/security.js'
import { blogService } from './blog-service.js'
import { commentService } from '../comments/comment-service.js'
import { voteService } from '../votes/vote-service.js'
import { homeService } from './home-service.js'
import {
  BlogListQuery,
  CommentListQuery,
  CreateBlogBody,
  CreateCommentBody,
  UpdateBlogBody,
  VoteBody,
} from '@logicrush/shared'

export const communityController: FastifyPluginAsyncZod = async (app) => {
  app.get('/blog-categories', PublicNoBody, async () => ({ subjects: await blogService.forumIndex() }))
  app.get('/home', PublicNoBody, async () => homeService.get())

  app.get('/blogs', ListBlogs, async (request) =>
    blogService.listByCategory({ categorySlug: request.query.category, page: request.query.page, pageSize: request.query.pageSize }),
  )
  app.get('/blogs/:id', ById, async (request) => blogService.get({ id: request.params.id }))
  app.post('/blogs', CreateBlog, async (request, reply) => {
    const created = await blogService.create({ ...request.body, viewer: requireUser(request) })
    return reply.status(201).send(created)
  })
  app.patch('/blogs/:id', UpdateBlog, async (request) =>
    blogService.update({ id: request.params.id, ...request.body, viewer: requireUser(request) }),
  )
  app.delete('/blogs/:id', ById, async (request) => blogService.remove({ id: request.params.id, viewer: requireUser(request) }))

  app.get('/comments', ListComments, async (request) => ({
    items: await commentService.list({ target: request.query.target, targetId: request.query.targetId }),
  }))
  app.post('/comments', CreateComment, async (request, reply) => {
    const created = await commentService.create({ ...request.body, parentId: request.body.parentId ?? null, viewer: requireUser(request) })
    return reply.status(201).send(created)
  })
  app.delete('/comments/:id', ById, async (request) => commentService.remove({ id: request.params.id, viewer: requireUser(request) }))

  app.put('/blogs/:id/vote', VoteReq, async (request) =>
    voteService.cast({ target: 'blog', targetId: request.params.id, value: request.body.value, viewer: requireUser(request) }),
  )
  app.delete('/blogs/:id/vote', ById, async (request) =>
    voteService.remove({ target: 'blog', targetId: request.params.id, viewer: requireUser(request) }),
  )
  app.put('/comments/:id/vote', VoteReq, async (request) =>
    voteService.cast({ target: 'comment', targetId: request.params.id, value: request.body.value, viewer: requireUser(request) }),
  )
  app.delete('/comments/:id/vote', ById, async (request) =>
    voteService.remove({ target: 'comment', targetId: request.params.id, viewer: requireUser(request) }),
  )
}

const PUBLIC = { security: 'public' } as const
const AUTH = { security: 'authenticated' } as const
const PublicNoBody = { config: PUBLIC, schema: {} }
const ById = { config: AUTH, schema: { params: z.object({ id: z.string() }) } }
const ListBlogs = {
  config: PUBLIC,
  schema: { querystring: BlogListQuery },
}
const ListComments = {
  config: PUBLIC,
  schema: { querystring: CommentListQuery },
}
const CreateBlog = {
  config: AUTH,
  schema: { body: CreateBlogBody },
}
const UpdateBlog = {
  config: AUTH,
  schema: {
    params: z.object({ id: z.string() }),
    body: UpdateBlogBody,
  },
}
const CreateComment = {
  config: AUTH,
  schema: {
    body: CreateCommentBody,
  },
}
const VoteReq = {
  config: AUTH,
  schema: { params: z.object({ id: z.string() }), body: VoteBody },
}
