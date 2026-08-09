import { apiFetch, handleResponse } from "@/lib/api"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

export type AlignmentResult = {
  score: number
  reasoning: string
  concern: string | null
}

export type SkillsResult = {
  skills: string[]
}

export type GapItem = {
  gap: string
  advice: string
}

export type GapsResult = {
  gaps: GapItem[]
}

export type QuestionsResult = {
  questions: string[]
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

export async function analyseSkills(request: AnalysisRequest): Promise<SkillsResult> {
  const response = await apiFetch(`${BASE_URL}/analyse/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  return handleResponse<SkillsResult>(response)
}

export async function analyseGaps(request: AnalysisRequest): Promise<GapsResult> {
  const response = await apiFetch(`${BASE_URL}/analyse/gaps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  return handleResponse<GapsResult>(response)
}

export async function analyseQuestionsToAsk(request: AnalysisRequest): Promise<QuestionsResult> {
  const response = await apiFetch(`${BASE_URL}/analyse/questions-to-ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  return handleResponse<QuestionsResult>(response)
}
