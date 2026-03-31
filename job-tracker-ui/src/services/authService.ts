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

// Calls the authenticated account endpoint — JWT attached automatically by apiFetch
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string
): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/account/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
  })
  return handleEmptyResponse(response)
}

// Always clear local token even if server is unreachable
export async function logout(): Promise<void> {
  await apiFetch(`${BASE_URL}/auth/logout`, { method: "POST" }).catch(() => {})
  clearToken()
}

// Token comes from the email link — GET with query params, no body
export async function confirmEmail(userId: string, token: string): Promise<void> {
  const url = `${BASE_URL}/auth/confirm-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  const response = await apiFetch(url, { method: "GET" })
  return handleEmptyResponse(response)
}

// Always returns 200 — backend never reveals whether the email exists
export async function forgotPassword(email: string): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  return handleEmptyResponse(response)
}

// Token and email come from the reset link query params — Identity validates the token server-side
export async function resetPassword(email: string, token: string, newPassword: string): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, newPassword }),
  })
  return handleEmptyResponse(response)
}

// Backend always returns 200 regardless — caller never needs to handle errors
export async function resendConfirmation(email: string): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/auth/resend-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  return handleEmptyResponse(response)
}
