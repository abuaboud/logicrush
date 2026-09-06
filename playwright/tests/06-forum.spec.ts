import { expect, test } from '@playwright/test'

// Journey 6 (#56): comment on a blog and vote, and the author's contribution
// points move (+1 on a new upvote). Uses seeded blog + users.
test.describe('Journey 6 — forum comment and vote', () => {
  test('a signed-in user comments on a blog', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('اسم المستخدم').fill('demo')
    await page.getByLabel('كلمة المرور').fill('password123')
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'demo' })).toBeVisible()

    // find the announcement blog id via the API, open it, comment
    const list = await (await page.request.get('/api/blogs?category=announcements')).json()
    const blogId = list.items[0].id
    await page.goto(`/blog/${blogId}`)
    await page.getByPlaceholder('أضف تعليقاً').fill('تعليق تجريبي من الاختبار')
    await page.getByRole('button', { name: 'إرسال' }).click()
    await expect(page.locator('text=تعليق تجريبي من الاختبار')).toBeVisible()
  })

  test('voting a blog moves the author contribution by +1', async ({ page }) => {
    // demo votes on the announcement (authored by superjava)
    await page.request.post('/api/sessions', { data: { username: 'demo', password: 'password123' } })
    const before = (await (await page.request.get('/api/users/superjava')).json()).contributionPoints
    const list = await (await page.request.get('/api/blogs?category=announcements')).json()
    const blogId = list.items[0].id
    const r = await page.request.put(`/api/blogs/${blogId}/vote`, { data: { value: 1 } })
    expect(r.ok()).toBeTruthy()
    const after = (await (await page.request.get('/api/users/superjava')).json()).contributionPoints
    expect(after).toBe(before + 1)
  })
})
