import { describe, expect, it } from 'vitest'

// The scaffold's one runnable check: the app boots and answers /api/health.
// Feature tests land beside their modules as those modules are built.
describe('health', () => {
  it('serves ok', async () => {
    process.env.DATABASE_URL ??= 'postgres://logicrush:logicrush@localhost:5432/logicrush'
    process.env.AUTH_SECRET ??= 'test-secret'
    const { buildApp } = await import('../src/app.js')
    const app = await buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    await app.close()
  })
})
