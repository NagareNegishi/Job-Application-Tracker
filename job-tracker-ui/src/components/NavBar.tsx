import UserMenu from "@/components/UserMenu"
import { Link } from "react-router"

// Thin layout shell — branding on the left, user menu on the right.
// Account actions live in UserMenu to keep this component focused on layout.
export default function NavBar() {
  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
      {/* Logo link — universal convention: clicking the brand name goes home */}
      <Link to="/jobs" className="font-semibold text-foreground hover:text-muted-foreground">
        Job Tracker
      </Link>
      <UserMenu />
    </div>
  )
}
