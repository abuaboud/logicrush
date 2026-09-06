import { createHash, timingSafeEqual } from 'node:crypto'
import argon2 from 'argon2'

// The legacy site stored unsalted MD5 (`Utils.MD5`) and the Angular client hashed
// before sending. Migrated users therefore arrive with an MD5 hash, and forcing
// a password reset on everyone at cutover would be a terrible welcome.
//
// So: verify against whichever scheme the stored hash is in, and transparently
// re-hash to argon2id on the next successful sign-in. Stored hashes are tagged
// with their scheme so this is explicit rather than guessed from length.
const LEGACY_PREFIX = 'md5$'

export const password = {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id })
  },

  // Used only by the migration, to carry a legacy hash across intact.
  fromLegacyMd5(md5Hex: string): string {
    return `${LEGACY_PREFIX}${md5Hex.toLowerCase()}`
  },

  isLegacy(stored: string): boolean {
    return stored.startsWith(LEGACY_PREFIX)
  },

  async verify({ stored, plain }: { stored: string | null; plain: string }): Promise<boolean> {
    if (stored === null) return false
    if (password.isLegacy(stored)) {
      const expected = Buffer.from(stored.slice(LEGACY_PREFIX.length), 'utf8')
      const actual = Buffer.from(createHash('md5').update(plain).digest('hex'), 'utf8')
      return expected.length === actual.length && timingSafeEqual(expected, actual)
    }
    return argon2.verify(stored, plain).catch(() => false)
  },
}
