import AuthBrand from "@/components/AuthBrand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { resetPassword } from "@/services/authService"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

export default function ResetPasswordPage() {
  // email is safe to read via useSearchParams — no special chars
  const [searchParams] = useSearchParams()
  const email = searchParams.get("email") ?? ""
  // Token contains + chars — parse raw to avoid URLSearchParams corrupting them
  const rawToken = /[?&]token=([^&]*)/.exec(window.location.search)?.[1]
  const token = rawToken ? decodeURIComponent(rawToken) : ""

  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Guard: malformed link — missing token or email
  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <AuthBrand />
          <div className="space-y-4 text-center mt-10">
          <h1 className="text-2xl font-semibold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            Try requesting a new link from the{" "}
            <Link to="/forgot-password" className="underline">forgot password page</Link>.
          </p>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email, token, newPassword)
      navigate("/login")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />
        <form onSubmit={handleSubmit} className="w-full space-y-4 mt-10">
        <h1 className="text-2xl font-semibold">Set new password</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-1">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </Button>
        </form>
      </div>
    </div>
  )
}
