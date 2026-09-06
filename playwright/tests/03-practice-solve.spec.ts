import { expect, test } from '@playwright/test'

// Journey 3 (#53): a signed-in user answers a problem wrong then right, and the
// verdict is reported. Uses the seeded 'demo' user and the 'vegetable-shop'
// choice problem whose correct option is 'أ'.
test.describe('Journey 3 — solve a practice problem', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('اسم المستخدم').fill('demo')
    await page.getByLabel('كلمة المرور').fill('password123')
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page.getByRole('link', { name: 'demo' })).toBeVisible()
  })

  test('wrong answer then correct answer are judged', async ({ page }) => {
    await page.goto('/problem/vegetable-shop')
    // wrong option (ب) — the correct is أ
    await page.getByText('الخيار ب').click()
    await page.getByRole('button', { name: 'إرسال الإجابة' }).click()
    await expect(page.locator('text=إجابة خاطئة')).toBeVisible()
    // correct option (أ)
    await page.getByText('الخيار أ', { exact: true }).click()
    await page.getByRole('button', { name: 'إرسال الإجابة' }).click()
    await expect(page.locator('text=إجابة صحيحة')).toBeVisible()
  })

  test('signed-out submit is refused', async ({ page }) => {
    const res = await page.request.post('/api/problems/vegetable-shop/submissions', {
      data: { answer: 'أ' },
      headers: { cookie: '' },
    })
    // without a session cookie the API returns 401
    expect([401, 403]).toContain(res.status())
  })
})
