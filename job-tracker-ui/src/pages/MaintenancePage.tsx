// Maintenance page — shown when the DB is down during the scheduled window.
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// /health lives at the backend root, not under /api — strip the trailing /api segment.
const HEALTH_URL = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/api$/, "") + "/health"
const POLL_MS = 30_000

export default function MaintenancePage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)

  // Plain fetch — apiFetch would loop (503 → redirect here → poll → 503 → …).
  const check = useCallback(async () => {
    try {
      const res = await fetch(HEALTH_URL)
      if (res.ok) navigate("/")
    } catch { /* network error — still down, next poll will retry */ }
  }, [navigate])

  useEffect(() => {
    const id = setInterval(check, POLL_MS)
    return () => clearInterval(id)
  }, [check])

  async function handleRetry() {
    setChecking(true)
    await check()
    setChecking(false)
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center max-w-md space-y-3">
        <h1 className="text-xl font-semibold">Down for maintenance</h1>
        <p className="text-sm text-muted-foreground">
          The app is offline for scheduled maintenance (8 PM – 7 AM New Zealand time).
          It will come back online automatically.
        </p>
        <p className="text-xs text-muted-foreground">Checking every 30 seconds…</p>
      </div>
      <Button onClick={handleRetry} disabled={checking}>
        {checking && <Loader2 className="h-4 w-4 animate-spin" />}
        Try again
      </Button>
    </div>
  )
}
