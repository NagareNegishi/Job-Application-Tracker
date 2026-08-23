// Maintenance page — shown when the DB is down during the scheduled window.
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Loader2, MoonStar } from "lucide-react"
import { Button } from "@/components/ui/button"

// /health lives at the backend root, not under /api — strip the trailing /api segment.
const HEALTH_URL = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/api$/, "") + "/health"
const POLL_MS = 60_000

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
    <div className="min-h-screen bg-muted flex items-center justify-center px-6">
      <div className="bg-card rounded-2xl shadow-md p-10 max-w-md w-full flex flex-col items-center gap-6 text-center">
        <div className="bg-muted rounded-full p-4">
          <MoonStar className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Away for the night</h1>
          <p className="text-base text-muted-foreground">
            The app pauses during low-traffic hours{" "}
            <span className="whitespace-nowrap">(8 PM – 7 AM New Zealand time)</span>{" "}
            to reduce costs.
          </p>
          <p className="text-base text-muted-foreground">
            It restarts automatically each morning.
          </p>
          <p className="text-xs text-muted-foreground">Checking every minute…</p>
        </div>
        <Button onClick={handleRetry} disabled={checking}>
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          Try again
        </Button>
      </div>
    </div>
  )
}
