import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Username } from '@/components/Username'

// The profile aggregate isn't a single shared schema (it composes several), so
// this reads it untyped from the same endpoint the server serialises.
export function ProfileRoute() {
  const { username = '' } = useParams()
  const { data } = useQuery({ queryKey: ['profile', username], queryFn: () => api.get<any>(`/users/${username}/profile`) })
  const { data: changes } = useQuery({ queryKey: ['rating-changes', username], queryFn: () => api.get<any[]>(`/users/${username}/rating-changes`) })
  if (data === undefined) return <p>...جار التحميل</p>
  const u = data.user

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>الملف الشخصي</CardHeader>
        <CardBody className="flex items-center gap-4">
          <div>
            <div className="text-xl"><Username name={u.username} color={u.bandColor} /></div>
            <div className="text-muted-foreground">{u.fullName}</div>
            <div className="mt-1 text-sm">التقييم: <b>{u.rating}</b> · المساهمة: <b>{u.contributionPoints}</b></div>
          </div>
        </CardBody>
      </Card>
      {changes !== undefined && changes.length > 0 && (
        <Card>
          <CardHeader>تغيّرات التقييم</CardHeader>
          <CardBody><RatingGraph points={changes} /></CardBody>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ProblemList title="مسائل حُلّت" items={data.solved} />
        <ProblemList title="مسائل من تأليفه" items={data.authored} />
        <ProblemList title="مسائل من كتابته" items={data.written} />
      </div>
    </div>
  )
}

function ProblemList({ title, items }: { title: string; items: { slug: string; title: string }[] }) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody className="p-0">
        {items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">لا يوجد</p> : items.map((p) => (
          <Link key={p.slug} to={`/problem/${p.slug}`} className="block border-b border-border px-4 py-2 text-sm text-brand-light hover:bg-muted/50 last:border-0">{p.title}</Link>
        ))}
      </CardBody>
    </Card>
  )
}

// A tiny inline SVG line chart -- no chart dependency for one sparkline.
function RatingGraph({ points }: { points: { newRating: number; contestTitle: string }[] }) {
  const w = 600, h = 160, pad = 20
  const ys = points.map((p) => p.newRating)
  const min = Math.min(...ys) - 50, max = Math.max(...ys) + 50
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(points.length - 1, 1)
  const y = (v: number) => h - pad - ((v - min) * (h - 2 * pad)) / (max - min || 1)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.newRating)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <path d={d} fill="none" stroke="#06458b" strokeWidth={2} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.newRating)} r={3} fill="#06458b" />)}
    </svg>
  )
}
