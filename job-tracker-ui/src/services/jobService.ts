import { handleEmptyResponse, handleResponse } from "@/lib/api"
import type { CreateJobRequest, Job, JobPatchOperation, UpdateJobRequest } from "../types/job"

const BASE_URL = import.meta.env.VITE_API_BASE_URL


/**
 * Fetches all jobs from the API.
 * @returns A promise that resolves to an array of Job objects.
 * @throws An error if the fetch operation fails.
 */
export async function getJobs(): Promise<Job[]> {
  const response = await fetch(`${BASE_URL}/jobs`)
  return handleResponse<Job[]>(response)
}


/**
 * Fetches a specific job by its ID from the API.
 * @param id - The ID of the job to fetch.
 * @returns A promise that resolves to a Job object.
 * @throws An error if the fetch operation fails or if the job is not found.
 */
export async function getJob(id: number): Promise<Job> {
  const response = await fetch(`${BASE_URL}/jobs/${id}`)
  return handleResponse<Job>(response)
}


/**
 * Creates a new job by sending a POST request to the API.
 * @param data - An object containing the data for the new job, conforming to the CreateJobRequest type.
 * @returns A promise that resolves to the created Job object.
 * @throws An error if the fetch operation fails.
 */
export async function createJob(data: CreateJobRequest): Promise<Job> {
  const response = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return handleResponse<Job>(response)
}


/**
 * Replaces an existing job by sending a PUT request to the API.
 * @param id - The ID of the job to replace.
 * @param data - An object containing the updated data for the job, conforming to the UpdateJobRequest type.
 * @returns A promise that resolves when the job is successfully updated.
 * @throws An error if the fetch operation fails or if the job is not found.
 */
export async function replaceJob(id: number, data: UpdateJobRequest): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return handleEmptyResponse(response)
}


/**
 * Deletes a job by sending a DELETE request to the API.
 * @param id - The ID of the job to delete.
 * @returns A promise that resolves when the job is successfully deleted.
 * @throws An error if the fetch operation fails or if the job is not found.
 */
export async function deleteJob(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${id}`, { method: "DELETE" })
  return handleEmptyResponse(response)
}


/**
 * Partially updates a job by sending a PATCH request to the API.
 * @param id - The ID of the job to update.
 * @param patch - An array of JSON Patch operations to apply to the job, conforming to the JobPatchOperation type.
 * @returns A promise that resolves when the job is successfully updated.
 * @throws An error if the fetch operation fails or if the job is not found.
 */
export async function patchJob(id: number, patch: JobPatchOperation[]): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(patch)
  })
  return handleEmptyResponse(response)
}
