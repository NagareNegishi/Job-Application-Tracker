import { apiFetch, handleResponse } from "@/lib/api"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

export type AlignmentResult = {
  score: number
  reasoning: string
  concern: string | null
}

export type AnalysisRequest = {
  description: string
  role?: string
  company?: string
}

export async function analyseAlignment(request: AnalysisRequest): Promise<AlignmentResult> {
  const response = await apiFetch(`${BASE_URL}/analyse/alignment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  return handleResponse<AlignmentResult>(response)
}
