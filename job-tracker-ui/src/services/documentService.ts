import { handleEmptyResponse, handleResponse } from "@/lib/api"
import { DocumentType } from "../types/enums"
import type { CreateJobDocumentRequest, JobDocument, UpdateJobDocumentRequest } from "../types/jobDocument"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Fetches all documents from the API.
 * @returns A promise that resolves to an array of Document objects.
 * @throws An error if the fetch operation fails.
 */
export async function getDocuments(jobId: number, type?: DocumentType): Promise<JobDocument[]> {
  const url = new URL(`${BASE_URL}/jobs/${jobId}/documents`)
  if (type !== undefined) {
    url.searchParams.set("type", type)
  }
  const response = await fetch(url)
  return handleResponse<JobDocument[]>(response)
}


/**
 * Fetches a specific document by its ID from the API.
 * @param id - The ID of the document to fetch.
 * @returns A promise that resolves to a Document object.
 * @throws An error if the fetch operation fails or if the document is not found.
 */
export async function getDocument(jobId: number, id: number): Promise<JobDocument> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}/documents/${id}`)
  return handleResponse<JobDocument>(response)
}


/**
 * Creates a new document by sending a POST request to the API.
 * @param data - An object containing the data for the new document, conforming to the CreateDocumentRequest type.
 * @returns A promise that resolves to the created Document object.
 * @throws An error if the fetch operation fails.
 */
export async function createDocument(jobId: number, data: CreateJobDocumentRequest): Promise<JobDocument> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return handleResponse<JobDocument>(response)
}


/**
 * Deletes a document by sending a DELETE request to the API.
 * @param id - The ID of the document to delete.
 * @returns A promise that resolves when the document is successfully deleted.
 * @throws An error if the fetch operation fails or if the document is not found.
 */
export async function deleteDocument(jobId: number, id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}/documents/${id}`, { method: "DELETE" })
  return handleEmptyResponse(response)
}


/**
 * Partially updates a document by sending a PATCH request to the API.
 * @param id - The ID of the document to update.
 * @param patch - An array of JSON Patch operations to apply to the document, conforming to the DocumentPatchOperation type.
 * @returns A promise that resolves when the document is successfully updated.
 * @throws An error if the fetch operation fails or if the document is not found.
 */
export async function patchDocument(jobId: number, id: number, patch: UpdateJobDocumentRequest): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  })
  return handleEmptyResponse(response)
}