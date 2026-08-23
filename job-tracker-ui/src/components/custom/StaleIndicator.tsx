import { Clock } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { staleDaysSince } from "@/utils/dashboardUtils"
import type { Job } from "@/types/job"

export function StaleIndicator({ job, thresholdDays = 14 }: { job: Job; thresholdDays?: number }) {
  const daysSince = staleDaysSince(job, thresholdDays)
  if (daysSince === null) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Clock className="size-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
        </TooltipTrigger>
        <TooltipContent className="flex-col items-start">
          <span>No status change in {daysSince} days.</span>
          <span>Consider following up.</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
