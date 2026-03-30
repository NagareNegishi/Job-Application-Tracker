import UserMenu from "@/components/UserMenu"

// Thin layout shell — branding on the left, user menu on the right.
// Account actions live in UserMenu to keep this component focused on layout.
export default function NavBar() {
  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
      <span className="font-semibold text-foreground">Job Tracker</span>
      <UserMenu />
    </div>
  )
}
