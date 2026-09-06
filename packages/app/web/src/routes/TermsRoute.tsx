import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useTitle } from '@/lib/use-title'

// Legacy /terms page. Content mirrors the original site's membership + authorship
// terms (Arabic). Ported so the indexed /terms URL keeps resolving.
export function TermsRoute() {
  useTitle('الشروط والأحكام')
  return (
    <Card>
      <CardHeader>الشروط والأحكام</CardHeader>
      <CardBody className="space-y-3 leading-relaxed">
        <p>باستخدامك موقع LogicRush فإنك توافق على الشروط التالية.</p>
        <h2 className="font-bold">شروط العضوية</h2>
        <p>يلتزم المستخدم بتقديم معلومات صحيحة عند التسجيل، وبعدم إساءة استخدام الموقع أو محاولة الإخلال بنزاهة المسابقات.</p>
        <h2 className="font-bold">حقوق تأليف الأسئلة</h2>
        <p>المسائل التي يساهم بها المستخدمون تبقى منشورة على الموقع لأغراض تعليمية، ويمنح المؤلف الموقعَ حقّ عرضها ومناقشتها.</p>
        <p className="text-muted-foreground text-sm">هذه صفحة مُرحّلة من الموقع الأصلي؛ للنص الكامل يُرجى مراجعة الإدارة.</p>
      </CardBody>
    </Card>
  )
}
