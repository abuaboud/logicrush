---
status: accepted
---

# Run the beta on PGlite, not a Postgres server

## Decision

The `beta.logicrush.com` deploy stores its data in **PGlite** — Postgres compiled
to WASM, running in-process in the Node server, file-backed on disk — instead of
a separate Postgres server. This refines the original rebuild decision, which
named "Fastify + Kysely + Postgres". Kysely and the schema are unchanged; only the
driver differs. Tests and CI also use PGlite (in-memory), so the CI Postgres
service was removed.

## Context

Beta runs on the legacy Hetzner box alongside the untouched legacy site, in a
`node:22` container (the host's Node 18 is too old). Adding a Postgres container +
volume + healthcheck was one more moving part to operate for a low-traffic beta.
PGlite removes the DB server entirely: `PGLITE_DATA_DIR` points at a mounted dir,
migrate/seed/legacy-migrate and the app all open that same dir.

## Why

- Simpler ops: one app container, no DB server, no connection string to manage.
- The driver is isolated in `infra/database.ts`, so the swap was ~one file plus a
  `connect()` call at each entry point (app, migrate, seed, legacy-migrate) —
  PGlite is ESM-only and boots async, so it cannot go in the sync `db()` accessor.
- CI no longer needs a Postgres service; the same in-memory PGlite runs the 8
  integration tests.

## Consequences

- **PGlite is single-connection** — queries serialize. Fine for the beta; revisit
  (back to a real Postgres) if concurrency ever matters. Marked with a `ponytail:`
  comment at the seam.
- Only one process may open the data dir at a time: run migrations to completion
  before starting the app container (they share the dir).
- `kysely` must be pinned to one version via a root `overrides` — kysely-pglite
  drags in a second copy through kysely-codegen, and two Kysely copies clash on
  types.
