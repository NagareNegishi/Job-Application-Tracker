import type { SummaryResult } from "@/utils/dashboardUtils"

interface Props {
  summary: SummaryResult
}

export function SummaryBar({ summary }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg shadow-sm p-5 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">Active</p>
          <p className="text-4xl font-bold text-indigo-500">{summary.active}</p>
        </div>
        <div className="bg-card rounded-lg shadow-sm p-5 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">Offers</p>
          <p className="text-4xl font-bold text-green-500">{summary.won}</p>
        </div>
        <div className="bg-card rounded-lg shadow-sm p-5 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">Closed</p>
          <p className="text-4xl font-bold text-slate-400">{summary.closed}</p>
        </div>
    </div>
  )
}
