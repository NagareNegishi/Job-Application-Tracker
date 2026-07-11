/**
 * This module provides utility functions for handling API responses and errors in the Job Tracker UI application.
 */
import { clearToken, getToken, setToken } from "@/lib/auth"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Holds an in-flight refresh call so concurrent 401s share one refresh instead of each triggering their own
let refreshPromise: Promise<string> | null = null

// Uses plain fetch (not apiFetch) to avoid infinite retry loop on refresh failure
export async function silentRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (res) => {
      // DB down during the scheduled window, route to the maintenance page instead of
      // throwing (which would strand the user on /login). Skip when already on /maintenance:
      // App.tsx runs silentRefresh on every mount, so redirecting there would reload-loop.
      if (
        res.status === 503 &&
        isMaintenanceWindow() &&
        window.location.pathname !== "/maintenance"
      ) {
        window.location.href = "/maintenance"
        throw new MaintenanceError()
      }
      if (!res.ok) throw new Error("Refresh failed")
      const data = await res.json()
      setToken(data.accessToken)
      return data.accessToken as string
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

const MAINTENANCE_WINDOW = { startHour: 20, endHour: 7, timezone: "Pacific/Auckland" }

// Returns true if the current NZ time falls within the scheduled maintenance window.
// The window crosses midnight (20:00 → 07:00), so when startHour > endHour the check
// is an OR: "after start OR before end". Matches the DST-aware EventBridge RDS schedule.
function isMaintenanceWindow(): boolean {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: MAINTENANCE_WINDOW.timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
    10
  )
  const { startHour, endHour } = MAINTENANCE_WINDOW
  return startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour
}

/**
 * Replacement for fetch, Every API call in the app needs to:
 * 1. Attach Authorization: Bearer <token> header
 * 2. Tell the browser to include the cookie (credentials: 'include')
 * 3. If the server returns 401 — silently get a new access token and retry
 * 4. If the retry also fails — give up, clear the token, redirect to /login
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken()

  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  // 503 — DB unreachable, show maintenance message if within scheduled window
  if (response.status === 503) {
    if (isMaintenanceWindow()) {
      window.location.href = "/maintenance"
      throw new MaintenanceError()
    }
    throw new ApiError(503, "Service temporarily unavailable. Please try again.")
  }

  if (response.status !== 401) return response

  // Auth endpoints return 401 for invalid credentials — not a session expiry, don't retry
  if (input.includes("/auth/")) return response

  // 401 — attempt silent refresh then retry original request once
  try {
    const newToken = await silentRefresh()
    return fetch(input, {
      ...init,
      credentials: "include",
      headers: {
        ...init.headers,
        Authorization: `Bearer ${newToken}`,
      },
    })
  } catch {
    clearToken()
    window.location.href = "/login"
    throw new Error("Session expired")
  }
}


/**
 * Custom error class for API errors, includes the HTTP status code and a message.
 */
export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/**
 * Thrown when a 503 response is received during the scheduled maintenance window (8 PM–7 AM New Zealand time).
 */
export class MaintenanceError extends Error {
  constructor(message = "Service is in maintenance (8 PM–7 AM New Zealand time). Please try again later.") {
    super(message)
    this.name = "MaintenanceError"
  }
}


// Never echo the backend's { error } field (untrusted channel — could leak server detail);
// return a safe client-authored fallback instead. See docs/plans/maintenance-page.md.
function genericFallbackMessage(status: number): string {
  if (status >= 500) return "Something went wrong on our end. Please try again shortly."
  return "Something went wrong. Please try again."
}

/**
 * Helper function to throw an ApiError with the status code and message from the response body if available.
 * @param response - The Response object returned from a fetch request.
 * @throws An ApiError with the status code and error message from the response body if available, or a default message if not.
 * NOTE: it never returns, but always throws an error, so the return type is never
 */
async function throwApiError(response: Response): Promise<never> {
  // Either parsed JSON or null
  const body = await response.json().catch(() => null)

  throw new ApiError(
    response.status,
    // if the body has a message field, use it
    // -> if body is an array of {description} (Identity errors) join them
    // -> if body is a string use it -> fallback
    body?.message ??
    (Array.isArray(body)
      ? body.map((e: { description?: string }) => e.description).filter(Boolean).join(". ")
      : null) ??
    (typeof body === "string" ? body : null) ??
    genericFallbackMessage(response.status)
  )
}


/**
 * Handles the response from a fetch request, throwing an ApiError if the response is not ok.
 * @param response - The Response object returned from a fetch request.
 * @returns A promise that resolves to the parsed JSON data if the response is ok.
 * @throws An ApiError if the response is not ok, with the status code and error message from the response body if available.
 */
export async function handleResponse<T>(response: Response) : Promise<T> {
  if (!response.ok) await throwApiError(response)
  return response.json()
}


/**
 * Handles the response from a fetch request that is expected to have no content, throwing an ApiError if the response is not ok.
 * @param response - The Response object returned from a fetch request.
 * @returns A promise that resolves when the response is ok.
 * @throws An ApiError if the response is not ok, with the status code and error message from the response body if available.
 */
export async function handleEmptyResponse(response: Response) : Promise<void> {
  if (!response.ok) await throwApiError(response)
}