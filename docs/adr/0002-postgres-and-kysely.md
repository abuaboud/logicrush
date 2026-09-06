# 2. Postgres with Kysely, not MySQL with an ORM

Date: 2026-09-06
Status: accepted

## Context

Legacy is MySQL behind Hibernate/JPA. The entity classes lean on eager
`@ManyToOne` joins and a session-scoped `User` bean, which is why several list
endpoints fan out into per-row queries (the scoreboard refresher runs a query per
contestant per problem, every five seconds).

## Decision

Postgres, accessed through **Kysely** — a typed query builder, not an ORM. The
schema is declared once as TypeScript interfaces in `@logicrush/shared/db` and is
the single source of truth for both server queries and migration scripts.

## Why

- It matches the Craftspace stack this team already runs, so the operational
  knowledge transfers.
- A query builder keeps the N+1 problem visible: a fan-out has to be written as
  a fan-out, so it gets noticed in review instead of hiding behind lazy loading.
- Postgres gives us real enums, partial indexes for the soft-delete filter, and
  window functions for scoreboard ranking.

## Consequences

- Every legacy int enum needs an explicit mapping in the migration; those live
  beside their Zod schemas in `@logicrush/shared`.
- No lazy loading means every query states its joins. That is the point.
