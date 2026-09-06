# End-to-end tests

Playwright coverage of LogicRush's **critical user journeys** only — the paths
where a regression loses data, loses search traffic, or corrupts contest history.

Anything narrower belongs in a unit or integration test next to the code. A broad
E2E suite is slow, flaky, and ends up trusted less than the thing it tests.

## Running

```bash
npx playwright install --with-deps chromium    # once
npm run test:e2e                                # boots the dev stack itself
npm run test:e2e -- --ui                        # watch mode
E2E_BASE_URL=https://staging.logicrush.com npm run test:e2e   # against a deployment
```

## Layout

| Path | Purpose |
| --- | --- |
| `seed/` | Deterministic fixture data. Every run starts from the same database state. |
| `support/` | Auth helpers, the contest clock, and shared selectors. |
| `tests/` | One spec per journey, numbered in the order a new reader should read them. |

## Rules

- **Seed, never depend on production data.** A journey that only passes against
  a particular database is not a test.
- **No `waitForTimeout`.** Wait on a condition — a response, a selector, a URL.
- **Assert on user-visible outcomes**, not on API payloads. The API has its own
  tests; this suite exists to prove the pieces are wired together.
- **RTL is part of the assertion.** A journey that passes with the layout
  mirrored wrongly has not verified the product.
- Contest journeys control time through `support/clock.ts` rather than sleeping
  through a real contest window.
