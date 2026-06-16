/**
 * StatusBadge component to display job status with appropriate styling
 */
import { Badge } from "@/components/ui/badge"
import type { JobStatus } from "@/types/enums"

const statusStyles: Record<JobStatus, string> = {
  Wishlist: [
    "bg-slate-100 text-slate-700 border border-slate-300",
    "dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  ].join(" "),
  Applied: [
    "bg-blue-100 text-blue-700 border border-blue-300",
    "dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  ].join(" "),
  Screening: [
    "bg-yellow-100 text-yellow-700 border border-yellow-300",
    "dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700",
  ].join(" "),
  Interview: [
    "bg-purple-100 text-purple-700 border border-purple-300",
    "dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
  ].join(" "),
  Offered: [
    "bg-green-100 text-green-700 border border-green-300",
    "dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  ].join(" "),
  Rejected: [
    "bg-red-100 text-red-700 border border-red-300",
    "dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
  ].join(" "),
}

export function StatusBadge({ status, className = "" }: { status: JobStatus; className?: string }) {
  return (
    <Badge className={`${statusStyles[status]} ${className}`}>
      {status}
    </Badge>
  )
}