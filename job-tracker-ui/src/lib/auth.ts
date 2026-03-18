// In-memory access token storage.
// The refresh token is stored as an httpOnly cookie by the server — never accessible here.
// On page refresh this resets to null; apiFetch restores it via a silent /auth/refresh call.

let accessToken: string | null = null

export function getToken(): string | null {
  return accessToken
}

export function setToken(token: string): void {
  accessToken = token
}

export function clearToken(): void {
  accessToken = null
}
