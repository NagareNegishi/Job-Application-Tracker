namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

public class JobsControllerTests
{
    private readonly JobTrackerContext _context;
    private readonly JobsController _controller;

    public JobsControllerTests()
    {
        // Configure what database provider to use
        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()) // use in-memory, unique name per test class
            .Options; // .Options extracts the built configuration object

        // create context and controller directly
        _context = new JobTrackerContext(options);
        _controller = new JobsController(_context);
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
        var jobs = Assert.IsType<List<Job>>(result.Value);
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
        var jobs = Assert.IsType<List<Job>>(result.Value);
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
        var job = Assert.IsType<Job>(result.Value);
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

}