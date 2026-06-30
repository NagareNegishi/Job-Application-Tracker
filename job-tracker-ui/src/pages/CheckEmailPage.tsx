import AuthBrand from "@/components/AuthBrand"
import { Button } from "@/components/ui/button"
import { resendConfirmation } from "@/services/authService"
import { useState, useEffect } from "react"
import { useLocation } from "react-router"

const COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

export default function CheckEmailPage() {
  const email = (useLocation().state as { email?: string } | null)?.email

  // Cooldown starts immediately — email was just sent by register
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + COOLDOWN_MS)
  const [, rerender] = useState(0)
  const [sent, setSent] = useState(false)

  // Re-render exactly when cooldown expires so button re-enables itself
  useEffect(() => {
    const remaining = cooldownUntil - Date.now()
    if (remaining <= 0) return
    const timer = setTimeout(() => rerender(n => n + 1), remaining)
    return () => clearTimeout(timer)
  }, [cooldownUntil])

  const isCoolingDown = Date.now() < cooldownUntil

  async function handleResend() {
    if (!email || isCoolingDown) return
    await resendConfirmation(email).catch(() => {})
    setCooldownUntil(Date.now() + COOLDOWN_MS)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 text-center">
        <AuthBrand />
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <strong>{email ?? "your email"}</strong>.
          Click the link to activate your account.
        </p>
        <p className="text-sm text-muted-foreground">
          Can't find it? Check your spam folder.
        </p>

        {sent && (
          <p className="text-sm text-green-600">We've sent another verification email.</p>
        )}

        <Button onClick={handleResend} disabled={isCoolingDown} variant="outline" className="w-full">
          {isCoolingDown ? "Resend available shortly..." : "Resend verification email"}
        </Button>
      </div>
    </div>
  )
}
