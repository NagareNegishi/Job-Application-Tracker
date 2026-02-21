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
    // Assigned once, never changes
    private readonly JobTrackerContext _context;
    private readonly string _uploadsPath;

    // TODO: Document how user supposed to configure the file storage path in appsettings.json, and how to read it here
    public DocumentsController(JobTrackerContext context, IConfiguration configuration)
    {
        _context = context;
        // ASP.NET Core automatically read appsettings.json and registers IConfiguration
        var pathCheck = configuration["Storage:UploadsPath"];
        if (string.IsNullOrEmpty(pathCheck)) {
            throw new InvalidOperationException("Storage:UploadsPath is not configured in appsettings.");
        }
        _uploadsPath = pathCheck;
    }

    // Get all documents under a specific job
    // Allow filtering by type
    // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Document>>> GetDocuments(int jobId, [FromQuery] DocumentType? type)
    {
        // All documents under a specific job
        var query = _context.Documents.Where(doc => doc.JobId == jobId);
        if (type.HasValue)
        {
            query = query.Where(doc => doc.Type == type.Value); // Filter by type if provided
        }
        return await query.ToListAsync();
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
    public async Task<IActionResult> PutDocument(int jobId, int id, Document update)
    {
        if (id != update.Id) return BadRequest();

        var existingDocument = await _context.Documents.FindAsync(id);
        if (existingDocument == null) return NotFound();
        if (existingDocument.JobId != jobId) return BadRequest(); // Ensure the document belongs to the specified job

        // Update the existing document
        existingDocument.Type = update.Type;
        existingDocument.Name = update.Name;

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


    // Create a new document
    // [FromForm] tells ASP.NET Core to look for the data in the form data
    // and bind it to the DocumentDTO
    // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0
    [HttpPost]
    public async Task<ActionResult<Document>> PostDocument(int jobId, [FromForm] DocumentDTO dto)
    {
        // Validate the uploaded file
        if (!dto.HasValidExtension()) return BadRequest("File type not allowed.");

        // Convert DTO to entity
        Document newDocument = dto.ToDocument(jobId, _uploadsPath);

        // Save to database
        _context.Documents.Add(newDocument);
        await _context.SaveChangesAsync();

        // Save the file to disk
        var filePath = newDocument.FilePath;
        using var stream = System.IO.File.Create(filePath);
        await dto.File.CopyToAsync(stream);

        // CreatedAtAction returns a 201 response with a Location header,
        // pointing to where the new resource can be found.
        return CreatedAtAction(
            nameof(GetDocument), // the action method to generate the URL from, it should point where the new resource can be found
            new { jobId, id = newDocument.Id }, // the route parameters to fill in
            newDocument); // the created object to include in the response body
    }

    // Delete a document by ID
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(int jobId, int id)
    {
        var document = await _context.Documents.FindAsync(id);
        if (document == null) return NotFound();
        if (document.JobId != jobId) return BadRequest();
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
