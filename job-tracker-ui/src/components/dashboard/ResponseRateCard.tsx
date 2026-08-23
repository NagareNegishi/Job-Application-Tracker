// Stat card showing what share of applications received any reply.
import { scoreColor } from "@/utils/scoreColor"

interface Props {
  responseRate: number
}

export function ResponseRateCard({ responseRate }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-5 text-center">
      <p className="text-sm font-medium text-muted-foreground mb-1">Response Rate</p>
      <p className="text-4xl font-bold" style={{ color: scoreColor(responseRate) }}>{responseRate}%</p>
    </div>
  )
}
