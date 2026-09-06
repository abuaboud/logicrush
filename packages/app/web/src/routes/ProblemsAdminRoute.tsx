import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { AdminProblemListResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { DataTable, Th, Td } from '@/components/ui/table'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

// Problem administration dashboard (#42). Approval and visibility are toggled via
// PATCH, not verb endpoints. Setter/admin only — the API returns 403 otherwise.
export function ProblemsAdminRoute() {
  const { page = '1' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data, error } = useQuery({
    queryKey: ['admin-problems', page],
    queryFn: () => api.get(`/admin/problems?page=${page}`, AdminProblemListResponse),
    retry: false,
  })

  if (error) return <Card><CardHeader>لوحة الأسئلة</CardHeader><CardBody>هذه الصفحة للمشرفين فقط.</CardBody></Card>

  async function toggleApprove(slug: string, approved: boolean) {
    await api.patch(`/admin/problems/${slug}`, { approved: !approved })
    qc.invalidateQueries({ queryKey: ['admin-problems'] })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">لوحة التحكم بالأسئلة</h1>
        <Link to="/problem/new" className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold">سؤال جديد</Link>
      </div>
      <DataTable head={<><Th>السؤال</Th><Th className="text-center">الحالة</Th><Th className="text-center">الظهور</Th><Th className="text-end">النقاط</Th><Th className="text-end">الحل</Th></>}>
        {(data?.items ?? []).map((p) => (
          <tr key={p.slug} className="hover:bg-muted/50">
            <Td><Link to={`/problem/edit/${p.slug}`} className="text-brand-light hover:underline">{p.title}</Link></Td>
            <Td className="text-center">
              <button onClick={() => toggleApprove(p.slug, p.approved)}
                className={`rounded px-2 py-0.5 text-xs font-semibold ${p.approved ? 'bg-[#006600] text-white' : 'bg-muted text-muted-foreground'}`}
                disabled={user?.role !== 'admin'}>
                {p.approved ? 'معتمد' : 'غير معتمد'}
              </button>
            </Td>
            <Td className="text-center">{p.visibility === 'public' ? 'عام' : p.visibility === 'unlisted' ? 'غير مدرج' : 'محذوف'}</Td>
            <Td className="text-end tabular-nums">{p.points}</Td>
            <Td className="text-end tabular-nums">{p.solvedCount}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  )
}
