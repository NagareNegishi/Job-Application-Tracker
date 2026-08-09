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

function postAnalysis<T>(endpoint: string, request: AnalysisRequest): Promise<T> {
  return apiFetch(`${BASE_URL}/analyse/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }).then(handleResponse<T>)
}

export function analyseAlignment(request: AnalysisRequest): Promise<AlignmentResult> {
  return postAnalysis<AlignmentResult>("alignment", request)
}

export function analyseSkills(request: AnalysisRequest): Promise<SkillsResult> {
  return postAnalysis<SkillsResult>("skills", request)
}

export function analyseGaps(request: AnalysisRequest): Promise<GapsResult> {
  return postAnalysis<GapsResult>("gaps", request)
}

export function analyseQuestionsToAsk(request: AnalysisRequest): Promise<QuestionsResult> {
  return postAnalysis<QuestionsResult>("questions-to-ask", request)
}

export function analyseInterviewQuestions(request: AnalysisRequest): Promise<QuestionsResult> {
  return postAnalysis<QuestionsResult>("interview-questions", request)
}
