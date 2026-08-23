import AuthBrand from "@/components/AuthBrand"
import { confirmEmail } from "@/services/authService"
import { ApiError } from "@/lib/api"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

export default function ConfirmEmailPage() {
  // useSearchParams reads ?userId=...&token=... from the URL — reactive, no manual URL parsing
  const [searchParams] = useSearchParams()
  const userId = searchParams.get("userId")
  // Identity tokens contain + chars (base64). URLSearchParams treats raw '+' as space
  // (HTML form-encoding convention), corrupting the token when clicked from a terminal.
  // Parse the raw query string with decodeURIComponent instead, which handles both
  // %2B and raw + correctly as a literal plus sign.
  const rawToken = /[?&]token=([^&]*)/.exec(window.location.search)?.[1]
  const token = rawToken ? decodeURIComponent(rawToken) : null
  // Derived from the URL, not state — avoids a setState-in-effect flash for the guard case
  const isMalformed = !userId || !token

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isMalformed) return

    // .then/.catch, not await — effects can't be async directly
    confirmEmail(userId, token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong.")
        setStatus("error")
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />
        <div className="space-y-4 text-center mt-10">
        {!isMalformed && status === "loading" && (
          <p className="text-sm text-muted-foreground">Verifying your email...</p>
        )}

        {!isMalformed && status === "success" && (
          <>
            <h1 className="text-2xl font-semibold">Email verified</h1>
            <p className="text-sm text-muted-foreground">
              Your account is active. You can now sign in.
            </p>
            <Link to="/login" className="text-sm underline">Go to sign in</Link>
          </>
        )}

        {(isMalformed || status === "error") && (
          <>
            <h1 className="text-2xl font-semibold">Verification failed</h1>
            <p className="text-sm text-red-600">{isMalformed ? "Invalid confirmation link." : errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Try requesting a new link from the{" "}
              <Link to="/login" className="underline">sign in page</Link>.
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
