import { DesktopDownloadPrompt } from "@/components/DesktopDownloadPrompt"
import NavBar from "@/components/NavBar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePreferences, useUpdatePreferences } from "@/hooks/preferencesQuery"
import { useTheme } from "@/hooks/useTheme"
import type { ColorTheme } from "@/hooks/useTheme"
import { ApiError } from "@/lib/api"
import { hasRole } from "@/lib/auth"
import { changePassword } from "@/services/authService"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router"

const THEME_OPTIONS: { value: ColorTheme; label: string; color: string }[] = [
  { value: "default", label: "Default", color: "bg-slate-400" },
  { value: "blue",    label: "Blue",    color: "bg-blue-600" },
  { value: "red",     label: "Red",     color: "bg-red-600" },
  { value: "yellow",  label: "Yellow",  color: "bg-yellow-500" },
  { value: "pink",    label: "Pink",    color: "bg-pink-500" },
]

// Settings page — authenticated account management.
// Currently holds change password only; add new sections here as features grow (e.g. email, notifications).
export default function SettingsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // Use the path UserMenu passed via router state; fall back to /jobs on direct URL load
  const from: string = location.state?.from ?? "/jobs"

  const { data: prefs, isLoading: isLoadingPrefs } = usePreferences()
  const { mutate: mutatePrefs } = useUpdatePreferences()
  const { colorTheme, setColorTheme } = useTheme()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Check match client-side first — avoids a round-trip for a simple validation
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword, confirmNewPassword)
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (err) {
      // 403 = demo user; all other ApiErrors surface Identity's message directly
      setError(err instanceof ApiError ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ← arrow is a plain unicode char — no icon dep needed */}
        <button
          onClick={() => navigate(from)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          ← Back
        </button>
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h1 className="text-xl font-semibold mb-6">Settings</h1>
          <section>
            <h2 className="text-sm font-medium text-muted-foreground border-l-2 border-primary pl-2 mb-4">Change Password</h2>
            <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">Password changed successfully.</p>}
              <div className="space-y-1">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input id="currentPassword" type="password" value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" type="password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <Input id="confirmNewPassword" type="password" value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Change password"}
              </Button>
            </form>
          </section>

          <section className="mt-6 pt-6 border-t">
            <h2 className="text-sm font-medium text-muted-foreground border-l-2 border-primary pl-2 mb-4">Appearance</h2>
            {isLoadingPrefs ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="flex gap-3">
                {THEME_OPTIONS.map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setColorTheme(value)
                      mutatePrefs({ ...prefs!, theme: value })
                    }}
                    aria-label={label}
                    title={label}
                    className={`w-7 h-7 rounded-full ${color} transition-all ${
                      colorTheme === value
                        ? "ring-2 ring-offset-2 ring-foreground"
                        : "hover:ring-2 hover:ring-offset-2 hover:ring-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}
          </section>

          {hasRole("AiUser") && (
            <section className="mt-6 pt-6 border-t">
              <h2 className="text-sm font-medium text-muted-foreground border-l-2 border-primary pl-2 mb-4">AI Features</h2>
              {isLoadingPrefs ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="autoFill"
                    checked={prefs?.autoFillEnabled ?? true}
                    onCheckedChange={checked =>
                      mutatePrefs({ ...prefs!, autoFillEnabled: checked === true })
                    }
                  />
                  <Label htmlFor="autoFill">Show auto-fill dialog when adding a job</Label>
                </div>
              )}
            </section>
          )}

          <section className="mt-6 pt-6 border-t">
            <h2 className="text-sm font-medium text-muted-foreground border-l-2 border-primary pl-2 mb-4">Desktop App</h2>
            <div className="max-w-sm">
              <DesktopDownloadPrompt />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
