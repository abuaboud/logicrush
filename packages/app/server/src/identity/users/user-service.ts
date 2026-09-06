import { AppError, ErrorCode, RATING_BANDS, type User } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { formatUser } from '../auth/auth-service.js'
import { password } from '../auth/password.js'

export const userService = {
  async getByIdOrThrow({ id }: { id: string }): Promise<User> {
    const row = await databaseService.db().selectFrom('user').selectAll().where('id', '=', id).executeTakeFirst()
    if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'user', id } })
    return formatUser(row)
  },

  async getByUsernameOrThrow({ username }: { username: string }): Promise<User> {
    const row = await databaseService
      .db()
      .selectFrom('user')
      .selectAll()
      .where((eb) => eb(eb.fn('lower', ['username']), '=', username.toLowerCase()))
      .executeTakeFirst()
    if (row === undefined) {
      throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'user', username } })
    }
    return formatUser(row)
  },

  async updateProfile({
    id,
    fullName,
    countryCode,
    gender,
    birthday,
  }: {
    id: string
    fullName?: string
    countryCode?: string | null
    gender?: User['gender']
    birthday?: string | null
  }): Promise<User> {
    const patch: Record<string, unknown> = {}
    if (fullName !== undefined) patch.full_name = fullName
    if (countryCode !== undefined) patch.country_code = countryCode
    if (gender !== undefined) patch.gender = gender
    if (birthday !== undefined) patch.birthday = birthday
    if (Object.keys(patch).length === 0) return userService.getByIdOrThrow({ id })

    const row = await databaseService
      .db()
      .updateTable('user')
      .set(patch)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
    return formatUser(row)
  },

  async changePassword({
    id,
    currentPassword,
    newPassword,
  }: {
    id: string
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    const db = databaseService.db()
    const row = await db.selectFrom('user').select('password_hash').where('id', '=', id).executeTakeFirst()
    if (row === undefined || !(await password.verify({ stored: row.password_hash, plain: currentPassword }))) {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, params: { reason: 'current_password_incorrect' } })
    }
    await db.updateTable('user').set({ password_hash: await password.hash(newPassword) }).where('id', '=', id).execute()
    await db.deleteFrom('session').where('user_id', '=', id).execute()
  },

  // The leaderboard. Users with no rating history sort last rather than being
  // treated as 1500 -- their displayed rating is 0 until they compete.
  async listRanked({
    sort,
    page,
    pageSize,
  }: {
    sort: 'rating' | 'contributions'
    page: number
    pageSize: number
  }): Promise<{ items: RankedUser[]; page: number; pageSize: number; total: number }> {
    const db = databaseService.db()
    const column = sort === 'rating' ? 'rating' : 'contribution_points'
    const rows = await db
      .selectFrom('user')
      .select(['username', 'rating', 'contribution_points', 'country_code', 'img_url'])
      .orderBy(column, 'desc')
      .orderBy('username', 'asc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute()
    const counted = await db.selectFrom('user').select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()

    return {
      items: rows.map((row, i) => ({
        rank: (page - 1) * pageSize + i + 1,
        username: row.username,
        rating: row.rating,
        contributionPoints: row.contribution_points,
        countryCode: row.country_code,
        imgUrl: row.img_url,
        bandColor: ratingBandColor(row.rating),
      })),
      page,
      pageSize,
      total: Number(counted.n),
    }
  },
}

// One source for band colours, shared by the leaderboard, scoreboard, profile and
// every comment byline -- see RATING_BANDS in @logicrush/shared.
export function ratingBandColor(rating: number): string {
  return (RATING_BANDS.find((band) => rating >= band.min) ?? RATING_BANDS[RATING_BANDS.length - 1]!).color
}

export interface RankedUser {
  rank: number
  username: string
  rating: number
  contributionPoints: number
  countryCode: string | null
  imgUrl: string | null
  bandColor: string
}
