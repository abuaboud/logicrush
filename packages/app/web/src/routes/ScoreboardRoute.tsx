import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ScoreboardResponse, ContestDetailSchema } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DataTable, Th, Td } from '@/components/ui/table'
import { Username } from '@/components/Username'

export function ScoreboardRoute() {
  const { slug = '' } = useParams()
  const { data: contest } = useQuery({ queryKey: ['contest', slug], queryFn: () => api.get(`/contests/${slug}`, ContestDetailSchema) })
  const { data } = useQuery({
    queryKey: ['scoreboard', slug],
    queryFn: () => api.get(`/contests/${slug}/scoreboard`, ScoreboardResponse),
    refetchInterval: 5000,
  })
  const rows = data?.items ?? []
  const problemCount = rows[0]?.cells.length ?? 0

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{contest?.title ?? 'لوحة النتائج'}</h1>
      <DataTable
        head={
          <>
            <Th className="w-12">#</Th>
            <Th>المستخدم</Th>
            <Th className="text-end">المجموع</Th>
            {Array.from({ length: problemCount }).map((_, i) => <Th key={i} className="text-center">{i + 1}</Th>)}
          </>
        }
      >
        {rows.map((r) => (
          <tr key={r.username} className="hover:bg-muted/50">
            <Td>{r.rank}</Td>
            <Td><Username name={r.username} color={r.bandColor} /></Td>
            <Td className="text-end font-bold tabular-nums">{r.totalPoints}</Td>
            {r.cells.map((c, i) => (
              <Td key={i} className="text-center tabular-nums">
                {c.blind ? <span className="text-muted-foreground">؟</span> : c.points > 0 ? (
                  <span className="text-[#006600]">{c.points}</span>
                ) : c.tries > 0 ? <span className="text-destructive">−{c.tries}</span> : ''}
              </Td>
            ))}
          </tr>
        ))}
      </DataTable>
    </div>
  )
}
