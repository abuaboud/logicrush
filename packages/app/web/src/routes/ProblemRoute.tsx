import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { PublicProblemSchema, SubmitResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { toast } from 'sonner'

export function ProblemRoute() {
  const { slug = '' } = useParams()
  const [choice, setChoice] = useState<string>('')
  const { data } = useQuery({ queryKey: ['problem', slug], queryFn: () => api.get(`/problems/${slug}`, PublicProblemSchema) })
  if (data === undefined) return <p>...جار التحميل</p>

  async function submit() {
    try {
      const r = await api.post(`/problems/${slug}/submissions`, { answer: choice }, SubmitResponse)
      toast[r.correct ? 'success' : 'error'](r.correct ? 'إجابة صحيحة!' : 'إجابة خاطئة')
    } catch {
      toast.error('يجب تسجيل الدخول للإجابة')
    }
  }

  return (
    <Card>
      <CardHeader>{data.title}</CardHeader>
      <CardBody>
        <div className="prose mb-4 max-w-none" dangerouslySetInnerHTML={{ __html: data.description }} />
        <div className="space-y-2">
          {data.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 rounded border border-border p-2 hover:bg-muted/50">
              <input type="radio" name="opt" value={o.content} onChange={(e) => setChoice(e.target.value)} />
              <span>{o.content}</span>
            </label>
          ))}
        </div>
        <button onClick={submit} className="bg-primary text-primary-foreground mt-4 rounded px-4 py-2 text-sm font-semibold">
          إرسال الإجابة
        </button>
        <span className="text-muted-foreground ms-4 text-sm">{data.points} نقطة</span>
      </CardBody>
    </Card>
  )
}
