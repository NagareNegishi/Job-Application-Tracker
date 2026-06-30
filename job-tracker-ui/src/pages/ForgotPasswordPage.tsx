import AuthBrand from "@/components/AuthBrand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword } from "@/services/authService"
import { useState } from "react"
import { Link } from "react-router"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Fire and forget — backend always returns 200, no error handling needed
    await forgotPassword(email).catch(() => {})
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <AuthBrand />
          <div className="space-y-4 text-center mt-10">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
          </p>
          <p className="text-sm text-muted-foreground">Can't find it? Check your spam folder.</p>
          <Link to="/login" className="text-sm underline">Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />
        <form onSubmit={handleSubmit} className="w-full space-y-4 mt-10">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>

        <p className="text-sm text-center">
          <Link to="/login" className="underline">Back to sign in</Link>
        </p>
        </form>
      </div>
    </div>
  )
}
