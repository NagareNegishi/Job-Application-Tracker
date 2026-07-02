// Stat card showing what share of applications received any reply.

interface Props {
  responseRate: number
}

// Standard linear interpolation between two scalar values.
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

// Two-leg RGB interpolation: red→amber for 0–50%, amber→emerald for 50–100%.
// Direct red→green hue rotation produces a muddy yellow-green at the midpoint.
function rateColor(rate: number): string {
  const red     = [239, 68,  68]   // red-500
  const amber   = [245, 158, 11]   // amber-500
  const emerald = [16,  185, 129]  // emerald-500

  const [r1, g1, b1] = rate <= 50 ? red : amber
  const [r2, g2, b2] = rate <= 50 ? amber : emerald
  const t = rate <= 50 ? rate / 50 : (rate - 50) / 50  // normalise t to [0,1] per leg

  return `rgb(${lerp(r1, r2, t)}, ${lerp(g1, g2, t)}, ${lerp(b1, b2, t)})`
}

export function ResponseRateCard({ responseRate }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-5">
      <p className="text-sm text-muted-foreground mb-1 text-center">Response Rate</p>
      <div className="flex items-end gap-2">
        <p className="text-4xl font-bold" style={{ color: rateColor(responseRate) }}>{responseRate}%</p>
        <p className="text-xs text-muted-foreground mb-1">of applications received a reply</p>
      </div>
    </div>
  )
}
