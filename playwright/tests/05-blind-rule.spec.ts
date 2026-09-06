import { expect, test } from '@playwright/test'
import { clock } from '../support/clock.js'

// Journey 5 (#55): the blind rule — the subtle, historically-critical behaviour.
// A registered contestant who exhausts the allowed attempts on a problem while
// the contest is LIVE becomes blind on it: the cell scores 0 and the verdict is
// withheld. Once the contest ends, the cell stops being blind. This asserts the
// load-bearing `&& isActive()` term, not just that the endpoint returns rows.
test.describe('Journey 5 — the blind rule', () => {
  test.afterAll(async ({ request }) => {
    await request.post('/api/test/clock', { data: { now: new Date().toISOString() } }).catch(() => undefined)
  })

  test('a cell is blind while live after attempts are exhausted, and clears after the contest ends', async ({ page }) => {
    // a fresh contestant so prior seed submissions do not interfere
    const u = 'e2e_blind_' + Date.now()
    await page.request.post('/api/accounts', { data: { username: u, email: `${u}@e.com`, password: 'password123' } })
    await page.request.post('/api/sessions', { data: { username: u, password: 'password123' } })

    // make meshka-1 active (starts 2020-11-19 19:00, 60 min, allowed_attempts=3)
    await clock.set(page, new Date('2020-11-19T19:10:00Z'))
    await page.request.post('/api/contests/meshka-1/registration')

    // the first contest problem
    const problems = await (await page.request.get('/api/contests/meshka-1/problems')).json()
    const target = problems.items[0].slug

    // exhaust the 3 allowed attempts with WRONG answers (never solving)
    for (let i = 0; i < 3; i++) {
      await page.request.post(`/api/problems/${target}/submissions`, { data: { answer: `خطأ-${i}` } })
    }

    // scoreboard while LIVE: our cell is blind and scores 0
    const live = await (await page.request.get('/api/contests/meshka-1/scoreboard')).json()
    const liveRow = live.items.find((r: { username: string }) => r.username === u)
    expect(liveRow).toBeTruthy()
    const liveCell = liveRow.cells[0]
    expect(liveCell.blind).toBe(true)
    expect(liveCell.points).toBe(0)

    // move past the end: the cell is no longer blind
    await clock.set(page, new Date('2020-11-19T21:00:00Z'))
    const finalBoard = await (await page.request.get('/api/contests/meshka-1/scoreboard')).json()
    const finalRow = finalBoard.items.find((r: { username: string }) => r.username === u)
    expect(finalRow.cells[0].blind).toBe(false)
  })
})
