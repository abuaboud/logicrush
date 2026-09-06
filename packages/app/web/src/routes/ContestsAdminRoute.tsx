import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminContestListResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { DataTable, Th, Td } from '@/components/ui/table'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Field } from './SignInRoute.js'
import { toast } from 'sonner'

// Contest administration dashboard (#43): list + create. Composition (adding
// problems) is done from the per-contest edit view; refused once it starts.
export function ContestsAdminRoute() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ slug: '', title: '', startsAt: '', lengthMinutes: '60' })
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const { data, error } = useQuery({ queryKey: ['admin-contests'], queryFn: () => api.get('/admin/contests', AdminContestListResponse), retry: false })
  if (error) return <Card><CardHeader>لوحة المسابقات</CardHeader><CardBody>هذه الصفحة للمشرفين فقط.</CardBody></Card>

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/admin/contests', {
        slug: form.slug, title: form.title,
        startsAt: new Date(form.startsAt || Date.now()).toISOString(),
        lengthMinutes: Number(form.lengthMinutes), allowedAttempts: 3,
      })
      toast.success('أُنشئت المسابقة')
      setForm({ slug: '', title: '', startsAt: '', lengthMinutes: '60' })
      qc.invalidateQueries({ queryKey: ['admin-contests'] })
    } catch { toast.error('تعذّر الإنشاء (تحقق من الاسم المختصر)') }
  }

  const stateLabel = (s: string) => (s === 'active' ? 'جارية' : s === 'upcoming' ? 'قادمة' : 'ماضية')
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">لوحة التحكم بالمسابقات</h1>
      <Card>
        <CardHeader>إنشاء مسابقة</CardHeader>
        <CardBody>
          <form onSubmit={create} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="اسم المسابقة" value={form.title} onChange={set('title')} />
            <Field label="الاسم المختصر (بالإنجليزية)" value={form.slug} onChange={set('slug')} />
            <Field label="وقت البدء" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
            <Field label="المدة (دقائق)" type="number" value={form.lengthMinutes} onChange={set('lengthMinutes')} />
            <button className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold md:col-span-2">إنشاء</button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>المسابقات</CardHeader>
        <CardBody className="p-0">
          <DataTable head={<><Th>اسم المسابقة</Th><Th className="text-center">الحالة</Th><Th className="text-center">الأسئلة</Th><Th className="text-end">المدة</Th></>}>
            {(data?.items ?? []).map((c) => (
              <tr key={c.slug} className="hover:bg-muted/50">
                <Td>{c.title}</Td>
                <Td className="text-center">{stateLabel(c.state)}</Td>
                <Td className="text-center">{c.problemCount}</Td>
                <Td className="text-end">{c.lengthMinutes} دقيقة</Td>
              </tr>
            ))}
          </DataTable>
        </CardBody>
      </Card>
    </div>
  )
}
