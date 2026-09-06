import { z } from 'zod'

// Legacy `privilege` was an int: 0=user, 1=admin, 2=problem setter.
export const RoleSchema = z.enum(['user', 'admin', 'setter'])

// Legacy `gender` was an int: 1=male, 2=female, 0=unset.
export const GenderSchema = z.enum(['male', 'female', 'unspecified'])

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(32),
  fullName: z.string().max(120),
  email: z.email(),
  role: RoleSchema,
  rating: z.number().int(),
  contributionPoints: z.number().int(),
  countryCode: z.string().length(2).nullable(),
  gender: GenderSchema,
  birthday: z.iso.date().nullable(),
  imgUrl: z.string().nullable(),
  emailValidated: z.boolean(),
  registeredAt: z.iso.datetime(),
  lastOnlineAt: z.iso.datetime().nullable(),
})

// The rating bands that colour a username across the whole site. Ported from
// the legacy Angular `rating-color` pipe; the scoreboard, leaderboard, profile
// and comment bylines all read from this one table.
export const RATING_BANDS = [
  { min: 2400, name: 'legend', color: '#ff0000' },
  { min: 2100, name: 'master', color: '#ff8c00' },
  { min: 1900, name: 'expert', color: '#aa00aa' },
  { min: 1600, name: 'specialist', color: '#0000ff' },
  { min: 1400, name: 'apprentice', color: '#03a89e' },
  { min: 1200, name: 'novice', color: '#008000' },
  { min: 0, name: 'newbie', color: '#808080' },
] as const

export type User = z.infer<typeof UserSchema>
export type Role = z.infer<typeof RoleSchema>
