import env from 'env-var'
import { log } from '../../infra/log.js'

// Transactional email. RTL Arabic templates. When RESEND_API_KEY is unset
// (dev/test) it records that a mail WOULD have gone out -- never logging the
// token/link, which is a credential. FCM/push stays dropped (ADR 0005).
const RESEND_API_KEY = env.get('RESEND_API_KEY').default('').asString()
const FROM = env.get('MAIL_FROM').default('LogicRush <noreply@logicrush.com>').asString()
const FRONTEND = env.get('FRONTEND_URL').default('http://localhost:5173').asUrlString().replace(/\/+$/, '')

export const mailService = {
  async sendPasswordReset({ email, token }: { email: string; token: string }): Promise<void> {
    const link = `${FRONTEND}/changepassword/${encodeURIComponent(email)}/${token}`
    await send({
      to: email,
      subject: 'إعادة تعيين كلمة المرور — LogicRush',
      html: template('إعادة تعيين كلمة المرور', 'طلبت إعادة تعيين كلمة المرور لحسابك. اضغط الزر أدناه لتعيين كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.', 'إعادة التعيين', link),
    })
  },

  async sendEmailValidation({ email, token }: { email: string; token: string }): Promise<void> {
    const link = `${FRONTEND}/validate/${encodeURIComponent(email)}/${token}`
    await send({
      to: email,
      subject: 'تأكيد بريدك الإلكتروني — LogicRush',
      html: template('مرحباً بك في LogicRush', 'شكراً لتسجيلك. اضغط الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.', 'تأكيد البريد', link),
    })
  },
}

// One RTL Arabic shell for every transactional email, in the brand colours.
function template(heading: string, body: string, cta: string, link: string): string {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f1f1f1;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;overflow:hidden;max-width:600px">
        <tr><td style="background:#111;color:#fff;padding:16px 24px;font-weight:bold">
          <span style="color:#f0a500">Logic</span>Rush
        </td></tr>
        <tr><td style="padding:24px;color:#333;text-align:right;line-height:1.7">
          <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
          <p style="margin:0 0 20px">${body}</p>
          <a href="${link}" style="display:inline-block;background:#06458b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:4px;font-weight:bold">${cta}</a>
          <p style="margin:20px 0 0;font-size:12px;color:#999">أو انسخ هذا الرابط إلى متصفحك:<br><span style="direction:ltr;display:inline-block">${link}</span></p>
        </td></tr>
        <tr><td style="background:#111;color:#999;padding:12px 24px;font-size:12px;text-align:center">
          موقع تعليميّ لتنمية التفكير الحسابي والمنطقي
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function send({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  if (RESEND_API_KEY === '') {
    log.info({ to, subject }, 'email suppressed (no RESEND_API_KEY configured)')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) log.error({ to, status: res.status }, 'email send failed')
}
