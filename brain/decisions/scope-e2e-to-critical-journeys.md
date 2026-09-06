---
status: accepted
---

# Scope end-to-end tests to critical user journeys, not feature coverage

## Decision

The Playwright suite covers eight journeys and stops there: the paths where a
regression loses data, loses search traffic, or corrupts contest history. Feature
detail is tested where it lives — unit tests around pure logic, integration tests
around the API. E2E is not a second copy of the test suite.

## Context

LogicRush has roughly forty feature slices. Writing an E2E test per slice was the
obvious move and the wrong one.

## Why

- A broad browser suite is slow and flaky, and a suite people re-run until it goes
  green is worse than no suite: it trains the team to ignore red.
- E2E earns its cost by proving the pieces are **wired together**. It is a bad and
  expensive way to prove a formula is right — that belongs next to the formula.
- Eight journeys stay fast enough to run on every PR, which is what makes them
  load-bearing at cutover.

## Consequences

- A feature with no journey is not untested; it is tested closer to the code. Do
  not add a journey just because a slice feels important.
- Each journey carries at least one assertion aimed at a *specific* known-hard
  failure rather than a generic happy path — the blind-rule journey asserts that
  live and final standings differ, because an implementation missing the clock
  term passes everything else.
- The suite needs a deterministic seed and a server-side test clock. The clock
  endpoint must 404 outside `NODE_ENV=test`, or it becomes a way to rewrite
  contest time in production.
