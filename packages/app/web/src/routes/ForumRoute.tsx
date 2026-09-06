import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Globe, Calendar, Trophy, Bug, Lightbulb, Users, MessageSquare, BookOpen, Folder,
  type LucideIcon,
} from 'lucide-react'
import { ForumIndexResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/card'

// Per-category icons, matched to the legacy forum (a calendar for announcements,
// a trophy for contests, a bug for issues, a bulb for suggestions, ...).
const CATEGORY_ICON: Record<string, LucideIcon> = {
  announcements: Calendar,
  contests: Trophy,
  issues: Bug,
  suggestions: Lightbulb,
  introduction: Users,
  random: MessageSquare,
  tutorials: BookOpen,
}

export function ForumRoute() {
  const { data } = useQuery({ queryKey: ['forum'], queryFn: () => api.get('/blog-categories', ForumIndexResponse) })
  return (
    <div className="space-y-8">
      {/* Welcome banner, as on the legacy forum. */}
      <Card>
        <CardBody className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">مرحبا بك</h1>
            <p className="text-muted-foreground">اختر الموضوع الذي يهمك، وأسمعنا رأيك</p>
          </div>
          <Globe className="text-brand size-14 shrink-0" strokeWidth={1.2} />
        </CardBody>
      </Card>

      {(data?.subjects ?? []).map((s) => (
        <div key={s.title} className="space-y-3">
          <h2 className="text-2xl font-bold">{s.title}</h2>
          <Card>
            <CardBody className="p-0">
              {s.categories.map((c) => {
                const Icon = CATEGORY_ICON[c.slug] ?? Folder
                return (
                  <Link
                    key={c.slug}
                    to={`/forum/${c.slug}/page/1`}
                    className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0 hover:bg-muted/50"
                  >
                    <Icon className="text-brand size-7 shrink-0" strokeWidth={1.5} />
                    <div className="flex-1">
                      <div className="font-bold">{c.title}</div>
                      <div className="text-sm text-muted-foreground">{c.description}</div>
                    </div>
                    <div className="flex gap-6 text-center text-sm">
                      <div><div className="font-bold">{c.blogCount}</div><div className="text-muted-foreground">مدونات</div></div>
                      <div><div className="font-bold">{c.commentCount}</div><div className="text-muted-foreground">تعليق</div></div>
                    </div>
                  </Link>
                )
              })}
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  )
}
