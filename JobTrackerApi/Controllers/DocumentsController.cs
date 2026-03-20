using JobTrackerApi.Models;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
// https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-10.0

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("jobs/{jobId}/documents")]
[Authorize]
// Route should be nested under jobs
// https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/routing?view=aspnetcore-10.0

// Controller for managing documents (CV, cover letter, etc.) associated with job applications
// No PUT endpoint, it should be achieved by DELETE + POST
public class DocumentsController : ControllerBase
{
    // Assigned once, never changes
    private readonly JobTrackerContext _context;
    private readonly IStorageService _storage;

    public DocumentsController(JobTrackerContext context, IStorageService storage)
    {
        _context = context;
        _storage = storage;
    }


    // Get all documents under a specific job
    // Allow filtering by type
    // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DocumentResponseDto>>> GetDocuments(int jobId, [FromQuery] DocumentType? type)
    {
        // verify job ownership before acting
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!await JobBelongsToUserAsync(jobId, userId)) return NotFound();

        // All documents under a specific job
        var query = _context.Documents.Where(doc => doc.JobId == jobId);
        if (type.HasValue)
        {
            query = query.Where(doc => doc.Type == type.Value); // Filter by type if provided
        }
        var documents = await query.ToListAsync();
        return documents.Select(doc => doc.ToResponseDto()).ToList();
    }


    // Get a specific document by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<DocumentResponseDto>> GetDocument(int jobId, int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!await JobBelongsToUserAsync(jobId, userId)) return NotFound();

        var document = await _context.Documents.FindAsync(id);
        if (document == null) return NotFound();
        return document.ToResponseDto();
    }


    // Download a specific document by ID
    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadDocument(int jobId, int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!await JobBelongsToUserAsync(jobId, userId)) return NotFound();

        var document = await _context.Documents.FindAsync(id);
        if (document == null) return NotFound();
        if (document.JobId != jobId) return BadRequest();

        // Files go S3 → browser directly
        var url = await _storage.GetDownloadUrlAsync(document.StorageKey);
        if (url != null)
            return Redirect(url);

        // Should never reach (S3 signing never fails locally)
        var stream = await _storage.GetAsync(document.StorageKey);
        return File(stream, "application/octet-stream", document.Name);
    }


    // Create a new document
    // [FromForm] tells ASP.NET Core to look for the data in the form data
    // and bind it to the DocumentDTO
    // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0
    [HttpPost]
    public async Task<ActionResult<DocumentResponseDto>> PostDocument(int jobId, [FromForm] DocumentDTO dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!await JobBelongsToUserAsync(jobId, userId)) return NotFound();

        // Validate the uploaded file and max document per job
        if (!dto.HasValidExtension()) {
            return BadRequest("File type not allowed.");
        }
        if (!dto.HasValidSize()) {
            return BadRequest("File size exceeds the limit.");
        }
        int documentCount = await _context.Documents.CountAsync(doc => doc.JobId == jobId);
        if (documentCount >= ValidationConstants.MaxDocumentPerJob) {
            return BadRequest("Maximum number of documents reached.");
        }

        string storedName = dto.GenerateStoredName();
        string storageKey = await _storage.SaveAsync(dto.File, storedName);
        Document newDocument = dto.ToDocument(jobId, storedName, storageKey);

        // Save to database
        try {
            _context.Documents.Add(newDocument);
            await _context.SaveChangesAsync();
        } catch (Exception e) {
            // Delete the uploaded file to avoid orphaned files
            try
            {
                await _storage.DeleteAsync(storageKey);
                Console.Error.WriteLine($"Deleted uploaded file due to database error: {e.Message}");
            } catch (Exception deleteException)
            {
                Console.Error.WriteLine($"Failed to delete file after database error: {deleteException.Message}");
            }
            throw;
        }

        // CreatedAtAction returns a 201 response with a Location header,
        // pointing to where the new resource can be found.
        return CreatedAtAction(
            nameof(GetDocument), // the action method to generate the URL from, it should point where the new resource can be found
            new { jobId, id = newDocument.Id }, // the route parameters to fill in
            newDocument.ToResponseDto()); // the created object to include in the response body
    }


    // Delete a document by ID
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(int jobId, int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!await JobBelongsToUserAsync(jobId, userId)) return NotFound();

        var document = await _context.Documents.FindAsync(id);
        if (document == null) return NotFound();
        if (document.JobId != jobId) return BadRequest();

        // Delete from DB
        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();

        // Delete the actual file
        try
        {
            await _storage.DeleteAsync(document.StorageKey);
        }
        catch (Exception e)
        {
            // Log the error but don't fail the request
            Console.Error.WriteLine($"Failed to delete file: {e.Message}");
        }
        return NoContent();
    }


    // Partial update a document by ID
    // Standard way is below:
    // https://learn.microsoft.com/en-us/aspnet/core/web-api/jsonpatch?view=aspnetcore-10.0
    [HttpPatch("{id}")]
    public async Task<IActionResult> PatchDocument(int jobId, int id, UpdateDocumentDTO update)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!await JobBelongsToUserAsync(jobId, userId)) return NotFound();

        var existingDocument = await _context.Documents.FindAsync(id);
        if (existingDocument == null) return NotFound();
        if (existingDocument.JobId != jobId) return BadRequest(); // Ensure the document belongs to the specified job

        // Update the existing document
        if (update.Name != null) {
            existingDocument.Name = update.Name;
        }
        if (update.Type.HasValue) {
            existingDocument.Type = update.Type.Value;
        }

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

    // the ownership check
    private async Task<bool> JobBelongsToUserAsync(int jobId, string? userId) =>
        await _context.Jobs.AnyAsync(j => j.Id == jobId && j.UserId == userId);

    private bool DocumentsExists(int id)
    {
        return _context.Documents.Any(e => e.Id == id);
    }

}
