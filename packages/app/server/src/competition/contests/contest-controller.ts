import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ContestDetailSchema, ContestListQuery, ContestListResponse, ScoreboardResponse } from '@logicrush/shared'
import { optionalUser, requireUser } from '../../identity/auth/security.js'
import { contestService } from './contest-service.js'
import { scoreboardService } from '../scoreboard/scoreboard-service.js'

export const contestController: FastifyPluginAsyncZod = async (app) => {
  app.get('/contests', ListRequest, async (request) => ({ items: await contestService.list({ state: request.query.state }) }))
  app.get('/contests/:slug', GetRequest, async (request) =>
    contestService.getBySlugOrThrow({ slug: request.params.slug, viewer: optionalUser(request) }),
  )
  app.get('/contests/:slug/problems', ProblemsRequest, async (request) => ({
    items: await contestService.problems({ slug: request.params.slug, viewer: requireUser(request) }),
  }))
  app.post('/contests/:slug/registration', RegisterRequest, async (request) => {
    await contestService.register({ slug: request.params.slug, viewer: requireUser(request) })
    return { ok: true }
  })
  app.delete('/contests/:slug/registration', RegisterRequest, async (request) => {
    await contestService.unregister({ slug: request.params.slug, viewer: requireUser(request) })
    return { ok: true }
  })
  app.get('/contests/:slug/scoreboard', ScoreboardRequest, async (request) => ({
    items: await scoreboardService.forContest({ slug: request.params.slug }),
  }))
  app.post('/contests/:slug/rating-run', RatingRunRequest, async (request) => ({
    applied: await scoreboardService.applyRatings({ slug: request.params.slug }),
  }))
}

const PUBLIC = { security: 'public' } as const
const AUTH = { security: 'authenticated' } as const
const ADMIN = { security: 'admin' } as const
const SlugParams = z.object({ slug: z.string() })

const ListRequest = {
  config: PUBLIC,
  schema: { querystring: ContestListQuery, response: { 200: ContestListResponse } },
}
const GetRequest = { config: PUBLIC, schema: { params: SlugParams, response: { 200: ContestDetailSchema } } }
const ProblemsRequest = { config: AUTH, schema: { params: SlugParams } }
const RegisterRequest = { config: AUTH, schema: { params: SlugParams } }
const ScoreboardRequest = { config: PUBLIC, schema: { params: SlugParams, response: { 200: ScoreboardResponse } } }
const RatingRunRequest = { config: ADMIN, schema: { params: SlugParams } }
