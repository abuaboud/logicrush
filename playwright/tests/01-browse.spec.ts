import { expect, test } from '@playwright/test'

// Filled in by its issue. Each `fixme` below is one step of the journey and
// becomes one assertion; the issue's acceptance criteria list the same steps.
test.describe('Journey 1 — a visitor reads the site', () => {
  test.fixme('not implemented yet', async ({ page }) => {
    await page.goto('/')
    expect(page).toBeDefined()
  })
})
