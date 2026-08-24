import { apiFetch, handleResponse } from "@/lib/api"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Mirrors PlatformDownloadDto from the backend.
export type PlatformDownload = {
  platform: string
  label: string
  url: string
}

// Mirrors DesktopReleaseResponseDto — response shape for GET /api/desktop-release.
export type DesktopRelease = {
  version: string
  platforms: PlatformDownload[]
}

/**
 * Fetches the latest desktop app release info (version + per-platform installer links).
 * @returns A promise that resolves to the latest DesktopRelease.
 * @throws An error if the fetch operation fails.
 */
export async function getDesktopRelease(): Promise<DesktopRelease> {
  const response = await apiFetch(`${BASE_URL}/desktop-release`)
  return handleResponse<DesktopRelease>(response)
}
