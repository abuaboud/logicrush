import { createHash, randomBytes } from 'node:crypto'
import { AppError, ErrorCode, type Role, type User } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import { password } from './password.js'
import type { Principal } from './security.js'

const SESSION_DAYS = 30
const RESET_TOKEN_MINUTES = 60

export const authService = {
  async register({
    username,
    email,
    plainPassword,
    fullName,
  }: {
    username: string
    email: string
    plainPassword: string
    fullName: string
  }): Promise<User> {
    const db = databaseService.db()
    const clash = await db
      .selectFrom('user')
      .select('id')
      .where((eb) =>
        eb.or([
          eb(eb.fn('lower', ['username']), '=', username.toLowerCase()),
          eb(eb.fn('lower', ['email']), '=', email.toLowerCase()),
        ]),
      )
      .executeTakeFirst()
    if (clash !== undefined) {
      throw new AppError({ code: ErrorCode.CONFLICT, params: { field: 'username or email' } })
    }

    const row = await db
      .insertInto('user')
      .values({
        id: ids.new(),
        legacy_id: null,
        username,
        full_name: fullName,
        email,
        password_hash: await password.hash(plainPassword),
        role: 'user',
        rating: 0,
        contribution_points: 0,
        country_code: null,
        gender: 'unspecified',
        birthday: null,
        img_url: null,
        email_validated: false,
        registered_at: clock.now(),
        last_online_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return formatUser(row)
  },

  async signIn({ username, plainPassword }: { username: string; plainPassword: string }): Promise<{
    user: User
    sessionId: string
  }> {
    const db = databaseService.db()
    const row = await db
      .selectFrom('user')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb(eb.fn('lower', ['username']), '=', username.toLowerCase()),
          eb(eb.fn('lower', ['email']), '=', username.toLowerCase()),
        ]),
      )
      .executeTakeFirst()

    // Same error whether the account is missing or the password is wrong --
    // distinguishing them turns sign-in into an account-enumeration oracle.
    if (row === undefined || !(await password.verify({ stored: row.password_hash, plain: plainPassword }))) {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, params: { reason: 'invalid_credentials' } })
    }

    // Migrated accounts arrive with an MD5 hash; upgrade on the way through so
    // nobody is forced to reset a password by the migration.
    if (row.password_hash !== null && password.isLegacy(row.password_hash)) {
      await db
        .updateTable('user')
        .set({ password_hash: await password.hash(plainPassword) })
        .where('id', '=', row.id)
        .execute()
    }

    await db.updateTable('user').set({ last_online_at: clock.now() }).where('id', '=', row.id).execute()

    const sessionId = ids.new() + ids.new()
    await db
      .insertInto('session')
      .values({
        id: sessionId,
        user_id: row.id,
        expires_at: new Date(clock.now().getTime() + SESSION_DAYS * 86_400_000),
        created_at: clock.now(),
      })
      .execute()

    return { user: formatUser(row), sessionId }
  },

  async signOut({ sessionId }: { sessionId: string }): Promise<void> {
    await databaseService.db().deleteFrom('session').where('id', '=', sessionId).execute()
  },

  async resolve({ sessionId }: { sessionId: string }): Promise<Principal | undefined> {
    const row = await databaseService
      .db()
      .selectFrom('session')
      .innerJoin('user', 'user.id', 'session.user_id')
      .select(['user.id as id', 'user.username as username', 'user.role as role', 'session.expires_at'])
      .where('session.id', '=', sessionId)
      .executeTakeFirst()
    if (row === undefined || row.expires_at.getTime() < clock.now().getTime()) return undefined
    return { userId: row.id, username: row.username, role: row.role as Role }
  },

  // Always succeeds from the caller's point of view, whether or not the address
  // exists -- the response must not reveal which.
  async requestPasswordReset({ email }: { email: string }): Promise<string | undefined> {
    const db = databaseService.db()
    const user = await db
      .selectFrom('user')
      .select('id')
      .where((eb) => eb(eb.fn('lower', ['email']), '=', email.toLowerCase()))
      .executeTakeFirst()
    if (user === undefined) return undefined

    const token = randomBytes(32).toString('hex')
    await db
      .insertInto('auth_token')
      .values({
        id: ids.new(),
        user_id: user.id,
        kind: 'password_reset',
        token_hash: hashToken(token),
        expires_at: new Date(clock.now().getTime() + RESET_TOKEN_MINUTES * 60_000),
        used_at: null,
      })
      .execute()
    return token
  },

  async consumeToken({
    token,
    kind,
  }: {
    token: string
    kind: 'password_reset' | 'email_validation'
  }): Promise<string> {
    const db = databaseService.db()
    const row = await db
      .selectFrom('auth_token')
      .selectAll()
      .where('token_hash', '=', hashToken(token))
      .where('kind', '=', kind)
      .executeTakeFirst()
    if (row === undefined || row.used_at !== null || row.expires_at.getTime() < clock.now().getTime()) {
      throw new AppError({ code: ErrorCode.VALIDATION, params: { reason: 'invalid_or_expired_token' } })
    }
    await db.updateTable('auth_token').set({ used_at: clock.now() }).where('id', '=', row.id).execute()
    return row.user_id
  },

  async setPassword({ userId, plainPassword }: { userId: string; plainPassword: string }): Promise<void> {
    await databaseService
      .db()
      .updateTable('user')
      .set({ password_hash: await password.hash(plainPassword) })
      .where('id', '=', userId)
      .execute()
    // Every existing session dies with a password change.
    await databaseService.db().deleteFrom('session').where('user_id', '=', userId).execute()
  },

  async markEmailValidated({ userId }: { userId: string }): Promise<void> {
    await databaseService.db().updateTable('user').set({ email_validated: true }).where('id', '=', userId).execute()
  },
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function formatUser(row: {
  id: string
  username: string
  full_name: string
  email: string
  role: string
  rating: number
  contribution_points: number
  country_code: string | null
  gender: string
  birthday: string | Date | null
  img_url: string | null
  email_validated: boolean
  registered_at: Date
  last_online_at: Date | null
}): User {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    role: row.role as Role,
    rating: row.rating,
    contributionPoints: row.contribution_points,
    countryCode: row.country_code,
    gender: row.gender as User['gender'],
    birthday: row.birthday === null ? null : String(row.birthday).slice(0, 10),
    imgUrl: row.img_url,
    emailValidated: row.email_validated,
    registeredAt: row.registered_at.toISOString(),
    lastOnlineAt: row.last_online_at?.toISOString() ?? null,
  }
}
