import { Link } from "react-router"

// Shared brand block for all auth pages — swap span for <img> when logo is ready
export default function AuthBrand() {
  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      {/* Replace span with <img src="/logo.svg" alt="Job Application Tracker" className="h-12" /> when logo is ready */}
      <Link to="/login" className="text-2xl font-semibold text-foreground hover:text-muted-foreground">
        Job Application Tracker
      </Link>
    </div>
  )
}
