/**
 * This module provides utility functions for handling API responses and errors in the Job Tracker UI application.
 */
import { clearToken, getToken, setToken } from "@/lib/auth"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Holds an in-flight refresh call so concurrent 401s share one refresh instead of each triggering their own
let refreshPromise: Promise<string> | null = null

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
    // if the body has a message field, use it -> if body is a string use it -> fallback
    body?.message ??
    (typeof body === "string" ? body : null) ?? "Unknown error"
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