namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

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
}