import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { CommentViewSchema } from '@logicrush/shared'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Username } from '@/components/Username'
import { useAuth } from '@/lib/auth'

const CommentsResponse = z.object({ items: z.array(CommentViewSchema) })

// A blog post with its threaded comments. Comments nest by parentId; a deleted
// comment shows a tombstone so its replies stay attached.
export function BlogRoute() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const { data: blog } = useQuery({ queryKey: ['blog', id], queryFn: () => api.get<any>(`/blogs/${id}`) })
  const { data: comments } = useQuery({
    queryKey: ['comments', 'blog', id],
    queryFn: () => api.get(`/comments?target=blog&targetId=${id}`, CommentsResponse),
  })
  if (blog === undefined) return <p>...جار التحميل</p>

  async function addComment() {
    if (draft.trim() === '') return
    await api.post('/comments', { target: 'blog', targetId: id, content: draft })
    setDraft('')
    qc.invalidateQueries({ queryKey: ['comments', 'blog', id] })
  }

  const roots = (comments?.items ?? []).filter((c) => c.parentId === null)
  const childrenOf = (pid: string) => (comments?.items ?? []).filter((c) => c.parentId === pid)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>{blog.title}</CardHeader>
        <CardBody>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: blog.content }} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>التعليقات ({comments?.items.length ?? 0})</CardHeader>
        <CardBody className="space-y-3">
          {roots.map((c) => (
            <div key={c.id}>
              <CommentView c={c} />
              <div className="ms-6 mt-2 space-y-2">{childrenOf(c.id).map((r) => <CommentView key={r.id} c={r} />)}</div>
            </div>
          ))}
          {user !== null ? (
            <div className="mt-4 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="أضف تعليقاً" className="border-input flex-1 rounded border px-3 py-2 text-sm" />
              <button onClick={addComment} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold">إرسال</button>
            </div>
          ) : <p className="text-muted-foreground text-sm">سجّل الدخول للتعليق</p>}
        </CardBody>
      </Card>
    </div>
  )
}

function CommentView({ c }: { c: z.infer<typeof CommentViewSchema> }) {
  return (
    <div className="border-border rounded border p-3">
      {c.deleted ? (
        <span className="text-muted-foreground text-sm italic">[تم حذف التعليق]</span>
      ) : (
        <>
          <Username name={c.author} color={c.authorBandColor} />
          <p className="mt-1 text-sm">{c.content}</p>
        </>
      )}
    </div>
  )
}
