import { expect, test } from '@playwright/test'
import { clock } from '../support/clock.js'

// Journey 4 (#54): a contest end to end, driving the server clock. The seed's
// meshka-1 runs 2020-11-19 19:00 for 60 min; we make it active, register, read
// the scoreboard, then move past the end.
test.describe('Journey 4 — a contest end to end', () => {
  test('register during an active contest, then it finishes', async ({ page }) => {
    await page.request.post('/api/sessions', { data: { username: 'demo', password: 'password123' } })
    // make the contest active
    await clock.set(page, new Date('2020-11-19T19:20:00Z'))
    const detail = await (await page.request.get('/api/contests/meshka-1')).json()
    expect(detail.state).toBe('active')
    const reg = await page.request.post('/api/contests/meshka-1/registration')
    expect(reg.ok()).toBeTruthy()
    // scoreboard is reachable and ranked
    const board = await (await page.request.get('/api/contests/meshka-1/scoreboard')).json()
    expect(Array.isArray(board.items)).toBeTruthy()
    // move past the end -> finished
    await clock.set(page, new Date('2020-11-19T21:00:00Z'))
    const after = await (await page.request.get('/api/contests/meshka-1')).json()
    expect(after.state).toBe('past')
  })

  test.afterAll(async ({ request }) => { await request.post('/api/test/clock', { data: { now: new Date().toISOString() } }).catch(() => undefined) })
})
