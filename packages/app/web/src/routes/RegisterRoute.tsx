import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AppError } from '@logicrush/shared'
import { useAuth } from '@/lib/auth'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Field } from './SignInRoute.js'

export function RegisterRoute() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '' })
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err instanceof AppError ? 'اسم المستخدم أو البريد مستخدم بالفعل' : 'حدث خطأ')
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>إنشاء حساب</CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-3">
            <Field label="الاسم الكامل" value={form.fullName} onChange={set('fullName')} />
            <Field label="اسم المستخدم" value={form.username} onChange={set('username')} />
            <Field label="البريد الإلكتروني" type="email" value={form.email} onChange={set('email')} />
            <Field label="كلمة المرور" type="password" value={form.password} onChange={set('password')} />
            {error !== '' && <p className="text-destructive text-sm">{error}</p>}
            <button className="bg-primary text-primary-foreground w-full rounded px-4 py-2 font-semibold">تسجيل</button>
            <p className="text-muted-foreground text-center text-sm">
              لديك حساب؟ <Link to="/login" className="text-brand-light">سجّل الدخول</Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
