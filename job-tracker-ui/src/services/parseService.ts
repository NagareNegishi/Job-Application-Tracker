import { apiFetch, handleResponse } from "@/lib/api"
import type { WorkMode } from "@/types/enums"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Shape the backend returns from POST /api/jobs/parse.
// All fields optional — Claude omits fields it could not extract.
export type ParsedJobFields = {
  company?: string
  role?: string
  jobUrl?: string
  location?: string
  workMode?: WorkMode
  salaryMin?: number
  salaryMax?: number
  closedAt?: string  // YYYY-MM-DD
  source?: string
  description?: string
}

export async function parseListing(text: string): Promise<ParsedJobFields> {
  const response = await apiFetch(`${BASE_URL}/jobs/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  return handleResponse<ParsedJobFields>(response)
}
