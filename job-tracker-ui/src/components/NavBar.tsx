import { Button } from "@/components/ui/button"
import { logout } from "@/services/authService"
import { useNavigate } from "react-router"

export default function NavBar() {
  const navigate = useNavigate()

  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
      <span className="font-semibold text-foreground">Job Tracker</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await logout()
          navigate("/login")
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
