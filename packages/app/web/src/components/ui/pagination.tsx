import { Link } from 'react-router-dom'

// Prev/next pager for list pages. When the endpoint reports `total` we show the
// exact last page and stop "next" on it; otherwise we fall back to "there is a
// next page if this one came back full". RTL: previous sits at the start (right).
export function Pagination({
  page,
  pageSize,
  count,
  total,
  href,
}: {
  page: number
  pageSize: number
  count: number
  total?: number
  href: (page: number) => string
}) {
  const hasPrev = page > 1
  const hasNext = total !== undefined ? page * pageSize < total : count === pageSize
  if (!hasPrev && !hasNext) return null
  const lastPage = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : undefined
  const on = 'rounded border border-border px-3 py-1 hover:bg-muted/50'
  const off = 'rounded border border-border px-3 py-1 opacity-40'
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      {hasPrev ? <Link to={href(page - 1)} className={on}>السابق</Link> : <span className={off}>السابق</span>}
      <span className="text-muted-foreground tabular-nums">صفحة {page}{lastPage !== undefined ? ` من ${lastPage}` : ''}</span>
      {hasNext ? <Link to={href(page + 1)} className={on}>التالي</Link> : <span className={off}>التالي</span>}
    </div>
  )
}
