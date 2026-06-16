import UserMenu from "@/components/UserMenu"
import { Link } from "react-router"
import { hasRole } from "@/lib/auth"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"

// Thin layout shell — branding on the left, user menu on the right.
// Account actions live in UserMenu to keep this component focused on layout.
export default function NavBar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
      {/* Logo link — universal convention: clicking the brand name goes home */}
      <Link to="/jobs" className="font-semibold text-foreground hover:text-muted-foreground">
        Job Tracker
      </Link>
      {/* Admin link — only rendered for users with the Admin role */}
      {hasRole("Admin") && (
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          Admin
        </Link>
      )}
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
