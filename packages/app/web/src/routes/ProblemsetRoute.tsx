import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ProblemListResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { DataTable, Th, Td } from '@/components/ui/table'
import { TagChip } from '@/components/ui/tag-chip'
import { Pagination } from '@/components/ui/pagination'

export function ProblemsetRoute() {
  const { page = '1', tag } = useParams()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [term, setTerm] = useState(q)
  const query = [tag !== undefined ? `&tag=${encodeURIComponent(tag)}` : '', q !== '' ? `&q=${encodeURIComponent(q)}` : ''].join('')
  const { data } = useQuery({
    queryKey: ['problems', page, tag, q],
    queryFn: () => api.get(`/problems?page=${page}${query}`, ProblemListResponse),
  })

  function search(e: React.FormEvent) {
    e.preventDefault()
    setParams(term.trim() === '' ? {} : { q: term.trim() })
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">الأسئلة</h1>
      <form onSubmit={search} className="mb-6 flex items-center gap-2">
        <label className="text-sm font-medium">البحث عن سؤال</label>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="border-input flex-1 rounded border px-3 py-2 text-sm"
        />
        <button className="bg-primary text-primary-foreground rounded px-5 py-2 text-sm font-semibold">بحث</button>
      </form>
      <DataTable
        head={
          <>
            <Th>السؤال</Th>
            <Th>المواضيع</Th>
            <Th className="text-end">عدد مرات الحل</Th>
          </>
        }
      >
        {(data?.items ?? []).map((p) => (
          <tr key={p.slug} className="hover:bg-muted/50">
            <Td>
              <Link to={`/problem/${p.slug}`} className="text-brand-light hover:underline">
                {p.title}
              </Link>
            </Td>
            <Td>{p.tags.map((t) => <TagChip key={t} name={t} />)}</Td>
            <Td className="text-end tabular-nums">{p.solvedCount}</Td>
          </tr>
        ))}
      </DataTable>
      {data !== undefined && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          count={data.items.length}
          total={data.total}
          href={(pg) => {
            const base = tag !== undefined ? `/problemset/tag/${encodeURIComponent(tag)}/page/${pg}` : `/problemset/page/${pg}`
            return q !== '' ? `${base}?q=${encodeURIComponent(q)}` : base
          }}
        />
      )}
    </div>
  )
}
