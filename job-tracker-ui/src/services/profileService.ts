import { apiFetch, handleResponse } from "@/lib/api";
import type { UserProfile, ProfilePatch } from "@/types/profile";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Fetches the current user's profile.
 * @returns The saved profile, or null if none exists yet.
 */
export async function getProfile(): Promise<UserProfile | null> {
  const response = await apiFetch(`${BASE_URL}/account/profile`);
  const data = await handleResponse<UserProfile | Record<string, never>>(response);
  // backend returns {} when no profile exists yet — convert to null for easier consumption
  return Object.keys(data).length === 0 ? null : (data as UserProfile);
}

/**
 * Creates the profile for the first time (PUT).
 * @returns The created profile as saved by the server.
 */
export async function createProfile(profile: UserProfile): Promise<UserProfile> {
  const response = await apiFetch(`${BASE_URL}/account/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return handleResponse<UserProfile>(response);
}

/**
 * Partially updates the profile (PATCH — merge semantics, send only changed fields).
 * @returns The updated profile as saved by the server.
 */
export async function patchProfile(patch: ProfilePatch): Promise<UserProfile> {
  const response = await apiFetch(`${BASE_URL}/account/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handleResponse<UserProfile>(response);
}
