import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUsers, updateAiAccess } from "@/services/adminService"

// Fetch the full user list — re-fetched automatically after a successful AI access toggle.
export function useAdminUsers() {
  return useQuery({ queryKey: ["adminUsers"], queryFn: getUsers })
}
