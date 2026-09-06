import { describe, expect, it } from 'vitest'

process.env.AUTH_SECRET ??= 'test-secret'
const { formatUser } = await import('../src/identity/auth/auth-service.js')

// Regression: a Postgres `date` column returns a Date object, and legacy data
// has zero-dates / out-of-range birthdays. formatUser must emit a valid
// YYYY-MM-DD or null -- never a mangled string that fails the response schema
// (which previously 500'd every /accounts/me for users with a birthday).
const base = {
  id: 'u1', username: 'x', full_name: 'X', email: 'x@x.com', role: 'user', rating: 0,
  contribution_points: 0, country_code: null, gender: 'unspecified', img_url: null,
  email_validated: true, registered_at: new Date('2020-01-01T00:00:00Z'), last_online_at: null,
}

describe('formatUser birthday', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    expect(formatUser({ ...base, birthday: new Date('2002-12-29T00:00:00Z') }).birthday).toBe('2002-12-29')
  })
  it('accepts a YYYY-MM-DD string', () => {
    expect(formatUser({ ...base, birthday: '1995-06-15' }).birthday).toBe('1995-06-15')
  })
  it('nulls a zero-date', () => {
    expect(formatUser({ ...base, birthday: '0000-00-00' }).birthday).toBeNull()
  })
  it('nulls null and invalid dates', () => {
    expect(formatUser({ ...base, birthday: null }).birthday).toBeNull()
    expect(formatUser({ ...base, birthday: new Date('invalid') }).birthday).toBeNull()
  })
})
