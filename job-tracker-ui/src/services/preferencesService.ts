import { apiFetch, handleEmptyResponse, handleResponse } from "@/lib/api";
// ColumnKey ensures visibleColumns only contains keys that exist in COLUMNS config.
import type { ColumnKey } from "@/lib/columns";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Shape the backend sends and expects at /api/account/preferences.
export type Preferences = {
  visibleColumns: ColumnKey[];
  autoFillEnabled: boolean;
};

/**
 * Fetches the current user's column preferences.
 * @returns A promise that resolves to the user's Preferences, or the backend default if none saved.
 * @throws An error if the fetch operation fails.
 */
export async function getPreferences(): Promise<Preferences> {
  const response = await apiFetch(`${BASE_URL}/account/preferences`);
  return handleResponse<Preferences>(response);
}

/**
 * Saves the current user's column preferences.
 * @param prefs - The preferences object to save.
 * @returns A promise that resolves when the preferences are successfully saved.
 * @throws An error if the fetch operation fails.
 */
export async function updatePreferences(prefs: Preferences): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/account/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  return handleEmptyResponse(response);
}
