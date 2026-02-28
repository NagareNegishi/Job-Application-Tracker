/**
 * This file contains custom hooks for fetching and mutating document data using React Query.
 */
import {
  createDocument,
  deleteDocument,
  downloadDocument,
  getDocument,
  getDocuments,
  patchDocument
} from '@/services/documentService'
import type { DocumentType } from "@/types/enums"
import type { CreateJobDocumentRequest, UpdateJobDocumentRequest } from "@/types/jobDocument"
import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

// Custom hook to fetch documents
export function useDocuments(jobId: number, type?: DocumentType) {
  return useQuery({
    queryKey: ["jobs", jobId, "documents", "list", type],
    queryFn: () => getDocuments(jobId, type),
    enabled: !isNaN(jobId)
  })
}

// Custom hook to fetch a single document by ID
export function useDocument(jobId: number, id: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "documents", "detail", id],
    queryFn: () => getDocument(jobId, id),
    enabled: !isNaN(jobId) && !isNaN(id)
  })
}

// Custom hook to download a document
export function useDownloadDocument() {
  return useMutation({
    mutationFn: ({ jobId, docId, fileName }: { jobId: number, docId: number, fileName: string }) =>
      downloadDocument(jobId, docId, fileName)
  })
}

// Custom hook to create a new document
export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: number, data: CreateJobDocumentRequest }) =>
      createDocument(jobId, data),

    // We don't care return from mutationFn, so we can use _ to ignore it.
    // variables is the same object we pass to mutationFn, so we can destructure it to get jobId for invalidation.
    onSuccess: (_, variables) => queryClient.invalidateQueries({
      queryKey: ["jobs", variables.jobId, "documents"] })
  })
}

// Custom hook to delete a document
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, docId }: { jobId: number, docId: number }) => deleteDocument(jobId, docId),
    // Invalidate and refetch
    onSuccess: (_, variables) => queryClient.invalidateQueries({
      queryKey: ["jobs", variables.jobId, "documents"] })
  })
}

// Custom hook to patch an existing document
export function usePatchDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, docId, data }: { jobId: number, docId: number, data: UpdateJobDocumentRequest }) =>
      patchDocument(jobId, docId, data),
    // Invalidate and refetch
    onSuccess: (_, variables) => queryClient.invalidateQueries({
      queryKey: ["jobs", variables.jobId, "documents"] })
  })

}