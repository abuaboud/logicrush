import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

// The site frame, matched to the live site: logo (emblem + wordmark) on the LEFT,
// nav on the RIGHT (in RTL that means nav is the first flex child), full-width
// bars, and the faceted blue hero. No "home" link — the wordmark is home — and a
// register link beside sign-in, as on the original.
const NAV = [
  { to: '/problemset/page/1', label: 'الأسئلة' },
  { to: '/contests', label: 'المسابقات' },
  { to: '/leaderboard/page/1', label: 'قائمة المتصدرين' },
  { to: '/submissions/page/1', label: 'آخر الإجابات' },
  { to: '/forum', label: 'المنتدى' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="bg-ink text-header-foreground">
        <div className="flex items-center justify-between px-8 py-4">
          {/* nav first → renders at the RIGHT in RTL */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[15px]">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="transition-opacity hover:opacity-80">
                {n.label}
              </Link>
            ))}
            {user === null ? (
              <>
                <Link to="/register" className="transition-opacity hover:opacity-80">التسجيل</Link>
                <Link to="/login" className="transition-opacity hover:opacity-80">تسجيل الدخول</Link>
              </>
            ) : (
              <>
                <Link to={`/profile/${user.username}`} className="transition-opacity hover:opacity-80">{user.username}</Link>
                <button onClick={() => void signOut()} className="transition-opacity hover:opacity-80">خروج</button>
              </>
            )}
          </div>
          {/* logo last → renders at the LEFT in RTL */}
          <Link to="/" aria-label="LogicRush" className="flex items-center">
            <img src="/logo-yellow.png" alt="LogicRush" className="h-9 w-auto" />
          </Link>
        </div>
      </nav>
      <div
        className="h-[68px] bg-brand bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-pattern.svg')" }}
      />
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
      <footer className="bg-ink text-header-foreground mt-12 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-sm opacity-80">
          <img src="/logo-yellow.png" alt="LogicRush" className="h-7 w-auto" />
          <span>موقع تعليميّ لتنمية التفكير الحسابي والمنطقي</span>
        </div>
      </footer>
    </div>
  )
}
