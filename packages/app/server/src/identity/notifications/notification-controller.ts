import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { NotificationListResponse, OkResponse, PageQuerySchema, UnreadCountResponse } from '@logicrush/shared'
import { requireUser } from '../auth/security.js'
import { notificationService } from './notification-service.js'

export const notificationController: FastifyPluginAsyncZod = async (app) => {
  app.get('/notifications', ListRequest, async (request) =>
    notificationService.list({ viewer: requireUser(request), page: request.query.page, pageSize: request.query.pageSize }),
  )
  app.get('/notifications/unread-count', CountRequest, async (request) => ({
    count: await notificationService.unreadCount({ viewer: requireUser(request) }),
  }))
  app.post('/notifications/:id/read', ReadRequest, async (request) => {
    await notificationService.markRead({ viewer: requireUser(request), id: request.params.id })
    return { ok: true }
  })
  app.post('/notifications/read-all', ReadAllRequest, async (request) => {
    await notificationService.markAllRead({ viewer: requireUser(request) })
    return { ok: true }
  })
}

const AUTH = { security: 'authenticated' } as const
const ListRequest = { config: AUTH, schema: { querystring: PageQuerySchema, response: { 200: NotificationListResponse } } }
const CountRequest = { config: AUTH, schema: { response: { 200: UnreadCountResponse } } }
const ReadRequest = { config: AUTH, schema: { params: z.object({ id: z.string() }), response: { 200: OkResponse } } }
const ReadAllRequest = { config: AUTH, schema: { response: { 200: OkResponse } } }
