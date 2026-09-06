# 1. A resource-oriented REST API, not a port of the legacy RPC surface

Date: 2026-09-06
Status: accepted

## Context

The legacy Spring backend exposes 68 endpoints, almost all of them `POST` with a
verb in the path and a request object in the body:

```
POST /api/problem/list-practice
POST /api/problem/get
POST /api/contest/list-past-contests
POST /api/admin/problem/flip-approve-state
POST /api/vote/up-vote-comment
```

Nothing is cacheable, nothing is idempotent, reads and writes are
indistinguishable to any proxy, and a single logical resource is spread across
`/api/problem/*`, `/api/admin/problem/*` and `/api/tag/*`.

We are rebuilding the **product**, not the codebase. Carrying this surface over
would preserve a shape that exists only because of how the 2018 code grew.

## Decision

The new API is **resource-oriented**. Collections are plural nouns, HTTP verbs
carry the intent, and sub-resources hang off their parent:

```
GET    /api/problems?tag=&page=          list
POST   /api/problems                     create
GET    /api/problems/:slug               read
PATCH  /api/problems/:slug               update
DELETE /api/problems/:slug               soft-delete (visibility → deleted)
GET    /api/problems/:slug/options
POST   /api/problems/:slug/submissions   attempt a problem
GET    /api/problems/:slug/submissions   this problem's submission feed
GET    /api/contests/:slug/scoreboard
POST   /api/contests/:slug/registration
GET    /api/users/:username
GET    /api/users/:username/rating-changes
POST   /api/blogs/:id/votes
```

Rules that follow from it:

- `GET` is safe and cacheable; it never mutates.
- There is **no `/api/admin/*` mirror**. Admin is an authorisation outcome, not a
  URL space: `PATCH /api/problems/:slug` with `{ "approved": true }` is the same
  route, gated by role.
- Toggles become state, not verbs: `flip-approve-state` is a `PATCH` of
  `approved`; `up-vote` / `down-vote` become `POST /votes { value: 1 | -1 }`.
- Listing endpoints take query parameters for filtering and pagination, and
  return `{ items, page, pageSize, total }`.
- The URL identifier is the **Slug** for Problems and Contests, the **username**
  for Users; internal ids stay out of URLs.

## Why

- It is the shape every consumer already expects, including the existing mobile
  app's eventual rewrite.
- It makes authorisation declarative — one route per resource action, one policy
  per route — instead of scattered across near-duplicate admin controllers.
- It lets `GET` responses be cached at the edge, which the legacy scoreboard
  (recomputed every 5 seconds, served on every poll) badly needed.

## Consequences

- The legacy Angular client cannot talk to the new API. That is fine: the client
  is being rebuilt too, and the two run side by side only until cutover.
- Route paths are **not** a migration constraint, but **page URLs are** — the
  Angular router's public paths (`/problem/:key`, `/contest/:key/scoreboard`)
  must keep resolving so external links and search results survive. That
  constraint lands on the web router, not the API.
- Anything that was a `POST` verb needs a deliberate resource design rather than
  a mechanical rename; the per-slice issues each name their own routes.
