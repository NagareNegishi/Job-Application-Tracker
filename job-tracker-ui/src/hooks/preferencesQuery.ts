/**
 * Custom hooks for fetching and mutating user preferences using React Query.
 */
import { getPreferences, updatePreferences } from "@/services/preferencesService";
import type { Preferences } from "@/services/preferencesService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Custom hook to fetch the current user's column preferences.
export function usePreferences() {
  return useQuery({ queryKey: ["preferences"], queryFn: getPreferences });
}

// Custom hook to save the current user's column preferences.
// Invalidates the preferences query on success so the UI re-fetches the latest saved value.
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Preferences) => updatePreferences(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["preferences"] }),
  });
}
