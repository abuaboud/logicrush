import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { PageQuerySchema, SubmissionFeedResponse } from '@logicrush/shared'
import { submissionService } from './submission-service.js'

export const submissionController: FastifyPluginAsyncZod = async (app) => {
  app.get('/submissions', ListRequest, async (request) =>
    submissionService.latest({ page: request.query.page, pageSize: request.query.pageSize }),
  )
}

const ListRequest = {
  config: { security: 'public' } as const,
  schema: { querystring: PageQuerySchema, response: { 200: SubmissionFeedResponse } },
}
