import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ProblemListResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { DataTable, Th, Td } from '@/components/ui/table'
import { TagChip } from '@/components/ui/tag-chip'
import { Link } from 'react-router-dom'

export function ProblemsetRoute() {
  const { page = '1', tag } = useParams()
  const query = tag !== undefined ? `&tag=${encodeURIComponent(tag)}` : ''
  const { data } = useQuery({
    queryKey: ['problems', page, tag],
    queryFn: () => api.get(`/problems?page=${page}${query}`, ProblemListResponse),
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">الأسئلة</h1>
      <DataTable
        head={
          <>
            <Th>السؤال</Th>
            <Th>المواضيع</Th>
            <Th className="text-end">عدد مرات الحل</Th>
          </>
        }
      >
        {(data?.items ?? []).map((p) => (
          <tr key={p.slug} className="hover:bg-muted/50">
            <Td>
              <Link to={`/problem/${p.slug}`} className="text-brand-light hover:underline">
                {p.title}
              </Link>
            </Td>
            <Td>{p.tags.map((t) => <TagChip key={t} name={t} />)}</Td>
            <Td className="text-end tabular-nums">{p.solvedCount}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  )
}
