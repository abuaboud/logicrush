import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { IdCard, Star, CalendarPlus } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Username } from '@/components/Username'
import { useAuth } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'

// The profile aggregate isn't a single shared schema (it composes several), so
// this reads it untyped from the same endpoint the server serialises. Layout
// mirrors the legacy profile: an info card on the right, the rating chart on the
// left, then achievements and problem lists below.
export function ProfileRoute() {
  const { username = '' } = useParams()
  const { data } = useQuery({ queryKey: ['profile', username], queryFn: () => api.get<any>(`/users/${username}/profile`) })
  const { data: changes } = useQuery({ queryKey: ['rating-changes', username], queryFn: () => api.get<any[]>(`/users/${username}/rating-changes`) })
  if (data === undefined) return <p>...جار التحميل</p>
  const u = data.user

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Info card — first child, so it sits on the RIGHT in RTL, as on legacy. */}
        <Card>
          <CardBody className="space-y-3">
            <div className="mb-2 flex justify-center"><Avatar imgUrl={u.imgUrl} username={u.username} /></div>
            {u.countryCode !== null && (
              <FieldLine icon={<span className="text-lg leading-none">{flag(u.countryCode)}</span>}>{u.countryCode}</FieldLine>
            )}
            <div className="text-2xl font-bold"><Username name={u.username} color={u.bandColor} /></div>
            <FieldLine icon={<IdCard className="size-4" />}>{u.fullName}</FieldLine>
            <FieldLine icon={<Star className="size-4 fill-[#f0ad4e] text-[#f0ad4e]" />}><b>{u.rating}</b> · مساهمة {u.contributionPoints}</FieldLine>
            <FieldLine icon={<CalendarPlus className="size-4" />}>{new Date(u.registeredAt).toDateString()}</FieldLine>
          </CardBody>
        </Card>

        {/* Rating chart — second child, on the LEFT in RTL. */}
        <Card>
          <CardHeader>تغيّرات التقييم</CardHeader>
          <CardBody>
            {changes !== undefined && changes.length > 0
              ? <RatingGraph points={changes} />
              : <p className="text-muted-foreground text-sm">لا توجد مشاركات في مسابقات بعد.</p>}
          </CardBody>
        </Card>
      </div>

      {data.badges !== undefined && data.badges.length > 0 && (
        <Card>
          <CardHeader>الإنجازات</CardHeader>
          <CardBody className="flex flex-wrap gap-4">
            {data.badges.map((b: { title: string; description: string | null; imgUrl: string | null }, i: number) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center" title={b.description ?? ''}>
                {b.imgUrl ? <img src={b.imgUrl} alt={b.title} className="h-12 w-12" /> : <div className="bg-gold h-12 w-12 rounded-full" />}
                <span className="text-xs">{b.title}</span>
              </div>
            ))}
          </CardBody>
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

// One labelled line in the info card: icon at the start (right in RTL), value after.
function FieldLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ISO country code -> flag emoji (JO -> 🇯🇴).
function flag(code: string): string {
  if (code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
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

// Inline SVG line chart with axes, gridlines, value labels and a legend -- the
// legacy profile shows a full rating chart, not a bare sparkline. No chart dep.
function RatingGraph({ points }: { points: { newRating: number; contestTitle: string }[] }) {
  const w = 760, padL = 44, padR = 16, padT = 28, padB = 96
  const h = 380
  const plotW = w - padL - padR, plotH = h - padT - padB
  const ys = points.map((p) => p.newRating)
  const lo = Math.floor((Math.min(...ys) - 60) / 100) * 100
  const hi = Math.ceil((Math.max(...ys) + 60) / 100) * 100
  const ticks: number[] = []
  const step = hi - lo > 800 ? 200 : 100
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  const x = (i: number) => padL + (i * plotW) / Math.max(points.length - 1, 1)
  const y = (v: number) => padT + plotH - ((v - lo) * plotH) / (hi - lo || 1)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.newRating)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" fontFamily="inherit">
      {/* legend (forced LTR so the swatch and label don't overlap in RTL) */}
      <g direction="ltr">
        <rect x={w / 2 - 30} y={6} width={14} height={10} fill="#06458b" />
        <text x={w / 2 - 12} y={15} fontSize={12} fill="currentColor" direction="ltr" textAnchor="start">Rating</text>
      </g>
      {/* y gridlines + labels */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={w - padR} y2={y(v)} stroke="currentColor" strokeOpacity={0.12} />
          <text x={padL - 6} y={y(v) + 4} fontSize={11} textAnchor="end" fill="currentColor" fillOpacity={0.6}>{v}</text>
        </g>
      ))}
      {/* line + points + value labels */}
      <path d={d} fill="none" stroke="#06458b" strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.newRating)} r={3.5} fill="#06458b" />
          <text x={x(i)} y={y(p.newRating) - 8} fontSize={10} textAnchor="middle" fill="currentColor" fillOpacity={0.75}>{p.newRating}</text>
          <text
            x={x(i)} y={padT + plotH + 12}
            fontSize={10} fill="currentColor" fillOpacity={0.7}
            textAnchor="end" transform={`rotate(-45 ${x(i)} ${padT + plotH + 12})`}
          >
            {p.contestTitle.length > 22 ? p.contestTitle.slice(0, 21) + '…' : p.contestTitle}
          </text>
        </g>
      ))}
    </svg>
  )
}

function Avatar({ imgUrl, username }: { imgUrl: string | null; username: string }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const own = user?.username === username
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file === undefined) return
    const body = new FormData()
    body.append('file', file)
    await fetch('/api/users/me/avatar', { method: 'PUT', credentials: 'include', body })
    qc.invalidateQueries({ queryKey: ['profile', username] })
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-muted size-32 overflow-hidden rounded-lg">
        {imgUrl !== null ? <img src={imgUrl} alt={username} className="h-full w-full object-cover" /> : null}
      </div>
      {own ? <label className="text-brand-light cursor-pointer text-xs">تغيير الصورة<input type="file" accept="image/*" className="hidden" onChange={upload} /></label> : null}
    </div>
  )
}
