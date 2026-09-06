import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { HomeResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Username } from '@/components/Username'

export function HomeRoute() {
  const { data } = useQuery({ queryKey: ['home'], queryFn: () => api.get('/home', HomeResponse) })
  if (data === undefined) return <p>...جار التحميل</p>

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {data.announcements.map((a) => (
          <Card key={a.id}>
            <CardHeader>معلومات هامة</CardHeader>
            <CardBody>
              <h2 className="mb-2 text-lg font-bold">{a.title}</h2>
              <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: a.content }} />
            </CardBody>
          </Card>
        ))}
      </div>
      <aside className="space-y-6">
        <Card>
          <CardHeader>المسابقات</CardHeader>
          <CardBody className="p-0">
            {data.contests.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">لا توجد مسابقات قادمة</p>
            ) : (
              data.contests.map((c) => (
                <div key={c.slug} className="flex justify-between border-b border-border px-4 py-2 text-sm last:border-0">
                  <Link to={`/contest/${c.slug}/dashboard`} className="text-brand-light hover:underline">{c.title}</Link>
                  <span className="text-muted-foreground">{new Date(c.startsAt).toLocaleDateString('ar')}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>الترتيب حسب التقييم</CardHeader>
          <CardBody className="p-0">
            {data.topRated.map((u) => (
              <div key={u.username} className="flex justify-between border-b border-border px-4 py-2 text-sm last:border-0">
                <span className="text-muted-foreground">{u.rank}</span>
                <Username name={u.username} color={u.bandColor} />
                <span>{u.rating}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>الترتيب حسب المساهمة</CardHeader>
          <CardBody className="p-0">
            {data.topContributors.map((u) => (
              <div key={u.username} className="flex justify-between border-b border-border px-4 py-2 text-sm last:border-0">
                <span className="text-muted-foreground">{u.rank}</span>
                <span className="font-medium">{u.username}</span>
                <span>{u.contributionPoints}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </aside>
    </div>
  )
}
