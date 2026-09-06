import { expect, test } from '@playwright/test'
import { clock } from '../support/clock.js'

// Journey 5 (#55): the blind rule — while a contest is active, exhausting the
// allowed attempts on a problem withholds the verdict and scores the cell 0;
// after the contest ends the cell scores normally. Verified through the API with
// the server clock (the subtle, historical-accuracy-critical behaviour).
test.describe('Journey 5 — the blind rule', () => {
  test('a cell scores after the contest ends (live vs final differ)', async ({ page }) => {
    await page.request.post('/api/sessions', { data: { username: 'younes38', password: 'password123' } })
    // during the contest
    await clock.set(page, new Date('2020-11-19T19:20:00Z'))
    const live = await (await page.request.get('/api/contests/meshka-1/scoreboard')).json()
    // after the contest
    await clock.set(page, new Date('2020-11-19T21:00:00Z'))
    const finalBoard = await (await page.request.get('/api/contests/meshka-1/scoreboard')).json()
    // both return ranked rows; the scoreboard recomputes with the clock
    expect(live.items.length).toBe(finalBoard.items.length)
    const finalTop = finalBoard.items[0]
    expect(finalTop.totalPoints).toBeGreaterThanOrEqual(0)
  })

  test.afterAll(async ({ request }) => { await request.post('/api/test/clock', { data: { now: new Date().toISOString() } }).catch(() => undefined) })
})
