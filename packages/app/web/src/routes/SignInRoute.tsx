import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AppError } from '@logicrush/shared'
import { useAuth } from '@/lib/auth'
import { Card, CardHeader, CardBody } from '@/components/ui/card'

export function SignInRoute() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await signIn(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof AppError ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'حدث خطأ')
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>تسجيل الدخول</CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-3">
            <Field label="اسم المستخدم" value={username} onChange={setUsername} />
            <Field label="كلمة المرور" type="password" value={password} onChange={setPassword} />
            {error !== '' && <p className="text-destructive text-sm">{error}</p>}
            <button className="bg-primary text-primary-foreground w-full rounded px-4 py-2 font-semibold">دخول</button>
            <p className="text-muted-foreground text-center text-sm">
              ليس لديك حساب؟ <Link to="/register" className="text-brand-light">أنشئ حساباً</Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input w-full rounded border px-3 py-2 text-sm"
      />
    </label>
  )
}
