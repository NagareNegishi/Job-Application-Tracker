import { apiFetch, handleEmptyResponse, handleResponse } from "@/lib/api"
import { clearToken, setToken } from "@/lib/auth"

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

// no token handling — server just creates the user
export async function register(email: string, password: string): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return handleEmptyResponse(response)
}

// No credentials needed — server issues tokens for the demo account directly
export async function loginDemo(): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/auth/demo`, { method: "POST" })
  const data = await handleResponse<{ accessToken: string }>(response)
  setToken(data.accessToken)
}

// Always clear local token even if server is unreachable
export async function logout(): Promise<void> {
  await apiFetch(`${BASE_URL}/auth/logout`, { method: "POST" }).catch(() => {})
  clearToken()
}
