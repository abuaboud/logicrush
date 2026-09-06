import { expect, test } from '@playwright/test'

// Journey 7 (#57): every legacy Angular route still resolves to its page (not a
// blank shell or 404), so nine years of inbound links keep working.
const ROUTES = [
  '/problemset/page/1', '/problem/even-numbers', '/contests',
  '/leaderboard/page/1', '/submissions/page/1', '/forum',
  '/profile/superjava', '/terms', '/login', '/register',
  '/contest/e2e-contest/scoreboard/page/1',
]

test.describe('Journey 7 — legacy URLs still resolve', () => {
  for (const path of ROUTES) {
    test(`resolves ${path}`, async ({ page }) => {
      const resp = await page.goto(path)
      expect(resp?.status()).toBeLessThan(400)
      // the app shell rendered something real (navbar present), not a blank page
      await expect(page.locator('nav')).toBeVisible()
      await expect(page.locator('text=404')).toHaveCount(0)
    })
  }

  test('bare /problemset redirects to page 1', async ({ page }) => {
    await page.goto('/problemset')
    await expect(page).toHaveURL(/\/problemset\/page\/1$/)
  })

  test('an unknown deep path shows the 404 page', async ({ page }) => {
    await page.goto('/this/does/not/exist')
    await expect(page.locator('text=404')).toBeVisible()
  })
})
