import { Badge } from "@/components/ui/badge"
import type { JobStatus } from "@/types/enums"

const statusStyles: Record<JobStatus, string> = {
  Wishlist:   "bg-slate-100 text-slate-700",
  Applied:    "bg-blue-100 text-blue-700",
  Screening:  "bg-yellow-100 text-yellow-700",
  Interview:  "bg-purple-100 text-purple-700",
  Offered:    "bg-green-100 text-green-700",
  Rejected:   "bg-red-100 text-red-700",
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      {status}
    </Badge>
  )
}