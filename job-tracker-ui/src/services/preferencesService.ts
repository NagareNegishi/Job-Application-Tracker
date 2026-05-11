import { apiFetch, handleEmptyResponse, handleResponse } from "@/lib/api";
// ColumnKey ensures visibleColumns only contains keys that exist in COLUMNS config.
import type { ColumnKey } from "@/lib/columns";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Shape the backend sends and expects at /api/account/preferences.
export type Preferences = {
  visibleColumns: ColumnKey[];
};
