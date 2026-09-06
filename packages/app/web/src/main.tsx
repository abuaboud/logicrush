import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { Layout } from './components/Layout.js'
import { HomeRoute } from './routes/HomeRoute.js'
import { ProblemsetRoute } from './routes/ProblemsetRoute.js'
import { ProblemRoute } from './routes/ProblemRoute.js'
import { LeaderboardRoute } from './routes/LeaderboardRoute.js'
import { ContestsRoute } from './routes/ContestsRoute.js'
import { ForumRoute } from './routes/ForumRoute.js'
import { NotFoundRoute } from './routes/NotFoundRoute.js'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrap(el: React.ReactNode) {
  return <Layout>{el}</Layout>
}

// Paths mirror the legacy Angular router so existing links and search results
// keep resolving. Bare forms redirect to their paginated canonical form.
const router = createBrowserRouter([
  { path: '/', element: wrap(<HomeRoute />) },
  { path: '/problemset', element: <Navigate to="/problemset/page/1" replace /> },
  { path: '/problemset/page/:page', element: wrap(<ProblemsetRoute />) },
  { path: '/problemset/tag/:tag/page/:page', element: wrap(<ProblemsetRoute />) },
  { path: '/problem/:slug', element: wrap(<ProblemRoute />) },
  { path: '/contests', element: wrap(<ContestsRoute />) },
  { path: '/leaderboard', element: <Navigate to="/leaderboard/page/1" replace /> },
  { path: '/leaderboard/page/:page', element: wrap(<LeaderboardRoute />) },
  { path: '/forum', element: wrap(<ForumRoute />) },
  { path: '*', element: wrap(<NotFoundRoute />) },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" dir="rtl" />
    </QueryClientProvider>
  </StrictMode>,
)
