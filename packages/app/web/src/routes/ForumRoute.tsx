import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ForumIndexResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'

export function ForumRoute() {
  const { data } = useQuery({ queryKey: ['forum'], queryFn: () => api.get('/blog-categories', ForumIndexResponse) })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المنتدى</h1>
      {(data?.subjects ?? []).map((s) => (
        <Card key={s.title}>
          <CardHeader>{s.title}</CardHeader>
          <CardBody className="p-0">
            {s.categories.map((c) => (
              <Link
                key={c.slug}
                to={`/forum/${c.slug}/page/1`}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0 hover:bg-muted/50"
              >
                <div>
                  <div className="font-semibold text-brand-light">{c.title}</div>
                  <div className="text-sm text-muted-foreground">{c.description}</div>
                </div>
                <div className="flex gap-6 text-center text-sm">
                  <div><div className="font-bold">{c.blogCount}</div><div className="text-muted-foreground">مدونات</div></div>
                  <div><div className="font-bold">{c.commentCount}</div><div className="text-muted-foreground">تعليق</div></div>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
