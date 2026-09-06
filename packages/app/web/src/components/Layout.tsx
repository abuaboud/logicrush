import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// The site frame: black navbar with the gold/white wordmark, the blue hero strip,
// the grey page ground, and the footer. RTL throughout -- nav sits right-to-left.
const NAV = [
  { to: '/', label: 'الرئيسية' },
  { to: '/problemset/page/1', label: 'الأسئلة' },
  { to: '/contests', label: 'المسابقات' },
  { to: '/leaderboard/page/1', label: 'قائمة المتصدرين' },
  { to: '/submissions/page/1', label: 'آخر الإجابات' },
  { to: '/forum', label: 'المنتدى' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="bg-ink text-header-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-gold">Logic</span>Rush
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="opacity-90 transition-opacity hover:opacity-100">
                {n.label}
              </Link>
            ))}
            <Link to="/login" className="opacity-90 hover:opacity-100">تسجيل الدخول</Link>
          </div>
        </div>
      </nav>
      <div className="bg-brand h-14" />
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
      <footer className="bg-ink text-header-foreground mt-12 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-sm opacity-80">
          <span className="text-lg font-bold"><span className="text-gold">Logic</span>Rush</span>
          <span>موقع تعليميّ لتنمية التفكير الحسابي والمنطقي</span>
        </div>
      </footer>
    </div>
  )
}
