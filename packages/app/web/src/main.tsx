import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { AuthProvider } from './lib/auth.js'
import { Layout } from './components/Layout.js'
import { HomeRoute } from './routes/HomeRoute.js'
import { ProblemsetRoute } from './routes/ProblemsetRoute.js'
import { ProblemRoute } from './routes/ProblemRoute.js'
import { LeaderboardRoute } from './routes/LeaderboardRoute.js'
import { ContestsRoute } from './routes/ContestsRoute.js'
import { ScoreboardRoute } from './routes/ScoreboardRoute.js'
import { ContestDashboardRoute } from './routes/ContestDashboardRoute.js'
import { SubmissionsRoute } from './routes/SubmissionsRoute.js'
import { ProfileRoute } from './routes/ProfileRoute.js'
import { ForumRoute } from './routes/ForumRoute.js'
import { CategoryRoute } from './routes/CategoryRoute.js'
import { BlogRoute } from './routes/BlogRoute.js'
import { SignInRoute } from './routes/SignInRoute.js'
import { RegisterRoute } from './routes/RegisterRoute.js'
import { ProblemsAdminRoute } from './routes/ProblemsAdminRoute.js'
import { ContestsAdminRoute } from './routes/ContestsAdminRoute.js'
import { TermsRoute } from './routes/TermsRoute.js'
import { InfoMessageRoute } from './routes/InfoMessageRoute.js'
import { NotificationsRoute } from './routes/NotificationsRoute.js'
import { NotFoundRoute } from './routes/NotFoundRoute.js'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const w = (el: ReactNode) => <Layout>{el}</Layout>

// Paths mirror the legacy Angular router so existing links keep resolving.
const router = createBrowserRouter([
  { path: '/', element: w(<HomeRoute />) },
  { path: '/problemset', element: <Navigate to="/problemset/page/1" replace /> },
  { path: '/problemset/page/:page', element: w(<ProblemsetRoute />) },
  { path: '/problemset/tag/:tag/page/:page', element: w(<ProblemsetRoute />) },
  { path: '/problem/:slug', element: w(<ProblemRoute />) },
  { path: '/contests', element: w(<ContestsRoute />) },
  { path: '/contest/:slug/dashboard', element: w(<ContestDashboardRoute />) },
  { path: '/contest/:slug/scoreboard', element: <Navigate to="scoreboard/page/1" replace /> },
  { path: '/contest/:slug/scoreboard/page/:page', element: w(<ScoreboardRoute />) },
  { path: '/leaderboard', element: <Navigate to="/leaderboard/page/1" replace /> },
  { path: '/leaderboard/page/:page', element: w(<LeaderboardRoute />) },
  { path: '/submissions', element: <Navigate to="/submissions/page/1" replace /> },
  { path: '/submissions/page/:page', element: w(<SubmissionsRoute />) },
  { path: '/profile/:username', element: w(<ProfileRoute />) },
  { path: '/forum', element: w(<ForumRoute />) },
  { path: '/problems/dashboard', element: <Navigate to="/problems/dashboard/page/1" replace /> },
  { path: '/problems/dashboard/page/:page', element: w(<ProblemsAdminRoute />) },
  { path: '/contests/dashboard', element: w(<ContestsAdminRoute />) },
  { path: '/forum/:category/page/:page', element: w(<CategoryRoute />) },
  { path: '/blog/:id', element: w(<BlogRoute />) },
  { path: '/login', element: w(<SignInRoute />) },
  { path: '/register', element: w(<RegisterRoute />) },
  { path: '/register/:token', element: w(<RegisterRoute />) },
  { path: '/terms', element: w(<TermsRoute />) },
  { path: '/notifications', element: w(<NotificationsRoute />) },
  { path: '/validate/:email/:hash/:token', element: w(<InfoMessageRoute />) },
  { path: '/changepassword/:email/:hash', element: w(<InfoMessageRoute />) },
  { path: '/:type', element: w(<InfoMessageRoute />) },
  { path: '*', element: w(<NotFoundRoute />) },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" dir="rtl" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
