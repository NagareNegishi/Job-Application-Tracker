import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { logout } from "@/services/authService"
import { getEmail } from "@/lib/auth"
import { User } from "lucide-react"
import { useNavigate, useLocation } from "react-router"

// User icon + dropdown menu in the top-right corner of the app.
// Handles its own open/close state so NavBar stays a thin layout shell.
// Add future account actions (profile picture, notifications, etc.) here, not in NavBar.
export default function UserMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  // Controlled open state — Radix Popover stays open on inside clicks by default,
  // so we manage it manually to close on menu item selection
  const [open, setOpen] = useState(false)
  // Email decoded from the in-memory JWT payload — no extra API call needed
  const email = getEmail()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* asChild passes trigger props to Button instead of adding an extra DOM element */}
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      {/* align="end" anchors the dropdown to the right edge of the trigger */}
      <PopoverContent align="end" className="w-56 p-0">
        {/* Username section */}
        <div className="px-4 py-3 border-b">
          {/* truncate prevents long emails from breaking the layout */}
          <p className="text-sm font-medium truncate">{email}</p>
        </div>
        {/* Settings — navigates to /settings page */}
        <div className="py-1">
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-accent"
            onClick={() => { setOpen(false); navigate("/settings", { state: { from: location.pathname } }) }}
          >
            Settings
          </button>
        </div>
        {/* Sign out — revokes refresh token on server, clears local token, redirects to login */}
        <div className="border-t py-1">
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-accent"
            onClick={async () => {
              setOpen(false)
              await logout()
              navigate("/login")
            }}
          >
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
