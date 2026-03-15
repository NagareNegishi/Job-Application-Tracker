using JobTrackerApi.Models;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;
// https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("[controller]")]
public class JobsController : ControllerBase
{
    private readonly JobTrackerContext _context; // Assigned once, never changes
    private readonly IStorageService _storage;

    public JobsController(JobTrackerContext context, IStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    // Get all jobs
    [HttpGet]
    public async Task<ActionResult<IEnumerable<JobResponseDto>>> GetJobs()
    {
        return (await _context.Jobs.ToListAsync())
            .Select(job => job.ToResponseDto())
            .ToList();
    }

    // Get a specific job by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<JobResponseDto>> GetJob(int id)
    {
        // it should not include doc
        var job = await _context.Jobs.FindAsync(id);

        // this version should include doc
        // var job = await _context.Jobs
        //     .Include(j => j.Documents)
        //     .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null) return NotFound();
        return job.ToResponseDto();
    }

    // Update a job with a specific ID
    [HttpPut("{id}")]
    public async Task<IActionResult> PutJob(int id, UpdateJobDTO update)
    {
        var existingJob = await _context.Jobs.FindAsync(id);
        if (existingJob == null) return NotFound();

        // Update the existing job
        existingJob.Company = update.Company;
        existingJob.Role = update.Role;
        existingJob.Status = update.Status;
        existingJob.Priority = update.Priority;
        existingJob.AppliedAt = update.AppliedAt;
        existingJob.ClosedAt = update.ClosedAt;
        existingJob.Description = update.Description;
        existingJob.Notes = update.Notes;
        existingJob.Contacts = update.Contacts;
        existingJob.Correspondences = update.Correspondences;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!JobsExists(id)) return NotFound(); // someone else deleted
            return Conflict(); // someone else updated
        }
        return NoContent();
    }


    // Create a new job
    [HttpPost]
    public async Task<ActionResult<JobResponseDto>> PostJob(JobDTO dto)
    {
        var newJob = dto.ToJob();
        _context.Jobs.Add(newJob);
        await _context.SaveChangesAsync();

        // CreatedAtAction returns a 201 response with a Location header,
        // pointing to where the new resource can be found.
        return CreatedAtAction(
            nameof(GetJob), // the action method to generate the URL from, it should point where the new resource can be found
            new { id = newJob.Id }, // the route parameters to fill in
            newJob.ToResponseDto()); // the created object to include in the response body
    }


    // Delete a job by ID
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteJob(int id)
    {
        var job = await _context.Jobs
            .Include(j => j.Documents)
            .FirstOrDefaultAsync(j => j.Id == id);
        if (job == null) return NotFound();

        var storageKeys = job.Documents.Select(d => d.StorageKey).ToList();

        _context.Jobs.Remove(job);
        await _context.SaveChangesAsync();

        foreach (var key in storageKeys)
        {
            try
            {
                await _storage.DeleteAsync(key);
            }
            catch (Exception e)
            {
                Console.Error.WriteLine($"Failed to delete file {key}: {e.Message}");
            }
        }

        return NoContent();
    }


    // Partial update of a job using JSON Patch
    // https://learn.microsoft.com/en-us/aspnet/core/web-api/jsonpatch?view=aspnetcore-10.0
    // https://www.nuget.org/packages/Microsoft.AspNetCore.JsonPatch.SystemTextJson
    [HttpPatch("{id}")]
    public async Task<IActionResult> PatchJob(int id, [FromBody] JsonPatchDocument<UpdateJobDTO> patchDoc)
    {
        // most invalid patch document will be rejected by the framework
        var job = await _context.Jobs.FindAsync(id);
        if (job == null) return NotFound();

        // Copy the existing job data into a DTO for patching.
        var jobToPatch = new UpdateJobDTO
        {
            Company = job.Company,
            Role = job.Role,
            Status = job.Status,
            Priority = job.Priority,
            AppliedAt = job.AppliedAt,
            ClosedAt = job.ClosedAt,
            Description = job.Description,
            Notes = job.Notes,
            Contacts = job.Contacts,
            Correspondences = job.Correspondences
        };

        patchDoc.ApplyTo(jobToPatch, jsonPatchError =>
            {
                ModelState.AddModelError(
                    jsonPatchError.AffectedObject.GetType().Name,
                    jsonPatchError.ErrorMessage
                );
            }
        );

        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryValidateModel(jobToPatch)) return BadRequest(ModelState);

        // Map back to the original job entity
        job.Company = jobToPatch.Company;
        job.Role = jobToPatch.Role;
        job.Status = jobToPatch.Status;
        job.Priority = jobToPatch.Priority;
        job.AppliedAt = jobToPatch.AppliedAt;
        job.ClosedAt = jobToPatch.ClosedAt;
        job.Description = jobToPatch.Description;
        job.Notes = jobToPatch.Notes;
        job.Contacts = jobToPatch.Contacts;
        job.Correspondences = jobToPatch.Correspondences;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!JobsExists(id)) return NotFound(); // someone else deleted
            return Conflict(); // someone else updated
        }
        return NoContent();
    }

    // Helper method to check if a job exists by ID
    private bool JobsExists(int id)
    {
        return _context.Jobs.Any(e => e.Id == id);
    }

}
