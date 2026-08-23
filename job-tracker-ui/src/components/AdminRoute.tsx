import { getToken, hasRole } from "@/lib/auth"
import { Navigate } from "react-router"

// Guards routes that require the Admin role.
// Redirects to /login if unauthenticated, /jobs if authenticated but not an admin.
// Intentionally silent, no error shown so non-admins can't infer the page exists.
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  if (!hasRole("Admin")) return <Navigate to="/jobs" replace />
  return children
}
