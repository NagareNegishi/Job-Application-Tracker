import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'flag-icons/css/flag-icons.min.css'

// TanStack Query Setup, it requires to wrap the app with QueryClientProvider
// https://tanstack.com/query/v5/docs/framework/react/quick-start
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// React Router Setup, it requires to wrap the app with BrowserRouter
// https://reactrouter.com/start/declarative/installation
import { BrowserRouter } from "react-router"

// Create a client
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
