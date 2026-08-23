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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-3">
          <SummaryBar summary={summary} />
        </div>
        <ResponseRateCard responseRate={responseRate} />
      </div>
    </div>
  )
}
