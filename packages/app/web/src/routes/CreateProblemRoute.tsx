import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Field } from './SignInRoute.js'
import { useTitle } from '@/lib/use-title'
import { toast } from 'sonner'

// Problem authoring (#42): a setter/admin creates a choice problem with options.
// The new problem starts unlisted+unapproved; an admin approves it from the
// dashboard. Route: /problem/new.
export function CreateProblemRoute() {
  const navigate = useNavigate()
  useTitle('سؤال جديد')
  const [f, setF] = useState({ title: '', description: '', points: '500', o1: '', o2: '', o3: '', o4: '', correct: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const options = [f.o1, f.o2, f.o3, f.o4].filter((o) => o.trim() !== '')
    try {
      const r = await api.post<{ slug: string }>('/admin/problems', {
        title: f.title, type: 'choice', description: `<p>${f.description.replace(/\n+/g, '</p><p>')}</p>`,
        solution: '', correctOption: f.correct, points: Number(f.points), options,
      })
      toast.success('أُنشئ السؤال')
      navigate(`/problem/edit/${r.slug}`)
    } catch { toast.error('هذه الصفحة لواضعي الأسئلة والمشرفين') }
  }

  return (
    <Card>
      <CardHeader>سؤال جديد</CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <Field label="عنوان السؤال" value={f.title} onChange={set('title')} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">نص السؤال</span>
            <textarea value={f.description} onChange={(e) => set('description')(e.target.value)} rows={6} className="border-input w-full rounded border px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الخيار الأول" value={f.o1} onChange={set('o1')} />
            <Field label="الخيار الثاني" value={f.o2} onChange={set('o2')} />
            <Field label="الخيار الثالث" value={f.o3} onChange={set('o3')} />
            <Field label="الخيار الرابع" value={f.o4} onChange={set('o4')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الإجابة الصحيحة (انسخ نص الخيار)" value={f.correct} onChange={set('correct')} />
            <Field label="النقاط" type="number" value={f.points} onChange={set('points')} />
          </div>
          <button className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold">إنشاء</button>
        </form>
      </CardBody>
    </Card>
  )
}
