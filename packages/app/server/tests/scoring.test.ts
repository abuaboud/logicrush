import { describe, expect, it } from 'vitest'
import { contestCellPoints } from '@logicrush/shared'

// These cases exist to catch ONE specific mistake: writing `P / 250` as real
// division instead of the integer division the legacy Java does. A test pinned
// only on a 500-point problem passes under both readings, which is exactly how
// the error survived review the first time.
describe('contestCellPoints', () => {
  it('does not decay a problem worth less than 250 points', () => {
    // 100 div 250 === 0, so an hour costs nothing. Real division would give
    // 100 - 60 * 0.4 = 76.
    expect(contestCellPoints({ points: 100, elapsedMinutes: 60, tries: 1, blind: false })).toBe(100)
  })

  it('decays by whole points per minute for a non-multiple of 250', () => {
    // 300 div 250 === 1, not 1.2. Real division would give 300 - 10 * 1.2 = 288.
    expect(contestCellPoints({ points: 300, elapsedMinutes: 10, tries: 1, blind: false })).toBe(290)
  })

  it('matches the published example for a 500-point problem', () => {
    // The أسس التقييم post: a 500-point problem loses 2 points per minute.
    expect(contestCellPoints({ points: 500, elapsedMinutes: 60, tries: 1, blind: false })).toBe(380)
  })

  it('charges a flat 20 per wrong try', () => {
    expect(contestCellPoints({ points: 500, elapsedMinutes: 0, tries: 3, blind: false })).toBe(460)
  })

  it('never falls below 30% of the problem points', () => {
    expect(contestCellPoints({ points: 1000, elapsedMinutes: 500, tries: 1, blind: false })).toBe(300)
    expect(contestCellPoints({ points: 1000, elapsedMinutes: 0, tries: 99, blind: false })).toBe(300)
  })

  it('floors the 30% term on its own', () => {
    // floor(0.30 * 1250) === 375, reached by decay.
    expect(contestCellPoints({ points: 1250, elapsedMinutes: 1000, tries: 1, blind: false })).toBe(375)
  })

  it('scores a blind cell zero regardless of time or tries', () => {
    expect(contestCellPoints({ points: 1000, elapsedMinutes: 0, tries: 1, blind: true })).toBe(0)
  })
})
