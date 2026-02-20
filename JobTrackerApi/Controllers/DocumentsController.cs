using JobTrackerApi.Models;
using JobTrackerApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-10.0

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly JobTrackerContext _context; // Assigned once, never changes

    public DocumentsController(JobTrackerContext context)
    {
        _context = context;
    }

    // Get all documents
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Document>>> GetDocuments()
    {
        return await _context.Documents.ToListAsync();
    }

    // Get a specific document by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<Document>> GetDocument(int id)
    {
        // it should not include doc
        var document = await _context.Documents.FindAsync(id);

        // this version should include doc
        // var document = await _context.Documents
        //     .Include(j => j.Documents)
        //     .FirstOrDefaultAsync(j => j.Id == id);

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
