import { expect, test } from '@playwright/test'

// Journey 8 (#58): admin authoring. Sign in as admin (seeded 'superjava' is
// admin in the seed), create a contest via the dashboard, and it appears.
test.describe('Journey 8 — author a contest', () => {
  test('a plain user is refused the admin API (403)', async ({ page }) => {
    await page.request.post('/api/sessions', { data: { username: 'demo', password: 'password123' } })
    const r = await page.request.get('/api/admin/contests')
    expect(r.status()).toBe(403)
  })

  test('an admin creates a contest and it shows on the dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('اسم المستخدم').fill('superjava')
    await page.getByLabel('كلمة المرور').fill('password123')
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page.getByRole('link', { name: 'superjava' })).toBeVisible()

    const slug = 'e2e-authored-' + Date.now()
    await page.goto('/contests/dashboard')
    await page.getByLabel('اسم المسابقة').fill('مسابقة الاختبار')
    await page.getByLabel('الاسم المختصر (بالإنجليزية)').fill(slug)
    await page.getByLabel('المدة (دقائق)').fill('45')
    await page.getByRole('button', { name: 'إنشاء' }).click()
    await expect(page.locator('text=مسابقة الاختبار')).toBeVisible()
  })
})
