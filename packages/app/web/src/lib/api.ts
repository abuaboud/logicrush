import { AppError, ErrorCode } from '@logicrush/shared'

// One fetch wrapper for the whole web app: same-origin /api in dev via the Vite
// proxy, cookies always sent, and a non-2xx turned into the same AppError shape
// the server raises so callers handle one error type.
export const api = {
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...init.headers },
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        code?: ErrorCode
        params?: Record<string, unknown>
      }
      throw new AppError({ code: body.code ?? ErrorCode.VALIDATION, params: body.params })
    }

    return response.json() as Promise<T>
  },
}
