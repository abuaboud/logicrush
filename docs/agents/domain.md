# Domain docs

**Layout: single-context.** One `CONTEXT.md` at the repo root holds the ubiquitous
language; architecture decisions live in `docs/adr/`.

This repo is a monorepo by package layout (`packages/shared`, `packages/app/*`)
but a single bounded context by domain: one product, one glossary, one database.
A `CONTEXT-MAP.md` would add a level of indirection over a single context.

## Consumer rules

- Read `CONTEXT.md` before naming anything. Use its terms in code, issue titles
  and commit messages; do not invent synonyms for terms it already defines.
- Read the ADRs in `docs/adr/` that touch the area you are changing before
  proposing a different approach. An ADR is a decision already made.
- When you make a hard-to-reverse call, write it as a new ADR **and** as a
  Craftspace decision under `brain/decisions/` (see `brain/index.md`).
