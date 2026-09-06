import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { TagListResponse } from '@logicrush/shared'
import { tagService } from './tag-service.js'

export const tagController: FastifyPluginAsyncZod = async (app) => {
  app.get('/tags', ListRequest, async () => tagService.list())
}

const ListRequest = { config: { security: 'public' } as const, schema: { response: { 200: TagListResponse } } }
