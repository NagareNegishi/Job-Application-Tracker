import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface Props {
  chartData: ChartData<"bar", number[], string>
}

const options: ChartOptions<"bar"> = {
  indexAxis: "y",
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { min: 0, ticks: { stepSize: 1 }, grid: { display: false } },
    y: { grid: { display: false } },
  },
}

export function StatusFunnelChart({ chartData }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-5">
      <p className="text-sm font-medium text-muted-foreground mb-3">Status Breakdown</p>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}
