namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;

public class DocumentsControllerTests: IDisposable
{
    private readonly JobTrackerContext _context;
    private readonly DocumentsController _controller;
    private readonly string _testUploadsPath = "TestUploads";

    public DocumentsControllerTests()
    {
        _testUploadsPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString()); // Unique temp directory for each test class
        Directory.CreateDirectory(_testUploadsPath); // Ensure the directory exists

        // Configure what database provider to use
        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()) // use in-memory, unique name per test class
            .Options; // .Options extracts the built configuration object

        // Create a simple configuration with the uploads path
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                { "Storage:UploadsPath", _testUploadsPath }
            })
            .Build();

        // create context and controller directly
        _context = new JobTrackerContext(options);
        _controller = new DocumentsController(_context, configuration);
    }

    // Clean up resources after tests
    public void Dispose()
    {
        Directory.Delete(_testUploadsPath, true);
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    // Helper method to seed a job into the in-memory database
    private async Task<Job> SeedJobAsync(
        string company = "A_Company",
        string role = "Dev",
        JobStatus? status = null,
        Priority? priority = null,
        DateTime? appliedAt = null,
        DateTime? closedAt = null,
        string? description = null,
        string? notes = null,
        List<Contact>? contacts = null,
        List<Correspondence>? correspondences = null
        )
    {
        var job = new Job {
            Company = company,
            Role = role,
            Status = status ?? JobStatus.Wishlist,
            Priority = priority,
            AppliedAt = appliedAt,
            ClosedAt = closedAt,
            Description = description,
            Notes = notes,
            Contacts = contacts,
            Correspondences = correspondences
            };
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();
        return job;
    }

    // Helper method to seed a document into the in-memory database
    private async Task<Document> SeedDocumentAsync(
        int jobId,
        DocumentType type = DocumentType.CV,
        string name = "Test CV",
        string filePath = "/tmp/cv.pdf")
    {
        var document = new Document
        {
            JobId = jobId,
            Type = type,
            Name = name,
            FilePath = filePath,
            CreatedAt = new DateTime(2024, 1, 1)
        };
        _context.Documents.Add(document);
        await _context.SaveChangesAsync();
        return document;
    }



    // Helper method to create a dummy file for testing
    private static FormFile CreateDummyFile(
        string fileName,
        string content = "Test content",
        string contentType = "application/octet-stream")
    {
        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(content));

        return new FormFile(stream, 0, stream.Length, "file", fileName) {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    // Test GetDocuments returns documents for a job
    [Fact]
    public async Task GetDocuments_ReturnsDocumentsForJob()
    {
        // Arrange
        var job = await SeedJobAsync();
        var doc1 = await SeedDocumentAsync(job.Id, DocumentType.CV, "CV.pdf", "/tmp/cv.pdf");
        var doc2 = await SeedDocumentAsync(job.Id, DocumentType.CoverLetter, "CL.doc", "/tmp/cl.doc");

        // Act
        var result = await _controller.GetDocuments(job.Id, null);

        // Assert
        Assert.IsType<ActionResult<IEnumerable<Document>>>(result);
        Assert.NotNull(result.Value);
        Assert.Contains(result.Value, d => d.Id == doc1.Id);
        Assert.Contains(result.Value, d => d.Id == doc2.Id);
    }

    // Test GetDocuments with type filter
    [Fact]
    public async Task GetDocuments_WithTypeFilter_ReturnsFilteredDocuments()
    {
        // Arrange
        var job = await SeedJobAsync();
        var doc1 = await SeedDocumentAsync(job.Id, DocumentType.CV, "CV.pdf", "/tmp/cv.pdf");
        var doc2 = await SeedDocumentAsync(job.Id, DocumentType.CV, "CV2.pdf", "/tmp/cv2.pdf");
        await SeedDocumentAsync(job.Id, DocumentType.CoverLetter, "CL.doc", "/tmp/cl.doc");
        await SeedDocumentAsync(job.Id, DocumentType.Description, "Portfolio.docx", "/tmp/portfolio.docx");

        // Act
        var result = await _controller.GetDocuments(job.Id, DocumentType.CV);

        // Assert
        Assert.IsType<ActionResult<IEnumerable<Document>>>(result);
        Assert.NotNull(result.Value);
        Assert.Equal(2, result.Value.Count());
        Assert.All(result.Value, d => Assert.Equal(DocumentType.CV, d.Type));
    }

    // Test GetDocument returns a specific document
    [Fact]
    public async Task GetDocument_ReturnsSpecificDocument()
    {
        // Arrange
        var job = await SeedJobAsync();
        var document = await SeedDocumentAsync(job.Id);

        // Act
        var result = await _controller.GetDocument(document.Id);

        // Assert
        Assert.IsType<ActionResult<Document>>(result);
        Assert.NotNull(result.Value);
        Assert.Equal(document.Id, result.Value.Id);
    }

    // Test GetDocument returns NotFound for non-existent document
    [Theory]
    [InlineData(999)]
    [InlineData(-1)]
    public async Task GetDocument_NonExistent_ReturnsNotFound(int id)
    {
        // Act
        var result = await _controller.GetDocument(id);

        // Assert
        Assert.IsType<ActionResult<Document>>(result);
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // Test PostDocument creates a new document
    [Fact]
    public async Task PostDocument_CreatesNewDocument()
    {
        // Arrange
        var job = await SeedJobAsync();
        var dto = new DocumentDTO {
            Type = DocumentType.CV,
            Name = "New CV",
            File = CreateDummyFile("new_cv.pdf", "Dummy CV content", "application/pdf")
        };

        // Act
        var result = await _controller.PostDocument(job.Id, dto);

        // Assert: Unwrap the CreatedAtActionResult
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var document = Assert.IsType<Document>(createdResult.Value);
        Assert.IsType<ActionResult<Document>>(result);
        Assert.NotNull(document);
        Assert.Equal(dto.Name, document.Name);
        Assert.Equal(dto.Type, document.Type);
        Assert.Equal(job.Id, document.JobId);
        Assert.True(File.Exists(document.FilePath));
    }

    // Test PostDocument with invalid file type
    [Fact]
    public async Task PostDocument_InvalidFileType_ReturnsBadRequest()
    {
        // Arrange
        var job = await SeedJobAsync();
        var dto = new DocumentDTO {
            Type = DocumentType.CV,
            Name = "Invalid File",
            File = CreateDummyFile("invalid.exe", "Executable content", "application/octet-stream")
        };

        // Act
        var result = await _controller.PostDocument(job.Id, dto);

        // Assert
        Assert.IsType<ActionResult<Document>>(result);
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("File type not allowed.", badRequestResult.Value);
    }

    // Test PostDocument with file size exceeding limit
    [Fact]
    public async Task PostDocument_FileSizeExceedsLimit_ReturnsBadRequest()
    {
        // Arrange
        var job = await SeedJobAsync();
        var largeContent = new string('A', ValidationConstants.MaxFileSize + 1);
        var dto = new DocumentDTO {
            Type = DocumentType.CV,
            Name = "Large File",
            File = CreateDummyFile("large.pdf", largeContent, "application/pdf")
        };

        // Act
        var result = await _controller.PostDocument(job.Id, dto);

        // Assert
        Assert.IsType<ActionResult<Document>>(result);
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("File size exceeds the limit.", badRequestResult.Value);
    }

    // Test PostDocument when max documents per job is reached
    [Fact]
    public async Task PostDocument_MaxDocumentsReached_ReturnsBadRequest()
    {
        // Arrange
        var job = await SeedJobAsync();
        for (int i = 0; i < ValidationConstants.MaxDocumentPerJob; i++) {
            await SeedDocumentAsync(job.Id, DocumentType.CV, $"CV_{i}.pdf", $"/tmp/cv_{i}.pdf");
        }
        var dto = new DocumentDTO {
            Type = DocumentType.CV,
            Name = "Excess Document",
            File = CreateDummyFile("excess.pdf", "Excess content", "application/pdf")
        };

        // Act
        var result = await _controller.PostDocument(job.Id, dto);

        // Assert
        Assert.IsType<ActionResult<Document>>(result);
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Maximum number of documents reached.", badRequestResult.Value);
    }

    // Test DeleteDocument deletes a document
    [Fact]
    public async Task DeleteDocument_DeletesDocument()
    {
        // Arrange
        var job = await SeedJobAsync();
        var dto = new DocumentDTO {
            Type = DocumentType.CV,
            Name = "New CV",
            File = CreateDummyFile("new_cv.pdf", "Dummy CV content", "application/pdf")
        };
        var postResult = await _controller.PostDocument(job.Id, dto);
        Assert.IsType<ActionResult<Document>>(postResult);
        var createdResult = Assert.IsType<CreatedAtActionResult>(postResult.Result);
        var document = Assert.IsType<Document>(createdResult.Value);
        Assert.True(File.Exists(document.FilePath));
        
        // Act
        var result = await _controller.DeleteDocument(job.Id, document.Id);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var deletedDocument = await _context.Documents.FindAsync(document.Id);
        Assert.Null(deletedDocument);
        Assert.False(File.Exists(document.FilePath));
    }

    // Test DeleteDocument with non-existent document
    [Theory]
    [InlineData(999)]
    [InlineData(-1)]
    public async Task DeleteDocument_NonExistent_ReturnsNotFound(int id)
    {
        // Arrange
        var job = await SeedJobAsync();

        // Act
        var result = await _controller.DeleteDocument(job.Id, id);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    // Test DeleteDocument with document that belongs to another job
    [Fact]
    public async Task DeleteDocument_WrongJob_ReturnsBadRequest()
    {
        // Arrange
        var job1 = await SeedJobAsync(company: "Company1");
        var job2 = await SeedJobAsync(company: "Company2");
        var document = await SeedDocumentAsync(job1.Id);

        // Act
        var result = await _controller.DeleteDocument(job2.Id, document.Id);

        // Assert
        Assert.IsType<BadRequestResult>(result);
        var existingDocument = await _context.Documents.FindAsync(document.Id);
        Assert.NotNull(existingDocument);
    }

    // Test PatchDocument updates a document
    [Fact]
    public async Task PatchDocument_UpdatesDocument()
    {
        // Arrange
        var job = await SeedJobAsync();
        var document = await SeedDocumentAsync(job.Id, DocumentType.CV, "Old Name", "/tmp/old.pdf");
        var updateDto = new UpdateDocumentDTO {
            Name = "Updated Name",
            Type = DocumentType.CoverLetter
        };

        // Act
        var result = await _controller.PatchDocument(job.Id, document.Id, updateDto);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var updatedDocument = await _context.Documents.FindAsync(document.Id);
        Assert.NotNull(updatedDocument);
        Assert.Equal(updateDto.Name, updatedDocument.Name);
        Assert.Equal(updateDto.Type, updatedDocument.Type);
    }

    // Test PatchDocument with non-existent document
    [Theory]
    [InlineData(999)]
    [InlineData(-1)]
    public async Task PatchDocument_NonExistent_ReturnsNotFound(int id)
    {
        // Arrange
        var job = await SeedJobAsync();
        var updateDto = new UpdateDocumentDTO {
            Name = "Updated Name",
            Type = DocumentType.CoverLetter
        };

        // Act
        var result = await _controller.PatchDocument(job.Id, id, updateDto);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    // Test PatchDocument with document that belongs to another job
    [Fact]
    public async Task PatchDocument_WrongJob_ReturnsBadRequest()
    {
        // Arrange
        var job1 = await SeedJobAsync(company: "Company1");
        var job2 = await SeedJobAsync(company: "Company2");
        var document = await SeedDocumentAsync(job1.Id, DocumentType.CV, "Old Name", "/tmp/old.pdf");
        var updateDto = new UpdateDocumentDTO {
            Name = "Updated Name",
            Type = DocumentType.CoverLetter
        };

        // Act
        var result = await _controller.PatchDocument(job2.Id, document.Id, updateDto);

        // Assert
        Assert.IsType<BadRequestResult>(result);
        var existingDocument = await _context.Documents.FindAsync(document.Id);
        Assert.NotNull(existingDocument);
        Assert.Equal("Old Name", existingDocument.Name);
        Assert.Equal(DocumentType.CV, existingDocument.Type);
    }
}