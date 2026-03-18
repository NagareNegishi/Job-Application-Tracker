import { apiFetch, handleResponse } from "@/lib/api"
import { setToken } from "@/lib/auth"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// stores accessToken, cookie set by server
export async function login(email: string, password: string): Promise<void> {
  // Authorization header is just omitted, apiFetch handles it
  const response = await apiFetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await handleResponse<{ accessToken: string }>(response)
  setToken(data.accessToken)
}
