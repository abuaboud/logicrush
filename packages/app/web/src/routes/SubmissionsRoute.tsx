import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { SubmissionFeedResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { DataTable, Th, Td } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'

export function SubmissionsRoute() {
  const { page = '1' } = useParams()
  const { data } = useQuery({
    queryKey: ['submissions', page],
    queryFn: () => api.get(`/submissions?page=${page}`, SubmissionFeedResponse),
  })
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">آخر الإجابات</h1>
      <DataTable head={<><Th>المستخدم</Th><Th>السؤال</Th><Th className="text-center">النتيجة</Th><Th className="text-end">الوقت</Th></>}>
        {(data?.items ?? []).map((s) => (
          <tr key={s.id} className="hover:bg-muted/50">
            <Td>{s.username}</Td>
            <Td><Link to={`/problem/${s.problemSlug}`} className="text-brand-light hover:underline">{s.problemTitle}</Link></Td>
            <Td className="text-center">{s.correct ? <span className="text-[#006600]">صحيحة</span> : <span className="text-destructive">خاطئة</span>}</Td>
            <Td className="text-end text-muted-foreground text-sm tabular-nums">{new Date(s.submittedAt).toLocaleString('ar')}</Td>
          </tr>
        ))}
      </DataTable>
      {data !== undefined && (
        <Pagination page={data.page} pageSize={data.pageSize} count={data.items.length} href={(p) => `/submissions/page/${p}`} />
      )}
    </div>
  )
}
