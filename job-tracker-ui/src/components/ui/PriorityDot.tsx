/**
 * PriorityDot component to display a colored dot based on job priority
 */
import type { Priority } from "@/types/enums"

const priorityColors: Record<Priority, string> = {
  Low:    "bg-slate-400 dark:bg-slate-300",
  Medium: "bg-yellow-400",
  High:   "bg-orange-400",
  Urgent: "bg-red-500",
}

export function PriorityDot({ priority, dotSize = "w-2 h-2", className = "" }: {
  priority: Priority
  dotSize?: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className={`${dotSize} rounded-full ${priorityColors[priority]}`} />
      <span className="text-sm font-medium uppercase tracking-wide">{priority}</span>
    </div>
  )
}