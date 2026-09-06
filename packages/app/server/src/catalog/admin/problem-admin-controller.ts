import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AdminProblemListResponse, CreateProblemBody, PageQuerySchema, UpdateProblemBody } from '@logicrush/shared'
import { requireUser } from '../../identity/auth/security.js'
import { problemAdminService } from './problem-admin-service.js'

// Setter/admin authoring surface. No /api/admin/* mirror (ADR 0001): these are
// the resource routes, gated by role via config.security.
export const problemAdminController: FastifyPluginAsyncZod = async (app) => {
  app.get('/admin/problems', ListRequest, async (request) =>
    problemAdminService.list({ page: request.query.page, pageSize: request.query.pageSize }),
  )
  app.post('/admin/problems', CreateRequest, async (request, reply) => {
    const r = await problemAdminService.create({ viewer: requireUser(request), ...request.body })
    return reply.status(201).send(r)
  })
  app.patch('/admin/problems/:slug', UpdateRequest, async (request) =>
    problemAdminService.update({ viewer: requireUser(request), slug: request.params.slug, patch: request.body }),
  )
}

const SETTER = { security: 'setter' } as const
const ListRequest = { config: SETTER, schema: { querystring: PageQuerySchema, response: { 200: AdminProblemListResponse } } }
const CreateRequest = { config: SETTER, schema: { body: CreateProblemBody, response: { 201: z.object({ slug: z.string() }) } } }
const UpdateRequest = { config: SETTER, schema: { params: z.object({ slug: z.string() }), body: UpdateProblemBody } }
