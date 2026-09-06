import { useParams } from 'react-router-dom'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useTitle } from '@/lib/use-title'

// Catch-all for the legacy email-link / info-message URLs so links in old emails
// still resolve: /validate/:email/:hash/:token, /changepassword/:email/:hash,
// and bare /:type status pages (verified, error404, check-email-address...).
const MESSAGES: Record<string, string> = {
  verified: 'تم تأكيد بريدك الإلكتروني بنجاح.',
  'check-email-address': 'أرسلنا رسالة إلى بريدك، يُرجى تأكيده.',
  forgetpassword: 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.',
  changepassword: 'يمكنك الآن تعيين كلمة مرور جديدة.',
  validate: 'جارٍ تأكيد بريدك...',
}

export function InfoMessageRoute() {
  const { type = '' } = useParams()
  useTitle('رسالة')
  return (
    <Card>
      <CardHeader>LogicRush</CardHeader>
      <CardBody>
        <p>{MESSAGES[type] ?? 'صفحة معلومات.'}</p>
      </CardBody>
    </Card>
  )
}
