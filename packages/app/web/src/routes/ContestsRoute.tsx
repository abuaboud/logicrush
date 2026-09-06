import { useQuery } from '@tanstack/react-query'
import { ContestListResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DataTable, Th, Td } from '@/components/ui/table'

function Section({ title, state }: { title: string; state: 'active' | 'upcoming' | 'past' }) {
  const { data } = useQuery({
    queryKey: ['contests', state],
    queryFn: () => api.get(`/contests?state=${state}`, ContestListResponse),
  })
  const items = data?.items ?? []
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody className="p-0">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">لا يوجد</p>
        ) : (
          <DataTable head={<><Th>اسم المسابقة</Th><Th>وقت البدء</Th><Th className="text-end">مدة المسابقة</Th></>}>
            {items.map((c) => (
              <tr key={c.slug}>
                <Td>{c.title}</Td>
                <Td className="tabular-nums">{new Date(c.startsAt).toLocaleString('ar')}</Td>
                <Td className="text-end">{c.lengthMinutes} دقيقة</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </CardBody>
    </Card>
  )
}

export function ContestsRoute() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المسابقات</h1>
      <Section title="المسابقات الجارية" state="active" />
      <Section title="المسابقات القادمة" state="upcoming" />
      <Section title="المسابقات الماضية" state="past" />
    </div>
  )
}
