import type { CreateJobRequest, Job, UpdateJobRequest } from "../types/job"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Fetches all jobs from the API.
 * @returns A promise that resolves to an array of Job objects.
 * @throws An error if the fetch operation fails.
 */
export async function getJobs(): Promise<Job[]> {
  const response = await fetch(`${BASE_URL}/jobs`)
  if (!response.ok) throw new Error("Failed to fetch jobs")
  return response.json()
}


/**
 * Fetches a specific job by its ID from the API.
 * @param id - The ID of the job to fetch.
 * @returns A promise that resolves to a Job object.
 * @throws An error if the fetch operation fails or if the job is not found.
 */
export async function getJob(id: number): Promise<Job> {
  const response = await fetch(`${BASE_URL}/jobs/${id}`)
  if (!response.ok) throw new Error("Failed to fetch job")
  return response.json()
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
  if (!response.ok) throw new Error("Failed to create job")
  return response.json()
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
  if (!response.ok) throw new Error("Failed to update job")
  // No content expected
}


/**
 * Deletes a job by sending a DELETE request to the API.
 * @param id - The ID of the job to delete.
 * @returns A promise that resolves when the job is successfully deleted.
 * @throws An error if the fetch operation fails or if the job is not found.
 */
export async function deleteJob(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error("Failed to delete job")
}


//patch
/**
 * Partially updates a job by sending a PATCH request to the API.
 */

    // // Partial update of a job using JSON Patch
    // // https://learn.microsoft.com/en-us/aspnet/core/web-api/jsonpatch?view=aspnetcore-10.0
    // // https://www.nuget.org/packages/Microsoft.AspNetCore.JsonPatch.SystemTextJson
    // [HttpPatch("{id}")]
    // public async Task<IActionResult> PatchJob(int id, [FromBody] JsonPatchDocument<UpdateJobDTO> patchDoc)
    // {
    //     // most invalid patch document will be rejected by the framework
    //     var job = await _context.Jobs.FindAsync(id);
    //     if (job == null) return NotFound();

    //     // Copy the existing job data into a DTO for patching.
    //     var jobToPatch = new UpdateJobDTO
    //     {
    //         Company = job.Company,
    //         Role = job.Role,
    //         Status = job.Status,
    //         Priority = job.Priority,
    //         AppliedAt = job.AppliedAt,
    //         ClosedAt = job.ClosedAt,
    //         Description = job.Description,
    //         Notes = job.Notes,
    //         Contacts = job.Contacts,
    //         Correspondences = job.Correspondences
    //     };

    //     patchDoc.ApplyTo(jobToPatch, jsonPatchError =>
    //         {
    //             ModelState.AddModelError(
    //                 jsonPatchError.AffectedObject.GetType().Name,
    //                 jsonPatchError.ErrorMessage
    //             );
    //         }
    //     );

    //     if (!ModelState.IsValid) return BadRequest(ModelState);
    //     if (!TryValidateModel(jobToPatch)) return BadRequest(ModelState);

    //     // Map back to the original job entity
    //     job.Company = jobToPatch.Company;
    //     job.Role = jobToPatch.Role;
    //     job.Status = jobToPatch.Status;
    //     job.Priority = jobToPatch.Priority;
    //     job.AppliedAt = jobToPatch.AppliedAt;
    //     job.ClosedAt = jobToPatch.ClosedAt;
    //     job.Description = jobToPatch.Description;
    //     job.Notes = jobToPatch.Notes;
    //     job.Contacts = jobToPatch.Contacts;
    //     job.Correspondences = jobToPatch.Correspondences;

    //     try
    //     {
    //         await _context.SaveChangesAsync();
    //     }
    //     catch (DbUpdateConcurrencyException)
    //     {
    //         if (!JobsExists(id)) return NotFound(); // someone else deleted
    //         return Conflict(); // someone else updated
    //     }
    //     return NoContent();
    // }

    // // Helper method to check if a job exists by ID
    // private bool JobsExists(int id)
    // {
    //     return _context.Jobs.Any(e => e.Id == id);
    // }