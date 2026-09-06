export enum ErrorCode {
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
}

const STATUS: Record<ErrorCode, number> = {
  [ErrorCode.ENTITY_NOT_FOUND]: 404,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly params: Record<string, unknown>
  readonly status: number

  constructor({ code, params = {} }: { code: ErrorCode; params?: Record<string, unknown> }) {
    super(`${code} ${JSON.stringify(params)}`)
    this.code = code
    this.params = params
    this.status = STATUS[code]
  }
}
