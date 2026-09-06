import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { LeaderboardResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { DataTable, Th, Td } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Username } from '@/components/Username'

export function LeaderboardRoute() {
  const { page = '1' } = useParams()
  const { data } = useQuery({
    queryKey: ['leaderboard', page],
    queryFn: () => api.get(`/users?sort=rating&page=${page}`, LeaderboardResponse),
  })
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">قائمة المتصدرين</h1>
      <DataTable head={<><Th className="w-16">#</Th><Th>المستخدم</Th><Th className="text-end">التقييم</Th></>}>
        {(data?.items ?? []).map((u) => (
          <tr key={u.username} className="hover:bg-muted/50">
            <Td className="text-muted-foreground">{u.rank}</Td>
            <Td><Username name={u.username} color={u.bandColor} /></Td>
            <Td className="text-end tabular-nums">{u.rating}</Td>
          </tr>
        ))}
      </DataTable>
      {data !== undefined && (
        <Pagination page={data.page} pageSize={data.pageSize} count={data.items.length} total={data.total} href={(p) => `/leaderboard/page/${p}`} />
      )}
    </div>
  )
}
