import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { HomeRoute } from './routes/HomeRoute.js'

const queryClient = new QueryClient()

// Routes are added here as feature slices land. Paths mirror the legacy Angular
// router exactly so existing links and search results keep resolving.
const router = createBrowserRouter([{ path: '/', element: <HomeRoute /> }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" dir="rtl" />
    </QueryClientProvider>
  </StrictMode>,
)
