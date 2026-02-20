using JobTrackerApi.Models;
using JobTrackerApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-10.0

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("jobs/{jobId}/documents")]
// Route should be nested under jobs
// https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/routing?view=aspnetcore-10.0
public class DocumentsController : ControllerBase
{
    private readonly JobTrackerContext _context; // Assigned once, never changes

    public DocumentsController(JobTrackerContext context)
    {
        _context = context;
    }

    // Get all documents under a specific job
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Document>>> GetDocuments(int jobId)
    {
        return await _context.Documents
            .Where(doc => doc.JobId == jobId)
            .ToListAsync();
    }

    // Get a specific document by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<Document>> GetDocument(int id)
    {
        var document = await _context.Documents.FindAsync(id);
        if (document == null) return NotFound();
        return document;
    }

    // Update a document with a specific ID
    [HttpPut("{id}")]
    public async Task<IActionResult> PutDocument(int id, Document update)
    {
        if (id != update.Id) return BadRequest();

        var existingDocument = await _context.Documents.FindAsync(id);
        if (existingDocument == null) return NotFound();

        // Update the existing document
        existingDocument.Type = update.Type;
        existingDocument.Name = update.Name;
        existingDocument.CreatedAt = update.CreatedAt;

        // there 2 probably should not be updated, but for now, we can update them together
        // existingDocument.FilePath = update.FilePath;
        // existingDocument.JobId = update.JobId;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!DocumentsExists(id)) return NotFound(); // someone else deleted
            return Conflict(); // someone else updated
        }
        return NoContent();
    }


    // TODO: Wrap it with DTO
    // Create a new document
    [HttpPost]
    public async Task<ActionResult<Document>> PostDocument(Document newDocument)
    {
        _context.Documents.Add(newDocument);
        await _context.SaveChangesAsync();

        // CreatedAtAction returns a 201 response with a Location header,
        // pointing to where the new resource can be found.
        return CreatedAtAction(
            nameof(GetDocument), // the action method to generate the URL from, it should point where the new resource can be found
            new { id = newDocument.Id }, // the route parameters to fill in
            newDocument); // the created object to include in the response body
    }


    // Delete a document by ID
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        var document = await _context.Documents.FindAsync(id);
        if (document == null) return NotFound();
        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();
        return NoContent();
    }


// Consider Patch if required:
// https://learn.microsoft.com/en-us/aspnet/core/web-api/jsonpatch?view=aspnetcore-10.0

    private bool DocumentsExists(int id)
    {
        return _context.Documents.Any(e => e.Id == id);
    }

}
