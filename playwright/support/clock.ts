import type { Page } from '@playwright/test'

// Contest behaviour is entirely a function of the clock: active vs finished
// changes the blind rule, the scoreboard and whether ratings apply. Sleeping
// through a real contest window would make the suite unusable, so journeys move
// the clock instead — the browser's via Playwright, the server's via a test-only
// endpoint that is refused unless NODE_ENV is 'test'.
export const clock = {
  async set(page: Page, when: Date): Promise<void> {
    await page.clock.setFixedTime(when)
    const response = await page.request.post('/api/test/clock', {
      data: { now: when.toISOString() },
    })
    if (!response.ok()) {
      throw new Error(
        `Could not set the server clock (${response.status()}). The test clock endpoint must be ` +
          `mounted only when NODE_ENV=test; check the server is running in test mode.`,
      )
    }
  },

  async advanceMinutes(page: Page, minutes: number): Promise<void> {
    const now = await page.evaluate(() => Date.now())
    await clock.set(page, new Date(now + minutes * 60_000))
  },
}
