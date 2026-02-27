/**
 * This file contains custom hooks for fetching and mutating job data using React Query.
 */
import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import {
  createJob,
  deleteJob,
  getJob,
  getJobs,
  patchJob,
  replaceJob
} from '../services/jobService'
import type { CreateJobRequest, JobPatchOperation, UpdateJobRequest } from "../types/job"

// Custom hook to fetch jobs
export function useJobs() {
  return useQuery({ queryKey: ["jobs"], queryFn: getJobs })
}

// Custom hook to fetch a single job by ID
export function useJob(id: number) {
  return useQuery({ queryKey: ["job", id], queryFn: () => getJob(id) })
}

// Custom hook to create a new job
export function useCreateJob(data: CreateJobRequest) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => createJob(data),
    // Invalidate and refetch
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
  })
}

// Custom hook to replace an existing job
export function useReplaceJob(id: number, data: UpdateJobRequest) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => replaceJob(id, data),
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
export function usePatchJob(id: number, operations: JobPatchOperation[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => patchJob(id, operations),
    // Invalidate and refetch
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
  })

}