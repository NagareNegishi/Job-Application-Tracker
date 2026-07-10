// Perceptually uniform 0–100 score → colour using OKLCH.
// L and C are fixed so brightness and saturation stay constant across the range.
export function scoreColor(value: number): string {
  const hue = 25 + (value / 100) * 120
  return `oklch(62% 0.18 ${hue})`
}
