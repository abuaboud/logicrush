# 3. Keep legacy slugs in URLs and legacy ids in the rows

Date: 2026-09-06
Status: accepted

## Context

logicrush.com has been indexed since 2019. Problem and contest pages are linked
from forums and search results by their legacy key (`/problem/:problem_key`).
The legacy primary keys are MySQL auto-increment integers.

## Decision

- New rows get a **nanoid** primary key.
- The legacy `problem_key` / `contest_key` is preserved verbatim as the row's
  **slug**, and the slug is what appears in URLs.
- Every migrated table carries a nullable **`legacy_id`** column holding the
  original MySQL integer id, with a unique index.

## Why

- Slugs in URLs keep every existing inbound link and search result working.
- `legacy_id` makes the migration **re-runnable**: a second pass upserts on
  `legacy_id` instead of duplicating, and any row in the new database can be
  traced back to its MySQL source during verification.

## Consequences

- `legacy_id` is dead weight for rows created after cutover; it stays nullable
  and is never read by application code, only by migration and audit scripts.
- Slug uniqueness must be enforced at the database level, because the legacy data
  is the source of the first few thousand slugs and we do not control it.
