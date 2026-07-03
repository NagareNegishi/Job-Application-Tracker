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
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          // Labels are "Mon DD 'YY" (Thursday-based). Parse day → ordinal week of month.
          title: (items) => {
            const label = chartData.labels?.[items[0].dataIndex] as string | undefined
            if (!label) return ""
            const [month, dayStr] = label.split(" ")
            return `Week ${Math.ceil(parseInt(dayStr) / 7)} ${month}`
          },
        },
      },
    },
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
          // All: label every tick with month+year
          : {
              callback: (_, index) => {
                const label = chartData.labels?.[index] as string | undefined
                if (!label) return ""
                return `${label.slice(0, 3)} '${label.slice(-2)}`
              },
            },
      },
      y: { min: 0, ticks: { stepSize: 1 }, grid: { display: false } },
    },
  }), [scope, chartData])

  return (
    <div className="bg-card rounded-lg shadow-sm p-5 col-span-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">Applications Submitted per Week</p>
        <div className="flex gap-1">
          {(Object.keys(SCOPE_LABELS) as Scope[]).map(s => (
            <button
              key={s}
              onClick={() => onScopeChange(s)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                scope === s
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
