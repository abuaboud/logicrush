import { expect, test } from '@playwright/test'

// Journey 1 (#51): a visitor reads the site with no account. Search traffic path;
// nothing here may require auth or leak an answer.
test.describe('Journey 1 — a visitor reads the site', () => {
  test('home shows the announcement and leaderboards', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=معلومات هامة').first()).toBeVisible()
    await expect(page.locator('text=الترتيب حسب التقييم')).toBeVisible()
    // a seeded top user appears
    await expect(page.locator('text=superjava').first()).toBeVisible()
  })

  test('problemset lists problems with tags and solve counts', async ({ page }) => {
    await page.goto('/problemset/page/1')
    await expect(page.locator('text=الأسئلة').first()).toBeVisible()
    await expect(page.locator('text=عيسى يكره الأرقام الفردية').first()).toBeVisible()
    await expect(page.locator('text=combinatrics').first()).toBeVisible()
  })

  test('a problem page shows options and never leaks the answer', async ({ page }) => {
    // read the API the page uses and assert no solution/correctOption leaks
    const res = await page.request.get('/api/problems/even-numbers')
    const body = await res.json()
    expect(body).not.toHaveProperty('solution')
    expect(body).not.toHaveProperty('correctOption')
    expect(body.options.length).toBeGreaterThan(0)
    await page.goto('/problem/even-numbers')
    await expect(page.locator('button:has-text("إرسال الإجابة")')).toBeVisible()
  })

  test('the document is RTL Arabic', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  })
})
