import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { login, loginDemo } from "@/services/authService"
import { useState } from "react"
import { Link, useNavigate } from "react-router"

// LoginPage calls login(), navigates to /jobs
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const navigate = useNavigate()

  async function handleDemo() {
    setError(null)
    setDemoLoading(true)
    try {
      await loginDemo()
      navigate("/jobs")
    } catch {
      setError("Demo login failed. Please try again.")
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
          await login(email, password)
          navigate("/jobs")
        } catch (err) {
          setError(
            err instanceof ApiError && err.status === 401
              ? "Invalid email or password"
              : err instanceof ApiError ? err.message : "Something went wrong"
          )
        } finally { // ensures loading resets
          setLoading(false)
        }
      }} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-background px-2">or</span>
          </div>
        </div>

        <Button type="button" variant="outline" className="w-full"
          onClick={handleDemo} disabled={loading || demoLoading}>
          {demoLoading ? "Loading demo..." : "Try Demo"}
        </Button>

        <p className="text-sm text-center">
          No account?{" "}
          <Link to="/register" className="underline">Register</Link>
        </p>
      </form>
    </div>
  )
}
