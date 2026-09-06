# MEMORY

Dated one-off notes that have not earned their own page.

- **2026-09-06** — An independent audit of the issue set found the scoring formula
  mis-specified in four places (integer vs real division) and the test that was
  supposed to pin it unable to detect the error. Fixed, and the general lesson is
  in `brain/engineering/proving-a-test-discriminates.md`.
- **2026-09-06** — Decided to decommission the Android app rather than port it; see `brain/decisions/decommission-the-android-app.md`.
- **2026-09-06** — Started the LogicRush rebuild. Cloned the two legacy repos,
  mapped 68 endpoints and 20 entities, scaffolded the monorepo on the Craftspace
  stack, and broke the work into issues on project board 4. The production MySQL
  dump is still outstanding; the migration and golden-data parity issues are
  blocked on it.
