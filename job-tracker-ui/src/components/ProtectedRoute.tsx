import { getToken } from "@/lib/auth"
import { Navigate } from "react-router"

/**
 * NOTE:
 * AccessToken lives in a JS module variable, it resets to null every time the browser loads the page.
 * The refresh token is safe in an httpOnly cookie.
 * So on refresh, we have a valid refresh token but no access token.
 * App.tsx needs to call /auth/refresh before React renders the routes,
 * otherwise ProtectedRoute sees null and immediately redirects to /login, even for a logged-in user.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) {
    // NOTE:
    // replace on the Navigate, shorthand for replace={true}
    // without it, React Router pushes /login onto history.
    // So the stack becomes something like [/home, /jobs, /login].
    // When the user hits the back button, they go to /jobs, which redirects them to /login again
    // replace swaps out the current history entry rather than adding a new one,
    // so the stack goes from [/home, /jobs] to [/home, /login]
    return <Navigate to="/login" replace />
  }
  // renders children if present
  return children
}
