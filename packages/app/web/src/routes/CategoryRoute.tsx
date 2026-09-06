import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'

const Response = z.object({
  items: z.array(z.object({ id: z.string(), title: z.string(), author: z.string(), commentCount: z.number(), lastActivityAt: z.string() })),
  page: z.number(),
  pageSize: z.number(),
})

export function CategoryRoute() {
  const { category = '', page = '1' } = useParams()
  const { data } = useQuery({
    queryKey: ['category', category, page],
    queryFn: () => api.get(`/blogs?category=${category}&page=${page}`, Response),
  })
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span>{category}</span>
            <Link to={`/forum/${category}/create/blog`} className="text-xs font-normal underline">مدونة جديدة</Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {(data?.items ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
              <Link to={`/blog/${b.id}`} className="text-brand-light hover:underline">{b.title}</Link>
              <span className="text-muted-foreground text-sm">{b.author} · {b.commentCount} تعليق</span>
            </div>
          ))}
        </CardBody>
      </Card>
      {data !== undefined && (
        <Pagination page={data.page} pageSize={data.pageSize} count={data.items.length} href={(p) => `/forum/${category}/page/${p}`} />
      )}
    </div>
  )
}
