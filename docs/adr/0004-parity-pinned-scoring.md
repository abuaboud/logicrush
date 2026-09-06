# 4. Scoring and rating are parity-pinned by golden data

Date: 2026-09-06
Status: accepted

## Context

Two pieces of legacy logic are user-visible history that cannot change:

- **Contest scoring** — the decay/penalty/floor formula published to users on the
  أسس التقييم post. Note that `P / 250` in the legacy Java is **integer** division,
  so decay is a whole number of points per minute and a problem under 250 points
  does not decay at all. Every point value in production use is a multiple of 250,
  which is why this went unnoticed — and why a test pinned only on a 500-point
  problem cannot detect getting it wrong.
- **Rating** — the Codeforces rating algorithm, whose outputs are stored in
  `rating_change` and rendered as every user's rating graph.

If a rebuilt implementation differs even by rounding, past contests re-render
with different numbers and the site's own published rules become wrong.

## Decision

Both are ported as **pure functions** — no database, no clock, no config — and
pinned by **golden-data tests** built from the production MySQL dump: for every
past contest, the real registrations and submissions go in, and the recorded
scoreboard points and `rating_change` rows are the expected output.

`npm run lint:deps` enforces the purity half: `competition/scoring.ts` and
`competition/rating.ts` may not import `infra/` or `configs`.

## Why

- Golden data is the only test that can prove parity with an algorithm nobody
  wants to re-derive. Unit tests written from the new code would just restate it.
- Purity is what makes the golden test meaningful — a function that reads a clock
  cannot be replayed against historical data.

## Consequences

- The golden fixtures depend on the production dump, so this work is blocked
  until the dump is available.
- A deliberate future change to scoring requires regenerating the fixtures and
  saying so out loud, which is the intended friction.
