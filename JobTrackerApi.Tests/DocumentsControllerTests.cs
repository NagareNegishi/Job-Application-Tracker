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
}