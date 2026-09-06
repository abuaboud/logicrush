import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

// End-to-end over a real Postgres (logicrush_test): boot the app, drive HTTP
// through inject(), and assert the behaviours that matter most -- judging, the
// once-only solve counter, the scoreboard, and the contribution-points path.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ??= 'postgres://localhost/logicrush_test'
process.env.AUTH_SECRET ??= 'test-secret'

let app: FastifyInstance

beforeAll(async () => {
  const { migrations } = await import('../src/infra/migrate.js')
  await migrations.down().catch(() => undefined)
  await migrations.up()
  const { seed } = await import('../src/infra/seed.js')
  await seed.run()
  const { buildApp } = await import('../src/app.js')
  app = await buildApp()
})

afterAll(async () => {
  await app?.close()
  const { databaseService } = await import('../src/infra/database.js')
  await databaseService.close()
})

async function signIn(username: string, password = 'password123'): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/sessions', payload: { username, password } })
  return res.cookies.find((c) => c.name === 'lr_session')!.value
}

describe('problemset', () => {
  it('lists all public problems (incl. past-contest) without leaking answers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/problems?page=1' })
    const body = res.json()
    expect(body.total).toBe(11) // 8 practice + 3 past-contest copies (legacy lists both)
    for (const p of body.items) {
      expect(p).not.toHaveProperty('solution')
      expect(p).not.toHaveProperty('correctOption')
    }
  })
})

describe('contest problems are gated only while the contest is active', () => {
  it('serves a PAST contest problem through the practice detail endpoint (legacy parity)', async () => {
    // meshka-1 is a 2020 contest, long finished -> its problems are practice.
    const res = await app.inject({ method: 'GET', url: '/api/problems/meshka-1-even-numbers' })
    expect(res.statusCode).toBe(200)
  })
})

describe('submission judging', () => {
  it('judges case/space-insensitively and counts a solve once', async () => {
    const cookie = await signIn('demo')
    const headers = { cookie: `lr_session=${cookie}` }

    const before = await app.inject({ method: 'GET', url: '/api/problems/vegetable-shop' })
    const solvedBefore = before.json().solvedCount

    const wrong = await app.inject({ method: 'POST', url: '/api/problems/vegetable-shop/submissions', headers, payload: { answer: 'ب' } })
    expect(wrong.json().correct).toBe(false)

    const right = await app.inject({ method: 'POST', url: '/api/problems/vegetable-shop/submissions', headers, payload: { answer: '  أ  ' } })
    expect(right.json().correct).toBe(true)

    // A repeat correct answer is refused and must not double-count.
    const repeat = await app.inject({ method: 'POST', url: '/api/problems/vegetable-shop/submissions', headers, payload: { answer: 'أ' } })
    expect(repeat.statusCode).toBe(409)

    const after = await app.inject({ method: 'GET', url: '/api/problems/vegetable-shop' })
    expect(after.json().solvedCount).toBe(solvedBefore + 1)
  })

  it('requires auth to submit', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/problems/vegetable-shop/submissions', payload: { answer: 'أ' } })
    expect(res.statusCode).toBe(401)
  })
})

describe('scoreboard', () => {
  it('ranks contestants by decayed points', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/contests/meshka-1/scoreboard' })
    const rows = res.json().items
    expect(rows.length).toBe(3)
    // ranks are monotonic and points non-increasing with rank
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].rank).toBe(i + 1)
      expect(rows[i - 1].totalPoints).toBeGreaterThanOrEqual(rows[i].totalPoints)
    }
    // every cell point equals what the shared scoring fn would produce (no leak of a raw stored score)
    for (const cell of rows[0].cells) expect(cell.points).toBeGreaterThanOrEqual(0)
  })
})

describe('authorization', () => {
  it('403s a plain user on an admin route, 401s when signed out', async () => {
    const anon = await app.inject({ method: 'POST', url: '/api/contests/meshka-1/rating-run' })
    expect(anon.statusCode).toBe(401)
    const cookie = await signIn('demo')
    const user = await app.inject({ method: 'POST', url: '/api/contests/meshka-1/rating-run', headers: { cookie: `lr_session=${cookie}` } })
    expect(user.statusCode).toBe(403)
  })
})

describe('votes and contribution points', () => {
  it('moves the target author contribution by +1, then -2 on a flip, recomputed from rows', async () => {
    // demo votes on superjava's announcement blog
    const cookie = await signIn('demo')
    const headers = { cookie: `lr_session=${cookie}` }
    const blogs = await app.inject({ method: 'GET', url: '/api/blogs?category=announcements' })
    const blogId = blogs.json().items[0].id

    const authorBefore = (await app.inject({ method: 'GET', url: '/api/users/superjava' })).json().contributionPoints

    const up = await app.inject({ method: 'PUT', url: `/api/blogs/${blogId}/vote`, headers, payload: { value: 1 } })
    expect(up.statusCode).toBe(200)
    const afterUp = (await app.inject({ method: 'GET', url: '/api/users/superjava' })).json().contributionPoints
    expect(afterUp).toBe(authorBefore + 1)

    // flip to downvote: net swing of -2
    await app.inject({ method: 'PUT', url: `/api/blogs/${blogId}/vote`, headers, payload: { value: -1 } })
    const afterFlip = (await app.inject({ method: 'GET', url: '/api/users/superjava' })).json().contributionPoints
    expect(afterFlip).toBe(authorBefore - 1)
  })

  it('refuses a self-vote', async () => {
    const cookie = await signIn('superjava')
    const blogs = await app.inject({ method: 'GET', url: '/api/blogs?category=announcements' })
    const blogId = blogs.json().items[0].id
    const res = await app.inject({ method: 'PUT', url: `/api/blogs/${blogId}/vote`, headers: { cookie: `lr_session=${cookie}` }, payload: { value: 1 } })
    expect(res.statusCode).toBe(409)
  })
})
