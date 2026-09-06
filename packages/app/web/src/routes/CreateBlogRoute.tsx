import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Field } from './SignInRoute.js'
import { useTitle } from '@/lib/use-title'
import { toast } from 'sonner'

// Forum authoring (#34): compose a post in a category. Content is a simple rich
// area (the server sanitises it). Route: /forum/:category/create/blog.
export function CreateBlogRoute() {
  const { category = '' } = useParams()
  const navigate = useNavigate()
  useTitle('كتابة مدونة')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const r = await api.post<{ id: string }>('/blogs', { categorySlug: category, title, content: `<p>${content.replace(/\n+/g, '</p><p>')}</p>` })
      toast.success('نُشرت المدونة')
      navigate(`/blog/${r.id}`)
    } catch { toast.error('يجب تسجيل الدخول للكتابة') }
  }

  return (
    <Card>
      <CardHeader>كتابة مدونة جديدة</CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <Field label="العنوان" value={title} onChange={setTitle} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">المحتوى</span>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10}
              className="border-input w-full rounded border px-3 py-2 text-sm" />
          </label>
          <button className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold">نشر</button>
        </form>
      </CardBody>
    </Card>
  )
}
