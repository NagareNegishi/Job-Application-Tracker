import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import AdminPage from "./pages/AdminPage"
import { silentRefresh } from "./lib/api"
import JobDetailPage from "./pages/JobDetailPage"
import JobPage from "./pages/JobPage"
import CheckEmailPage from "./pages/CheckEmailPage"
import ConfirmEmailPage from "./pages/ConfirmEmailPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import SettingsPage from "./pages/SettingsPage"

function App() {
  // the gate. React re-renders when state changes
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    silentRefresh().finally(() => setInitialized(true))
  }, []) // empty dependency array means "run once after first render" -> "on mount"

  // Load animation until the refresh attempt settles
  if (!initialized) return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/jobs" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/jobs" element={<ProtectedRoute><JobPage /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
    </Routes>
  )
}

export default App
