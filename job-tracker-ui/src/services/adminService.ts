import { apiFetch, handleEmptyResponse, handleResponse } from "@/lib/api"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Mirrors UserListItemDto from the backend — response shape for the admin user list.
export type UserListItem = {
  id: string
  email: string
  isAiUser: boolean
  isAdmin: boolean
}
