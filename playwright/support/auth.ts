import type { Page } from '@playwright/test'
import { USERS } from '../seed/seed.js'

// Journeys that are not *about* signing in take the fast path: seed the session
// cookie directly. 02-account.spec.ts drives the real form, because for that one
// the form IS the journey.
export const auth = {
  async signIn(page: Page, who: keyof typeof USERS): Promise<void> {
    const user = USERS[who]
    const response = await page.request.post('/api/sessions', {
      data: { username: user.username, password: user.password },
    })
    if (!response.ok()) throw new Error(`Seed sign-in failed for ${user.username}: ${response.status()}`)
  },

  async signOut(page: Page): Promise<void> {
    await page.request.delete('/api/sessions/current')
  },
}
