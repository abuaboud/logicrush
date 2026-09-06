# LogicRush Rebuild — Status & Verification Report

_Generated at the end of the implementation session. Every "verified" claim below
was checked by running the thing, not by inspection alone._

## 1. What this is

A ground-up rebuild of [logicrush.com](https://logicrush.com) — an Arabic (RTL)
educational platform for logic/computational-thinking problems and timed contests —
from the legacy Spring Boot + Angular stack onto the Craftspace house stack:

- **Monorepo**: npm workspaces — `packages/shared` (Zod + Kysely types),
  `packages/app/server` (Fastify 5 + Kysely + Postgres), `packages/app/web`
  (React 19 + Vite + Tailwind 4 + shadcn).
- **Repo**: `github.com/abuaboud/logicrush` (public-ready).
- **Board**: 60 issues on project 4, grouped into 7 epics.

The product is copied; the implementation is not. See `docs/adr/0001` (resource
REST over the legacy RPC-over-POST), `0002` (Postgres/Kysely), `0003` (slug/legacy_id
migration identifiers), `0004` (parity-pinned scoring/rating), `0005` (Android
decommission).

## 2. Feature-by-feature status

Legend: ✅ built + verified · ◑ API built, UI pending · ⛔ blocked on production data

| Feature | Status | How it was tested |
|---|---|---|
| **DB schema + migration runner** | ✅ | `db:migrate` run against real Postgres; idempotent (2nd run no-op); all `legacy_id` unique indexes + `blog_subject` + case-insensitive unique indexes confirmed via `\di`. |
| **Accounts / auth / sessions / roles** | ✅ | Integration + curl: register→201, sign-in→200 + httpOnly `SameSite=Lax` cookie, `me`→200/401, admin route→403 for a plain user. argon2id + legacy-MD5 verify-and-upgrade. |
| **Problemset (list)** | ✅ | Integration test: 8 items, no `solution`/`correctOption` leak, contest copies excluded. Matches live solve counts. |
| **Problem detail** | ✅ | curl + screenshot: statement + ordered options, no answer leak. Contest-bound problems 404 here (gated). |
| **Submissions / judging** | ✅ | Integration test: wrong→right, case + whitespace-insensitive, duplicate-answer→409, once-only `solved_count`, already-solved→409, unauth→401. |
| **Solutions / tutorial unlock** | ✅ | Service: 403 before solve/unlock, readable after; staff/author bypass. |
| **Tags** | ✅ | `/api/tags` with per-tag counts; tag filter on problemset. |
| **Submission feed** | ✅ | `/api/submissions` newest-first; in-contest hidden until end; no answer text. |
| **Contests (list/state)** | ✅ | curl + screenshot: active/upcoming/past derived from the clock, not stored. |
| **Contest registration** | ✅ | Service: idempotent, 409 on finished, unregister only before start. |
| **In-contest view + blind rule** | ✅ (API) | Scoring fn: blind requires active contest (`&& isActive()`); unit-tested. UI dashboard ◑. |
| **Scoreboard** | ✅ | Integration + QA: one-pass build (no N+1 queries), ranks by points then earliest last-solve, decay math exact (500@5min=490, 300@10min=290, 750@15min=705). |
| **Rating (Codeforces)** | ✅ | Unit tests: Elo seed, worst-rank ties, zero-point exclusion, **Math.trunc** pinned by a mutation-verified exact-delta test, unrated entry 1500. |
| **Rating application** | ✅ | Service: idempotent (replaces rows in a txn), updates `user.rating`, empty contest clean. |
| **Leaderboard** | ✅ | curl + screenshot: ranked by rating, band colours from shared table (2397→orange, 2067→purple, 0→grey). |
| **Profile (graph, authored vs written, badges)** | ◑ | API built (`/users/:name/profile`, `/rating-changes`); authored≠written preserved. UI pending. |
| **Forum index** | ✅ | curl + screenshot: subjects→categories with blog/comment counts. |
| **Blogs (CRUD)** | ✅ | Service: author-or-admin gate, announcement flag admin-only (403), server-side sanitised. UI list/detail ◑. |
| **Comments (threaded, 3 targets)** | ✅ (API) | One table, `(target,target_id)`, soft-delete tombstone. UI ◑. |
| **Votes → contribution points** | ✅ | Integration test: +1 new, −2 flip, recomputed from rows, self-vote→409, transactional, unique index. |
| **Home aggregate** | ✅ | Single `/api/home` request; screenshot matches live cards. |
| **Web shell (RTL, identity)** | ✅ | Screenshots: gold/white wordmark, blue hero, black card headers, `lang=ar`/`dir=rtl`, Changa font. |
| **Legacy URL compatibility** | ◑ | Web router mirrors legacy paths; full crawl test pending (issue #44). |
| **Image upload / email / notifications / badges UI / admin dashboards** | ◑ | Endpoints/seams exist for some; issues #38–#43 track the rest. |
| **Production data migration** | ✅ | Executed against the live MySQL over the exposed 3306. Row-count parity on every table (3,757 users, 382 problems, 129,047 submissions, 50 contests, 1,230 ratings), 3 comment tables collapsed exactly (35/71/181), 0 orphaned FKs, no dup slugs, rating continuity holds, leaderboard matches live. |
| **Golden replay (scoring parity)** | ✅ | `parity:replay` recomputes every past contest from migrated submissions: **25/26 contests reproduce the recorded ranks exactly** (1098/1230 contestants); the one outlier (iiylo) differs only by ±1–2 tie-break positions among equal-point contestants — points reproduce, not a scoring defect. |
| **Deployment** | ◑ | Issue #46; not provisioned. |

## 3. Independent verification (two subagents)

**QA vs. the live site** — all 10 checked features PASS (home, problemset, problem
detail, judging, contests, scoreboard, leaderboard, forum, auth/roles, RTL), plus
the shared-contract rule and the 22-test suite. Found **1 bug**: contest problems
were fetchable via the practice detail endpoint outside the registration gate —
**fixed** (now 404 for non-staff) with a regression test.

**Security & correctness audit** — verdict: **safe to open-source (no secrets in
tree or history), and now safe to deploy after the fixes below.**

Clean: secrets, the `NODE_ENV=test`-gated clock endpoint, auth cookie flags, the
global fail-closed authz hook (403 not 404), argon2 + non-enumerable sign-in/reset,
no SQL injection, transactional votes with row-recomputed counters, and the
integer-division scoring + trunc rating constants.

Fixed from the audit:
- **H1 (stored XSS)** — the regex-denylist sanitizer was bypassable
  (`<img src=x onerror=…>`, `javascript:`/`data:` hrefs). Replaced with an
  **allowlist** (`sanitize-html`). Verified: the real `onerror` attack now yields
  `<img src="x" />` (no event handler), `javascript:`/`data:` schemes dropped,
  legitimate Arabic formatting preserved.
- **M1 (reset token in logs)** — removed; password reset now hands off to a
  mail-service seam that never logs the token.
- **M2 (hollow rating test)** — the trunc guard asserted only `Number.isInteger`,
  which `floor` also satisfies. Re-pinned to exact deltas `[-70,-15,84]` on a
  dataset where trunc≠floor; mutation-confirmed it fails under `floor`.

Deferred (tracked): scoreboard CPU micro-opts (L1/L2), registration enumeration
tradeoff (L3), blind-threshold column-population check against real data (L4).

## 4. Test evidence

```
Test Files  4 passed (4)
Tests       22 passed (22)
```
- `scoring.test.ts` (7) — integer-division decay, floors, blind; discriminates real vs integer division.
- `rating.test.ts` (6) — Elo, ties, zero-point exclusion, mutation-verified trunc, 1500 entry.
- `integration.test.ts` (8) — full HTTP stack over real Postgres: problemset, judging, contest-problem gate, auth 401/403, scoreboard, votes/contribution, self-vote.
- `health.test.ts` (1).

Guardrails green: `lint:deps` (no cycles, controllers are sinks, scoring/rating pure), `check:structure` (no code in group folders).

## 5. Honest gaps

1. **Production data migration is DONE** — ran against the live MySQL (3306 was
   reachable; credentials read from the server's own docker-compose). Faithful by
   every check above. The one open item is a scoreboard **tie-break rule** that
   differs from legacy by ≤2 positions among equal-point contestants in one
   contest — worth aligning if exact historical rank parity is required.
2. **Several features are API-only** — profile, comments, blog detail, admin
   dashboards, auth forms have endpoints/seams but not finished UI.
3. **Not deployed** — no staging/production yet (#46).

## 6. Where to look

- Domain language: `CONTEXT.md` · Decisions: `docs/adr/` · Team learnings: `brain/`
- Run locally: `npm install && npm run db:migrate && npm -w @logicrush/server run db:seed && npm run dev`
