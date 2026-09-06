import { configs } from '../configs.js'

// Contest behaviour is entirely a function of time, so every read of "now" goes
// through here. In test mode the value can be pinned, which is what lets the E2E
// suite walk a 60-minute contest in milliseconds instead of sleeping through it.
// Outside NODE_ENV=test the override is refused, so there is no way to rewrite
// contest time in production.
let pinned: Date | undefined

export const clock = {
  now(): Date {
    return pinned ?? new Date()
  },

  isTestMode(): boolean {
    return configs.nodeEnv === 'test'
  },

  pin(when: Date): void {
    if (!clock.isTestMode()) throw new Error('The clock can only be pinned when NODE_ENV=test')
    pinned = when
  },

  release(): void {
    pinned = undefined
  },
}
