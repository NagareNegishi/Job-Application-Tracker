import { apiFetch, handleEmptyResponse, handleResponse } from "@/lib/api"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Mirrors UserListItemDto from the backend — response shape for the admin user list.
export type UserListItem = {
  id: string
  email: string
  isAiUser: boolean
  isAdmin: boolean
}

// Fetch all users with their role flags — Admin only.
export async function getUsers(): Promise<UserListItem[]> {
  const response = await apiFetch(`${BASE_URL}/admin/users`)
  return handleResponse<UserListItem[]>(response)
}
