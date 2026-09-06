# LogicRush

Arabic-language platform for logic and computational-thinking problems and timed
contests — a modern rebuild of [logicrush.com](https://logicrush.com).

## Stack

React 19 + Vite + Tailwind 4 + shadcn/ui · Fastify 5 + Kysely + Postgres ·
TypeScript end to end, npm workspaces.

## Getting started

```bash
npm install
cp .env.example .env      # set DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run dev
```

Web on <http://localhost:5173>, API on <http://localhost:3000>.

## Layout

```
packages/
  shared/          Zod schemas + Kysely table types, imported by both sides
  app/server/      Fastify API
    src/identity/    accounts, auth, profiles, badges
    src/catalog/     problems, options, tags
    src/competition/ contests, submissions, scoreboard, rating
    src/community/   forum, blogs, comments, votes
  app/web/         React client
```

## Docs

- `CONTEXT.md` — the domain glossary. Read it first.
- `CODING_STYLE.md` — module shape and conventions.
- `docs/adr/` — architecture decisions.
- `brain/` — durable team learnings, synced to Craftspace.
