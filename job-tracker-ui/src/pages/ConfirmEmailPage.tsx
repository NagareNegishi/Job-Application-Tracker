import { confirmEmail } from "@/services/authService"
import { ApiError } from "@/lib/api"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

export default function ConfirmEmailPage() {
  // useSearchParams reads ?userId=...&token=... from the URL — reactive, no manual URL parsing
  const [searchParams] = useSearchParams()
  const userId = searchParams.get("userId")
  const token = searchParams.get("token")

  // Union type drives rendering — one state variable, three possible UIs
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Guard: missing params means the link was malformed — skip the API call
    if (!userId || !token) {
      setErrorMessage("Invalid confirmation link.")
      setStatus("error")
      return
    }

    // Call once on mount — empty dep array is intentional, params come from the URL and won't change
    // useEffect can't be async directly, so use .then/.catch instead of await
    confirmEmail(userId, token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong.")
        setStatus("error")
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 text-center">
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Verifying your email...</p>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-semibold">Email verified</h1>
            <p className="text-sm text-muted-foreground">
              Your account is active. You can now sign in.
            </p>
            <Link to="/login" className="text-sm underline">Go to sign in</Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold">Verification failed</h1>
            <p className="text-sm text-red-600">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Try requesting a new link from the{" "}
              <Link to="/login" className="underline">sign in page</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
