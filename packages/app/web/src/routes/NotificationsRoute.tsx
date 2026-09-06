import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationListResponse } from '@logicrush/shared'
import { api } from '@/lib/api'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useTitle } from '@/lib/use-title'

export function NotificationsRoute() {
  useTitle('الإشعارات')
  const qc = useQueryClient()
  const { data, error } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications?page=1&pageSize=50', NotificationListResponse), retry: false })
  if (error) return <Card><CardHeader>الإشعارات</CardHeader><CardBody>سجّل الدخول لعرض إشعاراتك.</CardBody></Card>

  async function markAll() {
    await api.post('/notifications/read-all')
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['unread-count'] })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span>الإشعارات</span>
          <button onClick={markAll} className="text-xs font-normal underline">تعليم الكل كمقروء</button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {(data?.items ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">لا توجد إشعارات</p>
        ) : (
          data?.items.map((n) => (
            <div key={n.id} className={`border-b border-border px-4 py-3 last:border-0 ${n.read ? '' : 'bg-accent'}`}>
              <div className="text-sm" dangerouslySetInnerHTML={{ __html: n.content }} />
              <div className="text-muted-foreground text-xs">{new Date(n.createdAt).toLocaleString('ar')}</div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  )
}
