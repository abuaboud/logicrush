import { DEFAULT_RATING } from './submission.js'

// The Codeforces rating algorithm, ported from the legacy Java RatingService.
// Pure by construction: it lives in the shared package, which cannot import the
// server's infra or config, so the package boundary enforces what a lint rule
// used to. That is what makes it replayable against historical contests.
//
// Two details that a naive port gets wrong, both load-bearing:
//   * Java's `int` division truncates TOWARD ZERO, not toward -Infinity. Deltas
//     are routinely negative, so Math.floor would drift by one for every
//     underperforming contestant. Math.trunc is correct.
//   * Ties share the WORST rank in their group (the index after the group ends),
//     not the best and not an average.

export interface Contestant {
  userId: string
  points: number
  rating: number
}

export interface RatingResult {
  userId: string
  rank: number
  delta: number
  newRating: number
}

interface Row extends Contestant {
  originalRank: number
  rank: number
  seed: number
  delta: number
}

export const ratingAlgorithm = {
  // Contestants who scored nothing are excluded from the computation entirely,
  // matching the legacy admin path (`if (totalPoints > 0) contestants.add(...)`).
  // Their displayed rank still counts them, which is why originalRank is taken
  // from the full standings before filtering.
  compute({ contestants }: { contestants: Contestant[] }): RatingResult[] {
    const ranked = assignRanks(contestants)
    const rows = ranked.filter((r) => r.points > 0)
    if (rows.length === 0) return []

    for (const a of rows) {
      a.seed = 1
      for (const b of rows) {
        if (a !== b) a.seed += eloWinProbability(b.rating, a.rating)
      }
    }

    for (const row of rows) {
      const midRank = Math.sqrt(row.rank * row.seed)
      row.delta = Math.trunc((ratingToRank(rows, midRank) - row.rating) / 2)
    }

    rows.sort((a, b) => b.rating - a.rating)

    // Pass 1: the whole field sums to at most zero.
    {
      const sum = rows.reduce((acc, r) => acc + r.delta, 0)
      const inc = Math.trunc(-sum / rows.length) - 1
      for (const row of rows) row.delta += inc
    }

    // Pass 2: the top 4*sqrt(n) by rating sum to a value clamped into [-10, 0].
    {
      const zeroSumCount = Math.min(4 * Math.round(Math.sqrt(rows.length)), rows.length)
      let sum = 0
      for (let i = 0; i < zeroSumCount; i++) sum += rows[i]!.delta
      const inc = Math.min(Math.max(Math.trunc(-sum / zeroSumCount), -10), 0)
      for (const row of rows) row.delta += inc
    }

    return rows.map((row) => ({
      userId: row.userId,
      rank: row.originalRank,
      delta: row.delta,
      newRating: row.rating + row.delta,
    }))
  },

  // A user with no rating history enters a rated contest at 1500. Note this is
  // NOT the same as their displayed rating, which is 0 until they have competed.
  entryRating({ hasHistory, storedRating }: { hasHistory: boolean; storedRating: number }): number {
    return hasHistory ? storedRating : DEFAULT_RATING
  },
}

function assignRanks(contestants: Contestant[]): Row[] {
  const rows: Row[] = contestants
    .map((c) => ({ ...c, originalRank: 0, rank: 0, seed: 0, delta: 0 }))
    .sort((a, b) => b.points - a.points)
  if (rows.length === 0) return rows

  let first = 0
  let points = rows[0]!.points
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.points < points) {
      for (let j = first; j < i; j++) rows[j]!.rank = i
      first = i
      points = rows[i]!.points
    }
  }
  for (let j = first; j < rows.length; j++) rows[j]!.rank = rows.length
  for (const row of rows) row.originalRank = row.rank
  return rows
}

function eloWinProbability(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400))
}

function seedOf(rows: Row[], rating: number): number {
  let result = 1
  for (const other of rows) result += eloWinProbability(other.rating, rating)
  return result
}

function ratingToRank(rows: Row[], rank: number): number {
  let left = 1
  let right = 8000
  while (right - left > 1) {
    const mid = Math.trunc((left + right) / 2)
    if (seedOf(rows, mid) < rank) right = mid
    else left = mid
  }
  return left
}
