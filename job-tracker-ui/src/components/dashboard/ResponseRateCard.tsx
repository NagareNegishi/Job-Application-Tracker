interface Props {
  responseRate: number
}

export function ResponseRateCard({ responseRate }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-5">
      <p className="text-sm text-muted-foreground mb-1 text-center">Response Rate</p>
      <div className="flex items-end gap-2">
        <p className="text-4xl font-bold text-indigo-500">{responseRate}%</p>
        <p className="text-xs text-muted-foreground mb-1">of applications received a reply</p>
      </div>
    </div>
  )
}
