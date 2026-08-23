import { Loader2 } from "lucide-react"
import { lazy, Suspense, useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import { silentRefresh } from "./lib/api"
// Eager: initial landing routes (/jobs for authed users, /login for guests) — needed on first paint.
import JobPage from "./pages/JobPage"
import LoginPage from "./pages/LoginPage"

// Lazy: non-landing routes are code-split into their own chunks, kept out of the initial bundle.
const AdminPage = lazy(() => import("./pages/AdminPage"))
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"))
const CheckEmailPage = lazy(() => import("./pages/CheckEmailPage"))
const ConfirmEmailPage = lazy(() => import("./pages/ConfirmEmailPage"))
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"))
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"))
const RegisterPage = lazy(() => import("./pages/RegisterPage"))
const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const MaintenancePage = lazy(() => import("./pages/MaintenancePage"))

// Full-screen centered spinner — shared by the init gate and the lazy-route Suspense fallback.
function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function App() {
  // the gate. React re-renders when state changes
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    silentRefresh().finally(() => setInitialized(true))
  }, []) // empty dependency array means "run once after first render" -> "on mount"

  // Load animation until the refresh attempt settles
  if (!initialized) return <FullScreenSpinner />

  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/jobs" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/jobs" element={<ProtectedRoute><JobPage /></ProtectedRoute>} />
        <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Routes>
    </Suspense>
  )
}

export default App
