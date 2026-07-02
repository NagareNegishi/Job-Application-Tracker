import { useMemo } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip)

export type Scope = "all" | "year" | "month"

const SCOPE_LABELS: Record<Scope, string> = {
  all:   "All time",
  year:  "This year",
  month: "This month",
}

interface Props {
  chartData: ChartData<"line", number[], string>
  scope: Scope
  onScopeChange: (s: Scope) => void
}

export function WeeklyApplicationsChart({ chartData, scope, onScopeChange }: Props) {
  const options = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: scope === "month"
          // Month: "Week 1", "Week 2", … — full date appears in the hover tooltip
          ? { callback: (_, index) => `Week ${index + 1}` }
          : scope === "year"
          // Year: show month name only on the first week of each month; blank otherwise
          ? {
              autoSkip: false,
              callback: (_, index) => {
                const label     = chartData.labels?.[index] as string | undefined
                const prevLabel = chartData.labels?.[index - 1] as string | undefined
                if (!label) return ""
                const month = label.slice(0, 3)
                return month !== prevLabel?.slice(0, 3) ? month : ""
              },
            }
          : {},
      },
      y: { min: 0, ticks: { stepSize: 1 }, grid: { display: false } },
    },
  }), [scope, chartData])

  return (
    <div className="bg-card rounded-lg shadow-sm p-5 col-span-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">Applications per Week</p>
        <div className="flex gap-1">
          {(Object.keys(SCOPE_LABELS) as Scope[]).map(s => (
            <button
              key={s}
              onClick={() => onScopeChange(s)}
              className={`text-xs px-2 py-1 rounded ${
                scope === s
                  ? "bg-indigo-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
