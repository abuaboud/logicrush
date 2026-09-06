# Coding style

Adopted from the Craftspace rulebook. Apply it when writing TypeScript here; when
a rule conflicts with what a file already does, fix the file.

## 1. Module shape — one `export const xService = { ... }`

A module's public API is a single named `export const`. Only what callers
genuinely need from outside goes inside it; everything else is a module-level
helper **below** the service object.

File order:

1. Imports
2. Module-level constants (loggers, repo handles)
3. The single `export const xService = { ... }`
4. Private helper functions
5. Exported types / schemas — at the end

```ts
import { AppError, ErrorCode } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'

export const problemService = {
  async getBySlugOrThrow({ slug }: { slug: string }): Promise<Problem> {
    const row = await databaseService
      .db()
      .selectFrom('problem')
      .selectAll()
      .where('slug', '=', slug)
      .where('visibility', '!=', 'deleted')
      .executeTakeFirst()
    if (row === undefined) {
      throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'problem', slug } })
    }
    return formatProblem(row)
  },
}

function formatProblem(row: ProblemRow): Problem { ... }
```

Anti-patterns: standalone functions referenced by name from the object; loose
top-level exports; a helper placed above the service object; a private helper
exposed on the service just because it is called internally.

Exceptions: types and interfaces are `export type` / `export interface` at the
end of the file. React components are named exports, not bundled into an object.

## 2. Controllers are thin

A controller is one `FastifyPluginAsyncZod`. Handlers call a service and return
its result. Request/response schema objects are declared **at the end** of the
file, below the plugin.

## 3. No premature abstraction

- Don't wrap a single stdlib call. A wrapper earns a name when it combines two
  operations or adds real behaviour.
- No registry layer around a fixed lookup — index the object directly.
- No interface with one implementation; no factory for one product.

## 4. RTL

Never hardcode `left` / `right`. Use logical properties: `ms-*` / `me-*`,
`text-start` / `text-end`, `start-0` / `end-0`. The app renders `dir="rtl"`.

## 5. Errors

Throw `AppError` with an `ErrorCode`. The Fastify error handler maps it to a
status; handlers never build error responses themselves.

## 6. Comments

Comment the **why**, not the what. A comment that restates the code is noise; a
comment naming a constraint, a legacy quirk, or the reason for a non-obvious
choice earns its place.
