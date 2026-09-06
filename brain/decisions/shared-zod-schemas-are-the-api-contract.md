---
status: accepted
---

# The API contract lives once in @logicrush/shared, imported by both sides

## Decision

Every HTTP request and response schema is a Zod schema in `@logicrush/shared`
(`src/api/`), imported by both the Fastify controllers (for validation and
serialization) and the React client (for typed calls and response parsing). A
schema is never declared inline in a controller or duplicated in the web app.
Route wiring — path params, the security config — stays in the controller; the
payload contract does not.

## Context

Controllers naturally grow their own inline `z.object({...})` request/response
schemas, and the web grows its own response types. The two drift the moment
someone edits one side, and nothing catches it until runtime.

## Why

- One definition means the server cannot serialize a shape the client does not
  expect: a field added to a shared schema changes both `z.infer` types at once.
- The web parses responses through the *same* schema the server serialized with,
  so a contract break is a parse error in a test, not a mystery in production.

## Consequences

- `packages/shared/src/api/` is organised by domain (catalog, competition,
  identity, community) next to the entity schemas.
- Enforcement is a grep in review/CI: no `body:`/`response:`/`querystring:`
  `z.object(` may appear in a `*-controller.ts`. Only trivial path-param objects
  (`{ slug }`, `{ id }`) are allowed inline, because they are route wiring.
- Shared must stay dependency-light (zod only) so both a Node server and a browser
  bundle can import it.
