import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { AppError, ErrorCode } from '@logicrush/shared'
import { configs } from './configs.js'
import { databaseService } from './infra/database.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: configs.logLevel } }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: configs.frontendUrl, credentials: true })
  await app.register(cookie, { secret: configs.authSecret })
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })

  // One place turns a thrown value into a response. AppError carries its own
  // status; Fastify's own 4xx (schema validation) passes through; anything else
  // is a bug and is logged, never echoed to the client.
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

  app.get('/api/health', async () => ({ status: 'ok' as const }))

  // Feature controllers register here as they land. Each is a
  // FastifyPluginAsyncZod living in its module folder under identity/,
  // catalog/, competition/ or community/.

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
