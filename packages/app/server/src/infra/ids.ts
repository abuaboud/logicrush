import { customAlphabet } from 'nanoid'

// URL-safe, no lookalike characters. 21 chars keeps collision probability
// negligible at this scale without the ugliness of a full UUID in a path.
const generate = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21)

export const ids = {
  new(): string {
    return generate()
  },

  // Slugs come from the legacy data where they exist; this is only for rows
  // created after cutover.
  slugify(title: string): string {
    const base = title
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
    return base.length > 0 ? `${base.slice(0, 48)}-${generate().slice(0, 6)}` : generate()
  },
}
