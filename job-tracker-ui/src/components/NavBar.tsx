import UserMenu from "@/components/UserMenu"
import { Link, NavLink } from "react-router"
import { hasRole } from "@/lib/auth"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"
import type { ColorTheme } from "@/hooks/useTheme"
import { usePreferences } from "@/hooks/preferencesQuery"
import { useEffect } from "react"

// Thin layout shell — branding on the left, user menu on the right.
// Account actions live in UserMenu to keep this component focused on layout.
export default function NavBar() {
  const { theme, toggleTheme, setColorTheme } = useTheme()
  const { data: prefs } = usePreferences()

  useEffect(() => {
    if (prefs === undefined) return
    // prefs.theme is null for users with no saved theme, treat as "default"
    setColorTheme((prefs.theme ?? "default") as ColorTheme)
  }, [prefs?.theme])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors duration-150 hover:text-foreground hover:underline underline-offset-4 ${
      isActive ? "text-foreground font-medium" : "text-muted-foreground"
    }`

  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
      {/* Links group */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Logo -> home; replace span with <img src="/logo.svg" alt="Job Application Tracker" className="h-7" /> when logo is ready */}
        <Link to="/jobs" className="flex items-center">
          <span className="font-semibold text-foreground">Job Application Tracker</span>
        </Link>
        <span className="h-4 w-px bg-border" />
        <NavLink to="/jobs" className={navLinkClass}>
          Applications
        </NavLink>
        <NavLink to="/dashboard" className={navLinkClass}>
          Analytics
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          Profile
        </NavLink>
        {/* Admin link — only rendered for users with the Admin role */}
        {hasRole("Admin") && (
          <NavLink to="/admin" className={navLinkClass}>
            Admin
          </NavLink>
        )}
      </div>
      {/* Action group */}
      <div className="flex items-center gap-2">
        {/* Moon switch to dark, Sun switch to light */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <UserMenu />
      </div>
    </div>
  )
}
