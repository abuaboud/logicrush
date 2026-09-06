import type { FastifyReply, FastifyRequest } from 'fastify'
import { AppError, ErrorCode, type Role } from '@logicrush/shared'

// Auth is declarative: a route states the access it needs in `config.security`
// and one global hook resolves the principal. Handlers never re-derive it, which
// is what keeps authorisation reviewable in one place instead of scattered
// through every service call.
export type Access = 'public' | 'authenticated' | Role

export interface Principal {
  userId: string
  username: string
  role: Role
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal
  }
  interface FastifyContextConfig {
    security?: Access
  }
}

const RANK: Record<Role, number> = { user: 0, setter: 1, admin: 2 }

export const security = {
  async authorize(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    // Static uploads are public files, not API routes -- never gated.
    if (request.url.startsWith('/uploads/')) return
    const access = request.routeOptions.config.security ?? 'authenticated'
    if (access === 'public') return

    const principal = request.principal
    if (principal === undefined) throw new AppError({ code: ErrorCode.UNAUTHORIZED })
    if (access === 'authenticated') return

    // An under-privileged user gets 403, never 404: the resource exists and
    // pretending otherwise turns an authorisation bug into a routing mystery.
    if (RANK[principal.role] < RANK[access]) {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { requires: access } })
    }
  },
}

export function requireUser(request: FastifyRequest): Principal {
  const principal = request.principal
  if (principal === undefined) throw new AppError({ code: ErrorCode.UNAUTHORIZED })
  return principal
}

export function optionalUser(request: FastifyRequest): Principal | undefined {
  return request.principal
}

export function isStaff(principal: Principal | undefined): boolean {
  return principal !== undefined && (principal.role === 'admin' || principal.role === 'setter')
}
