import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { LeaderboardQuery, LeaderboardResponse, UserSchema } from '@logicrush/shared'
import { userService } from './user-service.js'
import { profileService } from './profile-service.js'

export const userController: FastifyPluginAsyncZod = async (app) => {
  app.get('/users', ListUsersRequest, async (request) =>
    userService.listRanked({ sort: request.query.sort, page: request.query.page, pageSize: request.query.pageSize }),
  )
  app.get('/users/:username', GetUserRequest, async (request) => userService.getByUsernameOrThrow({ username: request.params.username }))
  app.get('/users/:username/profile', ByName, async (request) => profileService.getProfile({ username: request.params.username }))
  app.get('/users/:username/rating-changes', ByName, async (request) => profileService.getRatingChanges({ username: request.params.username }))
}

const PUBLIC = { security: 'public' } as const
const ByName = { config: PUBLIC, schema: { params: z.object({ username: z.string() }) } }
const ListUsersRequest = {
  config: PUBLIC,
  schema: {
    querystring: LeaderboardQuery,
    response: { 200: LeaderboardResponse },
  },
}
const GetUserRequest = { config: PUBLIC, schema: { params: z.object({ username: z.string() }), response: { 200: UserSchema } } }
