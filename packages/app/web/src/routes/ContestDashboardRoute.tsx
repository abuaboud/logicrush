import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ContestDetailSchema, ContestProblemsResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DataTable, Th, Td } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { useTitle } from '@/lib/use-title'
import { toast } from 'sonner'

// In-contest view (#27): the platform's core feature. Registered contestants see
// the ordered problems during the live window and open each to solve it; others
// see the register/enter action or a link to the scoreboard once it's over.
export function ContestDashboardRoute() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: contest } = useQuery({ queryKey: ['contest', slug], queryFn: () => api.get(`/contests/${slug}`, ContestDetailSchema) })
  useTitle(contest?.title)

  const canSeeProblems = contest !== undefined && (contest.registered || user?.role === 'admin' || user?.role === 'setter') && contest.state !== 'upcoming'
  const { data: problems } = useQuery({
    queryKey: ['contest-problems', slug],
    queryFn: () => api.get(`/contests/${slug}/problems`, ContestProblemsResponse),
    enabled: canSeeProblems,
    retry: false,
  })

  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (contest === undefined || contest.state !== 'active') return
    const end = new Date(contest.startsAt).getTime() + contest.lengthMinutes * 60_000
    const tick = () => {
      const ms = end - Date.now()
      if (ms <= 0) { setRemaining('انتهت'); return }
      const m = Math.floor(ms / 60_000), s = Math.floor((ms % 60_000) / 1000)
      setRemaining(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [contest])

  if (contest === undefined) return <p>...جار التحميل</p>

  async function register() {
    try {
      await api.post(`/contests/${slug}/registration`)
      qc.invalidateQueries({ queryKey: ['contest', slug] })
      toast.success('تم التسجيل')
    } catch { toast.error('يجب تسجيل الدخول للاشتراك') }
  }

  const stateLabel = contest.state === 'active' ? 'جارية الآن' : contest.state === 'upcoming' ? 'لم تبدأ بعد' : 'انتهت'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span>{contest.title}</span>
            {contest.state === 'active' && <span className="font-mono text-sm">الوقت المتبقّي: {remaining}</span>}
          </div>
        </CardHeader>
        <CardBody className="flex items-center justify-between">
          <div className="text-sm">
            الحالة: <b>{stateLabel}</b> · المدة: {contest.lengthMinutes} دقيقة
            {contest.registered && <span className="text-[#006600]"> · أنت مشترك</span>}
          </div>
          <div className="flex gap-2">
            {!contest.registered && contest.state !== 'past' && (
              <button onClick={register} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold">سجّل دخول للمسابقة</button>
            )}
            <Link to={`/contest/${slug}/scoreboard/page/1`} className="border-border rounded border px-4 py-2 text-sm font-semibold">لوحة النتائج</Link>
          </div>
        </CardBody>
      </Card>

      {contest.state === 'upcoming' ? (
        <Card><CardBody className="text-muted-foreground">ستظهر الأسئلة عند بدء المسابقة.</CardBody></Card>
      ) : canSeeProblems ? (
        <Card>
          <CardHeader>أسئلة المسابقة</CardHeader>
          <CardBody className="p-0">
            <DataTable head={<><Th className="w-12">#</Th><Th>السؤال</Th><Th className="text-end">النقاط</Th></>}>
              {(problems?.items ?? []).map((p, i) => (
                <tr key={p.slug} className="hover:bg-muted/50">
                  <Td>{i + 1}</Td>
                  <Td><Link to={`/problem/${p.slug}`} className="text-brand-light hover:underline">{p.title}</Link></Td>
                  <Td className="text-end tabular-nums">{p.points}</Td>
                </tr>
              ))}
            </DataTable>
          </CardBody>
        </Card>
      ) : (
        <Card><CardBody className="text-muted-foreground">سجّل دخولك للمسابقة لعرض الأسئلة.</CardBody></Card>
      )}
    </div>
  )
}
