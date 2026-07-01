interface Props {
  responseRate: number
}

export function ResponseRateCard({ responseRate }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-5 flex flex-col justify-between">
      <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
      <div>
        <p className="text-4xl font-bold text-indigo-500">{responseRate}%</p>
        <p className="text-xs text-muted-foreground mt-1">
          of applications received a reply
        </p>
      </div>
    </div>
  )
}
