import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AppError, ErrorCode } from '@logicrush/shared'
import { requireUser, isStaff } from '../auth/security.js'
import { databaseService } from '../../infra/database.js'
import { uploads } from '../../infra/uploads.js'

// Avatar (any signed-in user) and problem images (setter/admin). Files are
// validated by magic bytes in uploads.save(); a renamed executable is rejected.
export const uploadController: FastifyPluginAsyncZod = async (app) => {
  app.put('/users/me/avatar', AvatarRequest, async (request) => {
    const file = await request.file()
    if (file === undefined) throw new AppError({ code: ErrorCode.VALIDATION, params: { reason: 'no_file' } })
    const url = await uploads.save(await file.toBuffer())
    await databaseService.db().updateTable('user').set({ img_url: url }).where('id', '=', requireUser(request).userId).execute()
    return { url }
  })

  app.post('/problems/:slug/images', ProblemImageRequest, async (request) => {
    if (!isStaff(request.principal)) throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'staff_only' } })
    const file = await request.file()
    if (file === undefined) throw new AppError({ code: ErrorCode.VALIDATION, params: { reason: 'no_file' } })
    return { url: await uploads.save(await file.toBuffer()) }
  })
}

const AvatarRequest = { config: { security: 'authenticated' } as const, schema: { response: { 200: z.object({ url: z.string() }) } } }
const ProblemImageRequest = { config: { security: 'setter' } as const, schema: { params: z.object({ slug: z.string() }), response: { 200: z.object({ url: z.string() }) } } }
