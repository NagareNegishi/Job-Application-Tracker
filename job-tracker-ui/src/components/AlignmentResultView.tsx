import type { AlignmentResult } from "@/services/analysisService"

export function AlignmentResultView({ result }: { result: AlignmentResult }) {
  return (
    <>
      <p className="font-medium">Alignment score: {result.score} / 5</p>
      <p>{result.reasoning}</p>
      {result.concern && <p className="text-amber-600 dark:text-amber-400">{result.concern}</p>}
    </>
  )
}
