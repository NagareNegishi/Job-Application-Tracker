// @vitest-environment jsdom
// Tests for apiFetch/silentRefresh — the 401 silent-refresh-and-retry flow and the
// 503 maintenance-window redirect. Fetch and window.location are mocked; the maintenance
// window is controlled via a fixed system time (see docstring below for the two instants used).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { apiFetch, silentRefresh, ApiError, MaintenanceError } from "./api"
import { getToken, setToken, clearToken } from "./auth"

// 2026-01-15T09:00:00Z is 22:00 NZT (inside the 20:00-07:00 maintenance window).
const INSIDE_WINDOW = "2026-01-15T09:00:00Z"
// 2026-01-15T23:00:00Z is 12:00 NZT the next day (outside the window).
const OUTSIDE_WINDOW = "2026-01-15T23:00:00Z"

function mockResponse(status: number, body: unknown = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
  clearToken()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(OUTSIDE_WINDOW))
  Object.defineProperty(window, "location", {
    value: { href: "", pathname: "/jobs" },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("apiFetch", () => {
  it("attaches the Authorization header and credentials when a token is set", async () => {
    setToken("abc123")
    fetchMock.mockResolvedValueOnce(mockResponse(200))

    await apiFetch("/api/jobs")

    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
    }))
  })

  it("omits the Authorization header when there is no token", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200))

    await apiFetch("/api/jobs")

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
  })

  it("returns the response unchanged when it is not a 401 or 503", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200))

    const res = await apiFetch("/api/jobs")

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("returns a 401 as-is for auth endpoints, without attempting a refresh", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401))

    const res = await apiFetch("/api/auth/login")

    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("on a 401, silently refreshes and retries the original request with the new token", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(401)) // original request
      .mockResolvedValueOnce(mockResponse(200, { accessToken: "new-token" })) // refresh
      .mockResolvedValueOnce(mockResponse(200, { ok: true })) // retried request

    const res = await apiFetch("/api/jobs")

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [, retryInit] = fetchMock.mock.calls[2]
    expect(retryInit.headers.Authorization).toBe("Bearer new-token")
    expect(getToken()).toBe("new-token")
  })

  it("clears the token and redirects to /login when the silent refresh itself fails", async () => {
    setToken("stale-token")
    fetchMock
      .mockResolvedValueOnce(mockResponse(401)) // original request
      .mockResolvedValueOnce(mockResponse(500)) // refresh fails

    await expect(apiFetch("/api/jobs")).rejects.toThrow("Session expired")

    expect(getToken()).toBeNull()
    expect(window.location.href).toBe("/login")
  })

  it("throws an ApiError for a 503 outside the maintenance window, without redirecting", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(503))

    await expect(apiFetch("/api/jobs")).rejects.toBeInstanceOf(ApiError)

    expect(window.location.href).toBe("")
  })

  it("redirects to /maintenance and throws MaintenanceError for a 503 inside the maintenance window", async () => {
    vi.setSystemTime(new Date(INSIDE_WINDOW))
    fetchMock.mockResolvedValueOnce(mockResponse(503))

    await expect(apiFetch("/api/jobs")).rejects.toBeInstanceOf(MaintenanceError)

    expect(window.location.href).toBe("/maintenance")
  })
})

describe("silentRefresh", () => {
  it("stores and returns the new access token on success", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { accessToken: "fresh-token" }))

    const token = await silentRefresh()

    expect(token).toBe("fresh-token")
    expect(getToken()).toBe("fresh-token")
  })

  it("shares one in-flight refresh call across concurrent callers", async () => {
    let resolveFetch!: (res: Response) => void
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveFetch = resolve }))

    const p1 = silentRefresh()
    const p2 = silentRefresh()
    resolveFetch(mockResponse(200, { accessToken: "shared-token" }))
    const [t1, t2] = await Promise.all([p1, p2])

    expect(t1).toBe("shared-token")
    expect(t2).toBe("shared-token")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("redirects to /maintenance on a 503 inside the window when not already there", async () => {
    vi.setSystemTime(new Date(INSIDE_WINDOW))
    window.location.pathname = "/jobs"
    fetchMock.mockResolvedValueOnce(mockResponse(503))

    await expect(silentRefresh()).rejects.toBeInstanceOf(MaintenanceError)

    expect(window.location.href).toBe("/maintenance")
  })

  it("does not redirect again on a 503 inside the window when already on /maintenance", async () => {
    vi.setSystemTime(new Date(INSIDE_WINDOW))
    window.location.pathname = "/maintenance"
    fetchMock.mockResolvedValueOnce(mockResponse(503))

    await expect(silentRefresh()).rejects.toThrow("Refresh failed")

    expect(window.location.href).toBe("")
  })
})
