/**
 * PriorityDot component to display a colored dot based on job priority
 */
import type { Priority } from "@/types/enums"

const priorityColors: Record<Priority, string> = {
  Low:    "bg-slate-400",
  Medium: "bg-yellow-400",
  High:   "bg-orange-400",
  Urgent: "bg-red-500",
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${priorityColors[priority]}`} />
      <span className="text-sm font-medium uppercase tracking-wide">{priority}</span>
    </div>
  )
}