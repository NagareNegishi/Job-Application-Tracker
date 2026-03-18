namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Moq;

public class JobsControllerTests: IDisposable
{
    private readonly JobTrackerContext _context;
    private readonly Mock<IStorageService> _storageMock;
    private readonly JobsController _controller;
    private const string TestUserId = "test-user-id";

    public JobsControllerTests()
    {
        // Configure what database provider to use
        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()) // use in-memory, unique name per test class
            .Options; // .Options extracts the built configuration object

        _storageMock = new Mock<IStorageService>();

        // create context and controller directly
        _context = new JobTrackerContext(options);
        _controller = new JobsController(_context, _storageMock.Object);
        SetUser();
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    // Helper method which set up fixed user for unit test
    private void SetUser(string userId = TestUserId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "Test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    // Helper method to seed a job into the in-memory database
    private async Task<Job> SeedJobAsync(
        string userId = TestUserId,
        string company = "A_Company",
        string role = "Dev",
        JobStatus status = JobStatus.Wishlist,
        Priority priority = Priority.Low,
        DateTime? appliedAt = null,
        DateTime? closedAt = null,
        string? description = null,
        string? notes = null,
        List<Contact>? contacts = null,
        List<Correspondence>? correspondences = null
        )
    {
        var job = new Job {
            UserId = userId,
            Company = company,
            Role = role,
            Status = status,
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

    // Test for GetJobs
    [Fact]
    public async Task GetJobs_ReturnsAllJobs()
    {
        // Arrange: Seed multiple jobs into the in-memory database
        var job1 = await SeedJobAsync(company: "Company A", role: "Developer");
        var job2 = await SeedJobAsync(company: "Company B", role: "Designer");

        // Act: Call the GetJobs method
        var result = await _controller.GetJobs();

        // Assert: Check that the result contains both seeded jobs
        var jobs = Assert.IsType<List<JobResponseDto>>(result.Value);
        Assert.Contains(jobs, j => j.Id == job1.Id && j.Company == "Company A" && j.Role == "Developer");
        Assert.Contains(jobs, j => j.Id == job2.Id && j.Company == "Company B" && j.Role == "Designer");
    }

    // Test for GetJobs when no jobs exist
    [Fact]
    public async Task GetJobs_ReturnsEmptyList_WhenNoJobsExist()
    {
        // Act: Call the GetJobs method without seeding any jobs
        var result = await _controller.GetJobs();

        // Assert: Check that the result is an empty list
        var jobs = Assert.IsType<List<JobResponseDto>>(result.Value);
        Assert.Empty(jobs);
    }

    // Test for GetJob with a valid ID
    [Fact]
    public async Task GetJob_ReturnsJob_WhenIdIsValid()
    {
        // Arrange
        var seededJob = await SeedJobAsync(company: "Company A", role: "Developer");

        // Act
        var result = await _controller.GetJob(seededJob.Id);

        // Assert: Check that the result contains the correct job details
        var job = Assert.IsType<JobResponseDto>(result.Value);
        Assert.Equal(seededJob.Id, job.Id);
        Assert.Equal("Company A", job.Company);
        Assert.Equal("Developer", job.Role);
    }

    // Test for GetJob with an invalid ID
    [Theory]
    [InlineData(999)] // ID that does not exist
    [InlineData(-1)]  // Negative ID
    public async Task GetJob_ReturnsNotFound_WhenIdIsInvalid(int invalidId)
    {
        // Act
        var result = await _controller.GetJob(invalidId);

        // Assert: Check that the result is a NotFound result
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // Test for PutJob with a valid ID
    [Fact]
    public async Task PutJob_UpdatesJob_WhenIdIsValid()
    {
        // Arrange
        var seededJob = await SeedJobAsync(company: "Company A", role: "Developer");
        var updateDto = new UpdateJobDTO {
            Company = "Updated Company",
            Role = "Updated Role",
            Status = JobStatus.Applied,
            Priority = Priority.High,
            AppliedAt = new DateTime(2024, 1, 1),
            ClosedAt = new DateTime(2024, 2, 1),
            Description = "Updated description",
            Notes = "Updated notes",
            Contacts = [ new Contact {
                Name = "John Doe",
                Email = "Some@Email"
            } ],
            Correspondences = [ new Correspondence {
                Date = DateTime.UtcNow,
                Note = "Had an interview"
            } ]
        };

        // Act
        var result = await _controller.PutJob(seededJob.Id, updateDto);

        // Assert: Check that the result is NoContent and the job was updated
        Assert.IsType<NoContentResult>(result);
        var updatedJob = await _context.Jobs.FindAsync(seededJob.Id);
        Assert.NotNull(updatedJob);
        Assert.Equal("Updated Company", updatedJob.Company);
        Assert.Equal("Updated Role", updatedJob.Role);
        Assert.Equal(JobStatus.Applied, updatedJob.Status);
        Assert.Equal(Priority.High, updatedJob.Priority);
        Assert.Equal(new DateTime(2024, 1, 1), updatedJob.AppliedAt);
        Assert.Equal(new DateTime(2024, 2, 1), updatedJob.ClosedAt);
        Assert.Equal("Updated description", updatedJob.Description);
        Assert.Equal("Updated notes", updatedJob.Notes);
        Assert.NotNull(updatedJob.Contacts);
        Assert.Single(updatedJob.Contacts);
        Assert.Equal("John Doe", updatedJob.Contacts[0].Name);
        Assert.Equal("Some@Email", updatedJob.Contacts[0].Email);
        Assert.NotNull(updatedJob.Correspondences);
        Assert.Single(updatedJob.Correspondences);
        Assert.Equal("Had an interview", updatedJob.Correspondences[0].Note);
    }

    // Test for PutJob with an invalid ID
    [Theory]
    [InlineData(999)]
    [InlineData(-1)]
    public async Task PutJob_ReturnsNotFound_WhenIdIsInvalid(int invalidId)
    {
        // Arrange
        var updateDto = new UpdateJobDTO {
            Company = "Updated Company",
            Role = "Updated Role"
        };

        // Act
        var result = await _controller.PutJob(invalidId, updateDto);

        // Assert: Check that the result is a NotFound result
        Assert.IsType<NotFoundResult>(result);
    }

    // Test for PostJob to create a new job
    [Fact]
    public async Task PostJob_CreatesNewJob()
    {
        // Arrange
        var jobDto = new JobDTO {
            Company = "New Company",
            Role = "New Role",
            Status = JobStatus.Applied,
            Priority = Priority.Medium,
            AppliedAt = new DateTime(2024, 3, 1),
            ClosedAt = null,
            Description = "New job description",
            Notes = "New job notes",
            Contacts = [ new Contact {
                Name = "Jane Smith",
                Email = "Jane@Email"
            } ]
        };

        // Act
        var result = await _controller.PostJob(jobDto);

        // Assert: Check that the result is CreatedAtAction and the job was created
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var createdJob = Assert.IsType<JobResponseDto>(createdResult.Value);
        Assert.Equal("New Company", createdJob.Company);
        Assert.Equal("New Role", createdJob.Role);
        Assert.Equal(JobStatus.Applied, createdJob.Status);
        Assert.Equal(Priority.Medium, createdJob.Priority);
        Assert.Equal(new DateTime(2024, 3, 1), createdJob.AppliedAt);
        Assert.Null(createdJob.ClosedAt);
        Assert.Equal("New job description", createdJob.Description);
        Assert.Equal("New job notes", createdJob.Notes);
        Assert.NotNull(createdJob.Contacts);
        Assert.Single(createdJob.Contacts);
        Assert.Equal("Jane Smith", createdJob.Contacts[0].Name);
        Assert.Equal("Jane@Email", createdJob.Contacts[0].Email);
        Assert.Equal([], createdJob.Correspondences);
        Assert.Equal([], createdJob.Documents);
    }

    // Test for PostJob with missing required fields
    [Theory]
    [InlineData("", "Valid Role")] // Missing company
    [InlineData("Valid Company", "")] // Missing role
    public async Task PostJob_RequiredFieldsAreMissing(string company, string role)
    {
        // Arrange
        var jobDto = new JobDTO {
            Company = company,
            Role = role,
        };
        var context = new ValidationContext(jobDto);
        var results = new List<ValidationResult>();

        // Act
        var isValid = Validator.TryValidateObject(jobDto, context, results, true);

        // Assert: Check that validation fails
        Assert.False(isValid);
    }

    // Test for PostJob with fields exceeding max length
    [Theory]
    [InlineData(0)] // Test company field
    [InlineData(1)] // Test role field
    public async Task PostJob_FieldsExceedMaxLength(int choice)
    {
        // Arrange
        var longCompany = new string('C', ValidationConstants.MaxCompanyLength + 1);
        var longRole = new string('R', ValidationConstants.MaxRoleLength + 1);
        var jobDto = new JobDTO {
            Company = choice == 0 ? longCompany : "Valid Company",
            Role = choice == 1 ? longRole : "Valid Role",
        };
        var context = new ValidationContext(jobDto);
        var results = new List<ValidationResult>();

        // Act
        var isValid = Validator.TryValidateObject(jobDto, context, results, true);

        // Assert: Check that validation fails
        Assert.False(isValid);
    }

    // Test for DeleteJob with a valid ID
    [Fact]
    public async Task DeleteJob_DeletesJob_WhenIdIsValid()
    {
        // Arrange
        var seededJob = await SeedJobAsync(company: "Company A", role: "Developer");

        // Act
        var result = await _controller.DeleteJob(seededJob.Id);

        // Assert: Check that the result is NoContent and the job was deleted
        Assert.IsType<NoContentResult>(result);
        var deletedJob = await _context.Jobs.FindAsync(seededJob.Id);
        Assert.Null(deletedJob);
    }

    // Test for DeleteJob with an invalid ID
    [Theory]
    [InlineData(999)]
    [InlineData(-1)]
    public async Task DeleteJob_ReturnsNotFound_WhenIdIsInvalid(int invalidId)
    {
        // Act
        var result = await _controller.DeleteJob(invalidId);

        // Assert: Check that the result is a NotFound result
        Assert.IsType<NotFoundResult>(result);
    }

    // Test that deleting a job also deletes its associated files from storage
    [Fact]
    public async Task DeleteJob_DeletesAssociatedFilesFromStorage()
    {
        // Arrange
        var job = await SeedJobAsync();
        var doc1 = new Document { JobId = job.Id, Name = "cv.pdf", StorageKey = "key-1", StoredName = "stored-1.pdf", Type = DocumentType.CV };
        var doc2 = new Document { JobId = job.Id, Name = "cover.pdf", StorageKey = "key-2", StoredName = "stored-2.pdf", Type = DocumentType.CoverLetter };
        _context.Documents.AddRange(doc1, doc2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteJob(job.Id);

        // Assert
        Assert.IsType<NoContentResult>(result);
        Assert.Null(await _context.Jobs.FindAsync(job.Id));
        Assert.Empty(await _context.Documents.Where(d => d.JobId == job.Id).ToListAsync());
        _storageMock.Verify(s => s.DeleteAsync("key-1"), Times.Once);
        _storageMock.Verify(s => s.DeleteAsync("key-2"), Times.Once);
    }

    // Skip Patch tests, it will be covered in integration tests

    // Test userId is correctly stamped
    [Fact]
    public async Task PostJob_StampsUserIdOnCreatedJob()
    {
        var jobDto = new JobDTO { Company = "Acme", Role = "Engineer" };

        var result = await _controller.PostJob(jobDto);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<JobResponseDto>(createdResult.Value);
        var savedJob = await _context.Jobs.FindAsync(dto.Id); // bypassing ToResponseDto() which doesn't expose UserId.
        Assert.NotNull(savedJob);
        Assert.Equal(TestUserId, savedJob.UserId);
    }


}