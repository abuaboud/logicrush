import { expect, test } from '@playwright/test'

// Journey 2 (#52): register, sign in, stay signed in, sign out — driven through
// the real forms.
test.describe('Journey 2 — register, sign in, stay signed in', () => {
  test('register a new account, then it is signed in', async ({ page }) => {
    const u = 'e2e_new_' + Date.now()
    await page.goto('/register')
    await page.getByLabel('اسم المستخدم').fill(u)
    await page.getByLabel('البريد الإلكتروني').fill(`${u}@example.com`)
    await page.getByLabel('كلمة المرور').fill('correct-horse-1')
    await page.getByRole('button', { name: 'تسجيل' }).click()
    // lands home, navbar shows the username + logout
    await expect(page.getByRole('navigation').getByRole('link', { name: u })).toBeVisible()
    await expect(page.getByRole('button', { name: 'خروج' })).toBeVisible()
    // survives a reload
    await page.reload()
    await expect(page.getByRole('navigation').getByRole('link', { name: u })).toBeVisible()
  })

  test('sign in as a seeded user and sign out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('اسم المستخدم').fill('demo')
    await page.getByLabel('كلمة المرور').fill('password123')
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'demo' })).toBeVisible()
    await page.getByRole('button', { name: 'خروج' }).click()
    await expect(page.getByRole('link', { name: 'تسجيل الدخول' })).toBeVisible()
  })

  test('wrong password is rejected', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('اسم المستخدم').fill('demo')
    await page.getByLabel('كلمة المرور').fill('wrong')
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page.locator('text=غير صحيحة')).toBeVisible()
  })
})
