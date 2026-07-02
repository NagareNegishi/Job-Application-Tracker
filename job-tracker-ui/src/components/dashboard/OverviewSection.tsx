import type { SummaryResult } from "@/utils/dashboardUtils"
import { SummaryBar } from "./SummaryBar"
import { ResponseRateCard } from "./ResponseRateCard"

interface Props {
  summary: SummaryResult
  responseRate: number
}

export function OverviewSection({ summary, responseRate }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
        Overview
      </h2>
      <div className="flex flex-col gap-4">
        <SummaryBar summary={summary} />
        <div className="self-start">
          <ResponseRateCard responseRate={responseRate} />
        </div>
      </div>
    </div>
  )
}
