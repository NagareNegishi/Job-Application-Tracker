using JobTrackerApi.Models;
using JobTrackerApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("[controller]")]
public class JobsController : ControllerBase
{
    private readonly JobTrackerContext _context; // Assigned once, never changes

    public JobsController(JobTrackerContext context)
    {
        _context = context;
    }

    // Get all jobs
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Job>>> GetJobs()
    {
        return await _context.Jobs.ToListAsync();
    }

    // Get a specific job by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<Job>> GetJob(int id)
    {
        // it should not include doc
        var job = await _context.Jobs.FindAsync(id);

        // this version should include doc
        // var job = await _context.Jobs
        //     .Include(j => j.Documents)
        //     .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null) return NotFound();
        return job;
    }

    // Update a job with a specific ID
    [HttpPut("{id}")]
    public async Task<IActionResult> PutJob(int id, Job update)
    {
        if (id != update.Id) return BadRequest();

        var existingJob = await _context.Jobs.FindAsync(id);
        if (existingJob == null) return NotFound();

        // Update the existing job
        existingJob.Company = update.Company;
        existingJob.Role = update.Role;
        existingJob.Status = update.Status;
        existingJob.Priority = update.Priority;
        existingJob.AppliedAt = update.AppliedAt;
        existingJob.ClosedAt = update.ClosedAt;
        existingJob.Documents = update.Documents;
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


    // TODO: Wrap it with DTO
    // Create a new job
    [HttpPost]
    public async Task<ActionResult<Job>> PostJob(Job newJob)
    {
        _context.Jobs.Add(newJob);
        await _context.SaveChangesAsync();

        // CreatedAtAction returns a 201 response with a Location header,
        // pointing to where the new resource can be found.
        return CreatedAtAction(
            nameof(GetJob), // the action method to generate the URL from, it should point where the new resource can be found
            new { id = newJob.Id }, // the route parameters to fill in
            newJob); // the created object to include in the response body
    }















    private bool JobsExists(int id)
    {
        return _context.Jobs.Any(e => e.Id == id);
    }

}
