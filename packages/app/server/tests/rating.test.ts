import { describe, expect, it } from 'vitest'
import { ratingAlgorithm, type Contestant } from '@logicrush/shared'

describe('ratingAlgorithm', () => {
  it('moves the winner up and the loser down', () => {
    const contestants: Contestant[] = [
      { userId: 'a', points: 1000, rating: 1500 },
      { userId: 'b', points: 500, rating: 1500 },
    ]
    const [winner, loser] = sortById(ratingAlgorithm.compute({ contestants }))
    expect(winner!.delta).toBeGreaterThan(0)
    expect(loser!.delta).toBeLessThan(0)
  })

  it('gives tied contestants the worst rank in their group', () => {
    // Three-way tie for first: legacy assigns rank 3 (the index after the group),
    // not 1 and not the average.
    const contestants: Contestant[] = [
      { userId: 'a', points: 500, rating: 1500 },
      { userId: 'b', points: 500, rating: 1500 },
      { userId: 'c', points: 500, rating: 1500 },
    ]
    for (const r of ratingAlgorithm.compute({ contestants })) expect(r.rank).toBe(3)
  })

  it('excludes zero-point contestants from the computation', () => {
    // The legacy admin path only adds contestants with points > 0. Someone who
    // registered and scored nothing gets no rating_change row at all.
    const contestants: Contestant[] = [
      { userId: 'a', points: 500, rating: 1500 },
      { userId: 'b', points: 300, rating: 1500 },
      { userId: 'zero', points: 0, rating: 1500 },
    ]
    const results = ratingAlgorithm.compute({ contestants })
    expect(results.map((r) => r.userId).sort()).toEqual(['a', 'b'])
  })

  it('truncates deltas toward zero, the way Java int division does', () => {
    // trunc(-x.5) = -x, floor(-x.5) = -(x+1): swapping Math.trunc -> Math.floor in
    // rating.ts shifts these exact deltas to [-71,-16,83], so this pins the
    // difference the previous Number.isInteger assertion could not see.
    const contestants: Contestant[] = [
      { userId: 'a', points: 1000, rating: 1501 },
      { userId: 'b', points: 700, rating: 1499 },
      { userId: 'c', points: 400, rating: 1503 },
    ]
    const deltas = ratingAlgorithm
      .compute({ contestants })
      .map((r) => r.delta)
      .sort((x, y) => x - y)
    expect(deltas).toEqual([-70, -15, 84])
  })

  it('returns nothing for an empty or all-zero contest', () => {
    expect(ratingAlgorithm.compute({ contestants: [] })).toEqual([])
    expect(
      ratingAlgorithm.compute({ contestants: [{ userId: 'a', points: 0, rating: 1500 }] }),
    ).toEqual([])
  })

  it('enters an unrated contestant at 1500, not at their displayed 0', () => {
    expect(ratingAlgorithm.entryRating({ hasHistory: false, storedRating: 0 })).toBe(1500)
    expect(ratingAlgorithm.entryRating({ hasHistory: true, storedRating: 1732 })).toBe(1732)
  })
})

function sortById(rows: { userId: string; delta: number }[]) {
  return [...rows].sort((a, b) => a.userId.localeCompare(b.userId))
}
