# Craftspace stack conventions

The house stack, as it actually runs in `craftspace`. LogicRush follows it, so
treat this as shared convention rather than one project's setup.

## Monorepo

npm **workspaces** — not pnpm, not turbo. Three packages, and the shape matters:

```
packages/shared/        Zod schemas + Kysely table types. Both sides import it.
packages/app/server/    Fastify API
packages/app/web/       React client
```

`shared` is the contract. It is built first (`tsc`) and both other packages
depend on `"@scope/shared": "*"`. Every request/response schema lives there, so
the server validates and the client types against the same object — the API
contract cannot drift, because there is only one copy of it.

Root scripts: `dev` builds shared then runs all three under `concurrently`;
`test` runs the structural checks *before* the unit tests.

## Server: Fastify

- **Fastify 5** with `fastify-type-provider-zod`. `withTypeProvider<ZodTypeProvider>()`
  plus the Zod validator/serializer compilers — routes are typed from their
  schemas, no manual casting.
- **Kysely over Postgres**, never an ORM. The schema is TypeScript interfaces in
  `shared/db.ts`. Query builders keep N+1s visible instead of hiding them behind
  lazy loading.
- **Module shape is enforced, not suggested.** One `export const xService = {}`
  per module holding the public API; private helpers below it; exported types at
  the bottom of the file. Controllers are a single `FastifyPluginAsyncZod` whose
  handlers just call a service, with the request schemas declared at the file's
  end.
- **Group folders hold no code.** A folder like `knowledge/` or `identity/` names
  what a set of modules is *about*; the code sits in modules below it.
  `scripts/check-structure.mjs` fails CI on any `.ts` sitting directly in one.
- **Import direction is linted.** `.dependency-cruiser.cjs` forbids cycles and
  makes controllers *sinks* — no module may import another module's controller,
  because a controller is an HTTP surface, not a dependency. Every rule in that
  file is already true of the tree, so a failure is always a real regression.
- **Errors** are a single `AppError` carrying an `ErrorCode`; one Fastify error
  handler maps code → status. Handlers never build error responses.

The two lint scripts are the load-bearing part. They are what stops the
architecture from being a document nobody reads.

## Web: React

- **React + Vite + Tailwind 4 + shadcn/ui.** Tailwind is wired through
  `@tailwindcss/vite`, not PostCSS. shadcn components are vendored into
  `src/components/ui/` and edited freely — they are our code, not a dependency.
- **`features/` vs `routes/` vs `components/`.** `routes/*Route.tsx` are thin
  page components wired to the router. `features/<name>/` holds that feature's
  hooks, API calls and feature-specific components. `components/ui/` is the
  shadcn primitive layer, shared by everything.
- **TanStack Query** owns all server state. There is no Redux, no global store —
  a query key is the cache.
- **Theming through CSS variables.** Colour tokens are defined once on `:root`
  and mapped into Tailwind with `@theme inline`. Components reference
  `bg-primary`, never a hex. Re-skinning is editing one file.
- One `api.ts` fetch wrapper for the whole app: same-origin `/api`, credentials
  included, non-2xx rethrown as the same `AppError` the server raises.

## What we deliberately do NOT do

- No ORM, no lazy loading.
- No barrel-file `index.ts` re-exports inside the server (they create cycles).
- No abstraction with one implementation, no registry around a fixed lookup, no
  wrapper around a single stdlib call.
- No horizontal "layers" package. A feature owns its slice top to bottom.
