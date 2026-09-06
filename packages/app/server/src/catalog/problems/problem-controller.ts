import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  ProblemListQuery,
  ProblemListResponse,
  PublicProblemSchema,
  ProblemStatusResponse,
  SolutionResponse,
  SubmitBody,
  SubmitResponse,
} from '@logicrush/shared'
import { optionalUser, requireUser } from '../../identity/auth/security.js'
import { problemService } from './problem-service.js'
import { submissionService } from '../../competition/submissions/submission-service.js'

// Route wiring only. Every request/response schema is imported from
// @logicrush/shared so the web validates against the identical contract.
export const problemController: FastifyPluginAsyncZod = async (app) => {
  app.get('/problems', ListRequest, async (request) =>
    problemService.list({
      tag: request.query.tag,
      query: request.query.q,
      page: request.query.page,
      pageSize: request.query.pageSize,
      viewer: optionalUser(request),
    }),
  )

  app.get('/problems/:slug', GetRequest, async (request) =>
    problemService.getBySlugOrThrow({ slug: request.params.slug, viewer: optionalUser(request) }),
  )

  app.get('/problems/:slug/solution', SolutionRequest, async (request) =>
    problemService.getSolution({ slug: request.params.slug, viewer: requireUser(request) }),
  )

  app.post('/problems/:slug/tutorial-access', UnlockRequest, async (request) => {
    await problemService.unlockTutorial({ slug: request.params.slug, viewer: requireUser(request) })
    return { ok: true }
  })

  app.post('/problems/:slug/submissions', SubmitRequest, async (request) =>
    submissionService.submit({ slug: request.params.slug, answer: request.body.answer, viewer: requireUser(request) }),
  )

  app.get('/problems/:slug/status', StatusRequest, async (request) =>
    submissionService.statusFor({ slug: request.params.slug, viewer: requireUser(request) }),
  )
}

const PUBLIC = { security: 'public' } as const
const AUTH = { security: 'authenticated' } as const
const SlugParams = z.object({ slug: z.string() })

const ListRequest = { config: PUBLIC, schema: { querystring: ProblemListQuery, response: { 200: ProblemListResponse } } }
const GetRequest = { config: PUBLIC, schema: { params: SlugParams, response: { 200: PublicProblemSchema } } }
const SolutionRequest = { config: AUTH, schema: { params: SlugParams, response: { 200: SolutionResponse } } }
const UnlockRequest = { config: AUTH, schema: { params: SlugParams } }
const StatusRequest = { config: AUTH, schema: { params: SlugParams, response: { 200: ProblemStatusResponse } } }
const SubmitRequest = { config: AUTH, schema: { params: SlugParams, body: SubmitBody, response: { 200: SubmitResponse } } }
