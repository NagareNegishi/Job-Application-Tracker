/**
 * This file contains custom hooks for fetching and mutating job data using React Query.
 */
import {
  createJob,
  deleteJob,
  getJob,
  getJobs,
  patchJob,
  replaceJob
} from '@/services/jobService'
import type { JobPatchOperation, UpdateJobRequest } from "@/types/job"
import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

// Custom hook to fetch jobs
export function useJobs() {
  return useQuery({ queryKey: ["jobs"], queryFn: getJobs })
}

// Custom hook to fetch a single job by ID
export function useJob(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => getJob(id),
    // Only run this query if the ID is valid (not NaN)
    enabled: options?.enabled ?? true
  })
}

// Custom hook to create a new job
export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createJob, // if the service function takes one argument, you can pass it directly
    // Invalidate and refetch
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
  })
}

// Custom hook to replace an existing job
export function useReplaceJob() {
  const queryClient = useQueryClient()
  return useMutation({
    // When the mutation function takes multiple arguments, wrap them in an object
    mutationFn: ({ id, data }: { id: number, data: UpdateJobRequest }) => replaceJob(id, data),
    // Invalidate and refetch
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
  })
}

// Custom hook to delete a job
export function useDeleteJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteJob,
    // Invalidate and refetch
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
  })
}

// Custom hook to patch an existing job
export function usePatchJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, operations }: { id: number, operations: JobPatchOperation[] }) => patchJob(id, operations),
    // Invalidate and refetch
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
  })

}