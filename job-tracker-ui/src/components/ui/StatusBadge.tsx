/**
 * StatusBadge component to display job status with appropriate styling
 */
import { Badge } from "@/components/ui/badge"
import type { JobStatus } from "@/types/enums"

const statusStyles: Record<JobStatus, string> = {
  Wishlist:   "bg-slate-100 text-slate-700 border border-slate-300",
  Applied:    "bg-blue-100 text-blue-700 border border-blue-300",
  Screening:  "bg-yellow-100 text-yellow-700 border border-yellow-300",
  Interview:  "bg-purple-100 text-purple-700 border border-purple-300",
  Offered:    "bg-green-100 text-green-700 border border-green-300",
  Rejected:   "bg-red-100 text-red-700 border border-red-300",
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      {status}
    </Badge>
  )
}