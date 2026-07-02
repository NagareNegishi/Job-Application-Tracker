import { useMemo, useState } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
} from "chart.js"
import NavBar from "@/components/NavBar"
import { useJobs } from "@/hooks/jobQuery"
import {
  classifyStatus,
  computeSummary,
  computeResponseRate,
  computeStatusFunnel,
  computeWeeklyApplications,
  computeStaleApplications,
} from "@/utils/dashboardUtils"
import { formatEnumLabel } from "@/types/enums"
import { OverviewSection } from "@/components/dashboard/OverviewSection"
import { StatusFunnelChart } from "@/components/dashboard/StatusFunnelChart"
import { WeeklyApplicationsChart, type Scope } from "@/components/dashboard/WeeklyApplicationsChart"
import { StaleApplicationsList } from "@/components/dashboard/StaleApplicationsList"

// Registers only the chart modules we use — Chart.js v4 is tree-shaken by default
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip)

// Status colours for the funnel chart — keyed by status group
const GROUP_COLOR: Record<string, string> = {
  active: "#6366f1", // indigo
  won:    "#22c55e", // green
  closed: "#94a3b8", // slate
}

export default function DashboardPage() {
  const { data: jobs } = useJobs()
  const [scope, setScope] = useState<Scope>("all")

  const { summary, responseRate, funnelChartData, weeklyChartData, staleJobs } =
    useMemo(() => {
      const all = jobs ?? []

      // Scope filter applies only to the weekly chart
      const now = new Date()
      const scoped =
        scope === "all"
          ? all
          : all.filter(job => {
              if (!job.appliedAt) return false
              const d = new Date(job.appliedAt)
              if (scope === "year") return d.getFullYear() === now.getFullYear()
              // "month"
              return (
                d.getFullYear() === now.getFullYear() &&
                d.getMonth() === now.getMonth()
              )
            })

      const funnel = computeStatusFunnel(all)
      const weekly = computeWeeklyApplications(scoped, scope === "month")

      return {
        summary:      computeSummary(all),
        responseRate: computeResponseRate(all),
        funnelChartData: {
          labels: funnel.map(e => formatEnumLabel(e.status)),
          datasets: [{
            data:            funnel.map(e => e.count),
            backgroundColor: funnel.map(e => GROUP_COLOR[classifyStatus(e.status)]),
            borderRadius:    4,
          }],
        },
        weeklyChartData: {
          labels: weekly.map(e => e.week),
          datasets: [{
            label:               "Applications",
            data:                weekly.map(e => e.count),
            borderColor:         "#6366f1",
            backgroundColor:     "#6366f133",
            tension:             0.3,
            fill:                true,
            pointBackgroundColor: "#6366f1",
          }],
        },
        staleJobs: computeStaleApplications(all, 21),
      }
    }, [jobs, scope])

  return (
    <div className="min-h-screen bg-muted">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <OverviewSection summary={summary} responseRate={responseRate} />
        <div className="grid grid-cols-2 gap-4">
          <StatusFunnelChart chartData={funnelChartData} />
          <WeeklyApplicationsChart
            chartData={weeklyChartData}
            scope={scope}
            onScopeChange={setScope}
          />
          <StaleApplicationsList jobs={staleJobs} />
        </div>
      </div>
    </div>
  )
}
