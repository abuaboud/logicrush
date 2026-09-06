import { useQuery } from '@tanstack/react-query'
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
              <div key={c.slug} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                <div>
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-sm text-muted-foreground">{c.description}</div>
                </div>
                <div className="flex gap-6 text-center text-sm">
                  <div><div className="font-bold">{c.blogCount}</div><div className="text-muted-foreground">مدونات</div></div>
                  <div><div className="font-bold">{c.commentCount}</div><div className="text-muted-foreground">تعليق</div></div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
