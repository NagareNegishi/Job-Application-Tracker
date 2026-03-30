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

// Decode the JWT payload (middle section) to read the email claim.
// The payload is base64url-encoded JSON — readable by anyone, not encrypted.
export function getEmail(): string | null {
  if (!accessToken) return null
  try {
    // base64url swaps +→- and /→_ for URL safety; atob() needs them swapped back
    const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return payload.email ?? null
  } catch {
    return null
  }
}
