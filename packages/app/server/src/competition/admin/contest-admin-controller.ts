import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AddContestProblemBody, AdminContestListResponse, CreateContestBody } from '@logicrush/shared'
import { requireUser } from '../../identity/auth/security.js'
import { contestAdminService } from './contest-admin-service.js'

export const contestAdminController: FastifyPluginAsyncZod = async (app) => {
  app.get('/admin/contests', ListRequest, async () => contestAdminService.list())
  app.post('/admin/contests', CreateRequest, async (request, reply) => {
    const r = await contestAdminService.create({ viewer: requireUser(request), ...request.body })
    return reply.status(201).send(r)
  })
  app.post('/admin/contests/:slug/problems', AddProblemRequest, async (request) =>
    contestAdminService.addProblem({ slug: request.params.slug, problemSlug: request.body.problemSlug }),
  )
}

const ADMIN = { security: 'admin' } as const
const ListRequest = { config: ADMIN, schema: { response: { 200: AdminContestListResponse } } }
const CreateRequest = { config: ADMIN, schema: { body: CreateContestBody, response: { 201: z.object({ slug: z.string() }) } } }
const AddProblemRequest = { config: ADMIN, schema: { params: z.object({ slug: z.string() }), body: AddContestProblemBody } }
