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
}
