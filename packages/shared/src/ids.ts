import { z } from 'zod'

// Legacy MySQL used auto-increment ints and separate human-facing "keys"
// (problem_key, contest_key). The new schema keeps a nanoid primary key and
// preserves the legacy key as the URL slug so existing links keep working.
export const IdSchema = z.string().min(1).max(32)
export const SlugSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/)

export type Id = z.infer<typeof IdSchema>
export type Slug = z.infer<typeof SlugSchema>
