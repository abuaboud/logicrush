# LogicRush

Arabic-language (RTL) platform for logic and computational-thinking problems and
timed contests. A rebuild of the 2018 Spring Boot + Angular site on React +
Fastify, following the Craftspace stack conventions.

Read `CONTEXT.md` before naming anything — it holds the ubiquitous language.

## Stack

- **Monorepo**: npm workspaces. `packages/shared` (Zod schemas + Kysely types,
  imported by both sides), `packages/app/server`, `packages/app/web`.
- **Server**: Fastify 5, `fastify-type-provider-zod`, Kysely over Postgres,
  vitest.
- **Web**: React 19, Vite, Tailwind 4, shadcn/ui, TanStack Query, react-router.

## Commands

```bash
npm install
npm run dev            # shared (watch) + server + web
npm run build
npm test               # lint:deps + check:structure + server & web tests
npm run db:migrate
```

## Rules

- **Copy the product, not the legacy code.** The old backend is an RPC-over-POST
  surface with int enums and a revision table nobody read. Behaviour that users
  can see is sacred; the way it was implemented is not. See `docs/adr/0001`.
- **RTL Arabic is the default**, not a mode. `dir="rtl"` on `<html>`; never
  hardcode `left`/`right` — use logical properties (`ms-*`, `me-*`, `start`,
  `end`).
- **Keep the visual identity.** The rebuild uses shadcn components rendered in
  LogicRush's existing palette and type — same look, better primitives. Tokens
  live in `packages/app/web/src/index.css`; do not introduce new brand colours.
- **Module shape**: one `export const xService = { ... }` per module. Controllers
  are a single `FastifyPluginAsyncZod` with thin handlers; their request schemas
  sit at the bottom of the file. See `CODING_STYLE.md`.
- **Group folders hold no code.** `identity/`, `catalog/`, `competition/` and
  `community/` name what a set of modules is about; code lives in a module below
  them. `npm run check:structure` enforces it.
- **Scoring and rating are parity-pinned.** Do not "improve" them. See
  `docs/adr/0004`.

## Agent skills

### Issue tracker

GitHub Issues on `abuaboud/logicrush`, mirrored to project board 4. See
`docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, label strings equal to their names. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Company brain

Durable learnings go in `brain/` as markdown — it rides the PR and syncs to
Craftspace on merge. Decisions in `brain/decisions/`, everything else in
`brain/<slug>.md`. Grep `brain/` before writing so you extend rather than
duplicate.
