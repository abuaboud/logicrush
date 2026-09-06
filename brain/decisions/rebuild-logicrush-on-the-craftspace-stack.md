---
status: accepted
---

# Rebuild LogicRush on the Craftspace stack rather than incrementally modernising it

## Decision

Rewrite logicrush.com as a new npm-workspaces monorepo on the Craftspace house
stack — React + Vite + Tailwind + shadcn on the front, Fastify + Kysely +
Postgres on the back — in a fresh repo (`abuaboud/logicrush`), and migrate the
production MySQL data into a reshaped Postgres schema. The legacy Spring Boot and
Angular repos are read as a specification and then retired.

## Context

The site has run since 2018 on Spring Boot + Hibernate + MySQL with an Angular 8
client. It works and has real users, real contest history and nine years of
indexed URLs. But the backend is 68 RPC-over-POST endpoints with a duplicated
`/api/admin/*` tree, int enums, a `revision` table whose history was never
surfaced, and a scoreboard rebuilt every five seconds by an N+1 scheduled job.
Angular 8 is four years past end of life.

We already run and maintain the Craftspace stack. A second product on the same
conventions costs far less to operate than a second stack.

## Why

- **The product is worth keeping; the implementation is not.** Scoring, rating,
  the blind rule and the visual identity are what users know. Everything else is
  how a 2018 codebase happened to grow.
- **One stack, one set of habits.** The same module shape, the same lint rules,
  the same deployment story as Craftspace — knowledge transfers both ways.
- **Incremental modernisation would cost more.** Strangling a Hibernate-era
  entity graph endpoint by endpoint means maintaining both shapes at once, and
  the parts genuinely worth preserving are three pure functions and a colour
  palette, not the architecture around them.

## Consequences

- **Scoring and rating are parity-pinned** by golden-data tests replayed from the
  production dump; they may not be "improved". See ADR 0004.
- **Page URLs are a hard constraint, API routes are not.** Legacy slugs
  (`problem_key`, `contest_key`) stay in the web router; the API is redesigned
  resource-oriented. See ADR 0001 and 0003.
- **The migration is the risk, not the rewrite.** Every migrated table carries
  `legacy_id` so the import is re-runnable and auditable, and cutover is gated on
  a verification pass that diffs row counts and replays past contests.
- The Google Play app talks to the legacy API and will break at cutover. It needs
  its own plan; it is out of scope for this rebuild.
- Arabic RTL is a first-class constraint on component choice — shadcn primitives
  were checked for logical-property support before adopting them.
