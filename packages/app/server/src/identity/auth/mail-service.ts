import env from 'env-var'
import { log } from '../../infra/log.js'

// Transactional email. When RESEND_API_KEY is unset (dev/test), it records that a
// mail WOULD have been sent -- without ever logging the token, which is a
// credential. The full Resend wiring and RTL Arabic templates land with the
// transactional-email slice (issue #39); this is the seam so no caller logs a
// secret in the meantime.
const RESEND_API_KEY = env.get('RESEND_API_KEY').default('').asString()
const FROM = env.get('MAIL_FROM').default('noreply@logicrush.com').asString()
const FRONTEND = env.get('FRONTEND_URL').default('http://localhost:5173').asUrlString()

export const mailService = {
  async sendPasswordReset({ email, token }: { email: string; token: string }): Promise<void> {
    const link = `${FRONTEND}/reset/${token}`
    await send({ to: email, subject: 'إعادة تعيين كلمة المرور', html: `<p><a href="${link}">اضغط هنا لإعادة تعيين كلمة المرور</a></p>` })
  },

  async sendEmailValidation({ email, token }: { email: string; token: string }): Promise<void> {
    const link = `${FRONTEND}/validate/${token}`
    await send({ to: email, subject: 'تأكيد البريد الإلكتروني', html: `<p><a href="${link}">اضغط هنا لتأكيد بريدك</a></p>` })
  },
}

async function send({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  if (RESEND_API_KEY === '') {
    // No provider configured: record the intent, never the link (it carries the token).
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
