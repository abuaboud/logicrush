import { z } from 'zod'

export const RegisterBody = z.object({
  username: z.string().min(3).max(32).regex(/^[A-Za-z0-9_.-]+$/),
  email: z.email(),
  password: z.string().min(8).max(200),
  fullName: z.string().max(120).optional(),
})
export const SignInBody = z.object({ username: z.string().min(1), password: z.string().min(1) })
export const OkResponse = z.object({ ok: z.boolean() })

export const RankedUserSchema = z.object({
  rank: z.number().int(),
  username: z.string(),
  rating: z.number().int(),
  contributionPoints: z.number().int(),
  countryCode: z.string().nullable(),
  imgUrl: z.string().nullable(),
  bandColor: z.string(),
})
export const LeaderboardResponse = z.object({
  items: z.array(RankedUserSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
})

export type RankedUser = z.infer<typeof RankedUserSchema>

export const ChangePasswordBody = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(200) })
export const RequestResetBody = z.object({ email: z.email() })
export const ResetPasswordBody = z.object({ password: z.string().min(8).max(200) })
export const UpdateProfileBody = z.object({
  fullName: z.string().max(120).optional(),
  countryCode: z.string().length(2).nullable().optional(),
  gender: z.enum(['male', 'female', 'unspecified']).optional(),
  birthday: z.iso.date().nullable().optional(),
})
export const LeaderboardQuery = z.object({
  sort: z.enum(['rating', 'contributions']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})
