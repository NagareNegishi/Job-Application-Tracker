import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUsers, updateAiAccess } from "@/services/adminService"

// Fetch the full user list — re-fetched automatically after a successful AI access toggle.
export function useAdminUsers() {
  return useQuery({ queryKey: ["adminUsers"], queryFn: getUsers })
}

// Mutate AI access for a single user — invalidates the user list on success so the table stays in sync.
export function useUpdateAiAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      updateAiAccess(userId, enabled),
    // Invalidate so useAdminUsers re-fetches automatically — no manual state update needed
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
  })
}
