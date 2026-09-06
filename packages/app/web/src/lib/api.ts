import { AppError, ErrorCode } from '@logicrush/shared'

// One fetch wrapper. Same-origin /api via the Vite proxy in dev, cookies always
// sent, non-2xx rethrown as the AppError the server raised. Callers pass a shared
// Zod schema to parse the response, so the web validates against the identical
// contract the server serialised.
export const api = {
  async get<T>(path: string, schema?: { parse: (v: unknown) => T }): Promise<T> {
    return request('GET', path, undefined, schema)
  },
  async post<T>(path: string, body?: unknown, schema?: { parse: (v: unknown) => T }): Promise<T> {
    return request('POST', path, body, schema)
  },
  async patch<T>(path: string, body?: unknown, schema?: { parse: (v: unknown) => T }): Promise<T> {
    return request('PATCH', path, body, schema)
  },
  async del<T>(path: string, schema?: { parse: (v: unknown) => T }): Promise<T> {
    return request('DELETE', path, undefined, schema)
  },
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  schema?: { parse: (v: unknown) => T },
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const parsed = (await response.json().catch(() => ({}))) as { code?: ErrorCode; params?: Record<string, unknown> }
    throw new AppError({ code: parsed.code ?? ErrorCode.VALIDATION, params: parsed.params })
  }
  const json = (await response.json().catch(() => undefined)) as unknown
  return schema === undefined ? (json as T) : schema.parse(json)
}
