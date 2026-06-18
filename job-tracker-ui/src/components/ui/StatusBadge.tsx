/**
 * StatusBadge component to display job status with appropriate styling
 */
import { Badge } from "@/components/ui/badge"
import { formatEnumLabel } from "@/types/enums"
import type { JobStatus } from "@/types/enums"

const statusStyles: Record<JobStatus, string> = {
  Wishlist: [
    "bg-slate-100 text-slate-700 border border-slate-300",
    "dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  ].join(" "),
  Applied: [
    "bg-blue-100 text-blue-700 border border-blue-300",
    "dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800",
  ].join(" "),
  Screening: [
    "bg-yellow-100 text-yellow-700 border border-yellow-300",
    "dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800",
  ].join(" "),
  Interview: [
    "bg-purple-100 text-purple-700 border border-purple-300",
    "dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800",
  ].join(" "),
  Offered: [
    "bg-green-100 text-green-700 border border-green-300",
    "dark:bg-green-900/50 dark:text-green-400 dark:border-green-800",
  ].join(" "),
  Rejected: [
    "bg-red-100 text-red-700 border border-red-300",
    "dark:bg-red-900/50 dark:text-red-400 dark:border-red-800",
  ].join(" "),
  NoResponse: [
    "bg-orange-100 text-orange-700 border border-orange-300",
    "dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800",
  ].join(" "),
}

export function StatusBadge({ status, className = "" }: { status: JobStatus; className?: string }) {
  return (
    <Badge className={`${statusStyles[status]} ${className}`}>
      {formatEnumLabel(status)}
    </Badge>
  )
}