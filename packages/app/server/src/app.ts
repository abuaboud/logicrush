import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AppError, ErrorCode } from '@logicrush/shared'
import { configs } from './configs.js'
import { databaseService } from './infra/database.js'
import { UPLOAD_DIR } from './infra/uploads.js'
import { clock } from './infra/clock.js'
import { authService } from './identity/auth/auth-service.js'
import { security } from './identity/auth/security.js'
import { authController } from './identity/auth/auth-controller.js'
import { userController } from './identity/users/user-controller.js'
import { notificationController } from './identity/notifications/notification-controller.js'
import { uploadController } from './identity/users/upload-controller.js'
import { problemController } from './catalog/problems/problem-controller.js'
import { tagController } from './catalog/tags/tag-controller.js'
import { problemAdminController } from './catalog/admin/problem-admin-controller.js'
import { submissionController } from './competition/submissions/submission-controller.js'
import { contestController } from './competition/contests/contest-controller.js'
import { contestAdminController } from './competition/admin/contest-admin-controller.js'
import { communityController } from './community/blogs/blog-controller.js'
import { seoController } from './infra/seo-controller.js'

const SESSION_COOKIE = 'lr_session'

export async function buildApp(): Promise<FastifyInstance> {
  await databaseService.connect()
  const app = Fastify({ logger: { level: configs.logLevel } }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: configs.frontendUrl, credentials: true })
  await app.register(cookie, { secret: configs.authSecret })
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' })
  await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } })
  await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/', decorateReply: false })

  // Resolve the principal from the session cookie on every request, then enforce
  // the route's declared access. Two hooks, one place -- handlers never re-derive
  // identity or assert a role inline.
  app.addHook('onRequest', async (request) => {
    const sessionId = request.cookies[SESSION_COOKIE]
    if (sessionId !== undefined) {
      request.principal = await authService.resolve({ sessionId })
    }
  })
  app.addHook('preHandler', security.authorize)

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({ code: error.code, params: error.params })
    }
    const status = (error as { statusCode?: number }).statusCode
    if (status !== undefined && status < 500) {
      const message = error instanceof Error ? error.message : 'Invalid request'
      return reply.status(status).send({ code: ErrorCode.VALIDATION, message })
    }
    app.log.error(error)
    return reply.status(500).send({ code: 'INTERNAL' })
  })

  app.get('/api/health', { config: { security: 'public' } }, async () => ({ status: 'ok' as const }))
  await app.register(seoController)

  await app.register(
    async (api) => {
      await api.register(authController)
      await api.register(userController)
      await api.register(notificationController)
      await api.register(uploadController)
      await api.register(problemController)
      await api.register(tagController)
      await api.register(problemAdminController)
      await api.register(submissionController)
      await api.register(contestController)
      await api.register(contestAdminController)
      await api.register(communityController)

      // Test-only clock control for the E2E suite. Mounted ONLY when
      // NODE_ENV=test, so contest time cannot be rewritten in production.
      if (clock.isTestMode()) {
        api.post(
          '/test/clock',
          { config: { security: 'public' }, schema: { body: z.object({ now: z.iso.datetime() }) } },
          async (request) => {
            const body = request.body as { now: string }
            clock.pin(new Date(body.now))
            return { now: clock.now().toISOString() }
          },
        )
      }
    },
    { prefix: '/api' },
  )

  return app
}

async function main(): Promise<void> {
  const app = await buildApp()
  await app.listen({ port: configs.port, host: '0.0.0.0' })
}

if (process.argv[1]?.endsWith('app.ts') === true || process.argv[1]?.endsWith('app.js') === true) {
  main().catch(async (error: unknown) => {
    console.error(error)
    await databaseService.close()
    process.exit(1)
  })
}
