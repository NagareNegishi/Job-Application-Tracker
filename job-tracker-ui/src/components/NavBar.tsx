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

  // active page: full foreground + medium weight; inactive: muted until hovered
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm hover:text-foreground ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`

  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
      {/* Links group */}
      <div className="flex items-center gap-6">
        {/* Logo -> home */}
        <Link to="/jobs" className="font-semibold text-foreground hover:text-muted-foreground">
          Job Application Tracker
        </Link>
        <span className="h-4 w-px bg-border" />
        <NavLink to="/jobs" className={navLinkClass}>
          Applications
        </NavLink>
        <NavLink to="/dashboard" className={navLinkClass}>
          Analytics
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
