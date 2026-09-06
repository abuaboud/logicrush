# MEMORY

- **2026-09-06** — Rebuild feature-complete + real prod data migrated + verified; a final independent verifier caught that "API built" != "feature usable" (the in-contest UI was missing though its API was done) — always verify against the live product, not the endpoint list. Deploying to beta.logicrush.com on the same server next.
- **2026-09-06** — beta.logicrush.com is live on the legacy box: rebuild in a node:22 container on PGlite (real prod data migrated — 3.7k users, 50 contests, 382 problems, 129k submissions), nginx vhost proxying to it, legacy site untouched. Switched the DB from Postgres to PGlite (`brain/decisions/use-pglite-for-the-beta-database.md`); deploy shape + nginx vhost gotcha in `brain/engineering/beta-deploy-on-the-legacy-server.md`. Also fixed a site-wide layout shift: routes rendered a one-line loading text that collapsed `<main>` and made the footer jump — anchored it with a flex-column layout + `keepPreviousData`.

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
