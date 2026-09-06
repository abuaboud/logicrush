import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { UserSchema, type User } from '@logicrush/shared'
import { api } from './api.js'

// Minimal session context: who is signed in, and sign-in/out/register actions.
// The cookie is the source of truth; this just caches the resolved user.
interface AuthState {
  user: User | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<void>
  register: (body: { username: string; email: string; password: string; fullName?: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/accounts/me', UserSchema)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signIn: AuthState['signIn'] = async (username, password) => {
    setUser(await api.post('/sessions', { username, password }, UserSchema))
  }
  const register: AuthState['register'] = async (body) => {
    await api.post('/accounts', body, UserSchema)
    await signIn(body.username, body.password)
  }
  const signOut: AuthState['signOut'] = async () => {
    await api.del('/sessions/current')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signIn, register, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
