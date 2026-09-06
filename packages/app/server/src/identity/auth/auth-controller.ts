import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  ChangePasswordBody,
  OkResponse,
  RegisterBody,
  RequestResetBody,
  ResetPasswordBody,
  SignInBody,
  UpdateProfileBody,
  UserSchema,
} from '@logicrush/shared'
import { requireUser } from './security.js'
import { authService } from './auth-service.js'
import { userService } from '../users/user-service.js'
import { mailService } from './mail-service.js'

const SESSION_COOKIE = 'lr_session'

export const authController: FastifyPluginAsyncZod = async (app) => {
  app.post('/accounts', RegisterRequest, async (request, reply) => {
    const user = await authService.register({
      username: request.body.username,
      email: request.body.email,
      plainPassword: request.body.password,
      fullName: request.body.fullName ?? request.body.username,
    })
    return reply.status(201).send(user)
  })

  app.post('/sessions', SignInRequest, async (request, reply) => {
    const { user, sessionId } = await authService.signIn({
      username: request.body.username,
      plainPassword: request.body.password,
    })
    reply.setCookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 86_400,
    })
    return user
  })

  app.delete('/sessions/current', SignOutRequest, async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE]
    if (sessionId !== undefined) await authService.signOut({ sessionId })
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/accounts/me', MeRequest, async (request) => {
    return userService.getByIdOrThrow({ id: requireUser(request).userId })
  })

  app.patch('/accounts/me', UpdateMeRequest, async (request) => {
    return userService.updateProfile({ id: requireUser(request).userId, ...request.body })
  })

  // Changing your own password is distinct from resetting a forgotten one: it
  // requires the current password, which is what stops a hijacked session from
  // locking the real owner out.
  app.post('/accounts/me/password', ChangePasswordRequest, async (request, reply) => {
    await userService.changePassword({
      id: requireUser(request).userId,
      currentPassword: request.body.currentPassword,
      newPassword: request.body.newPassword,
    })
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  // Always 202, whether or not the address exists. Anything else is an
  // account-enumeration oracle.
  app.post('/password-resets', RequestResetRequest, async (request, reply) => {
    const token = await authService.requestPasswordReset({ email: request.body.email })
    // Deliver via email (see mailService, wired by the transactional-email slice).
    // The token is a credential -- it is never logged.
    if (token !== undefined) {
      request.log.info({ email: request.body.email }, 'password reset issued')
      await mailService.sendPasswordReset({ email: request.body.email, token })
    }
    return reply.status(202).send({ ok: true })
  })

  app.post('/password-resets/:token', PerformResetRequest, async (request) => {
    const userId = await authService.consumeToken({ token: request.params.token, kind: 'password_reset' })
    await authService.setPassword({ userId, plainPassword: request.body.password })
    return { ok: true }
  })

  app.post('/email-validations/:token', ValidateEmailRequest, async (request) => {
    const userId = await authService.consumeToken({ token: request.params.token, kind: 'email_validation' })
    await authService.markEmailValidated({ userId })
    return { ok: true }
  })
}

const PUBLIC = { security: 'public' } as const

const RegisterRequest = {
  config: PUBLIC,
  schema: { body: RegisterBody, response: { 201: UserSchema } },
}

const SignInRequest = {
  config: PUBLIC,
  schema: { body: SignInBody, response: { 200: UserSchema } },
}

const SignOutRequest = { config: PUBLIC, schema: { response: { 200: OkResponse } } }

const MeRequest = { config: { security: 'authenticated' } as const, schema: { response: { 200: UserSchema } } }

const UpdateMeRequest = {
  config: { security: 'authenticated' } as const,
  schema: { body: UpdateProfileBody, response: { 200: UserSchema } },
}

const ChangePasswordRequest = {
  config: { security: 'authenticated' } as const,
  schema: { body: ChangePasswordBody, response: { 200: OkResponse } },
}

const RequestResetRequest = {
  config: PUBLIC,
  schema: { body: RequestResetBody, response: { 202: OkResponse } },
}

const PerformResetRequest = {
  config: PUBLIC,
  schema: {
    params: z.object({ token: z.string().min(16) }),
    body: ResetPasswordBody,
    response: { 200: OkResponse },
  },
}

const ValidateEmailRequest = {
  config: PUBLIC,
  schema: {
    params: z.object({ token: z.string().min(16) }),
    response: { 200: OkResponse },
  },
}
