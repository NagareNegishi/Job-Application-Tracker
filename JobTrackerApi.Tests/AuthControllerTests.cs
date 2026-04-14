namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

public class AuthControllerTests : IDisposable
{
    private readonly Mock<UserManager<IdentityUser>> _userManagerMock;
    private readonly IConfiguration _config;
    private readonly JobTrackerContext _context;
    private readonly Mock<IWebHostEnvironment> _envMock;
    private readonly Mock<IStorageService> _storageMock;
    private readonly Mock<IEmailService> _emailMock;
    private readonly AuthController _controller;

    // Fixed test identities
    private const string TestUserId = "test-user-id";
    private const string TestUserEmail = "test@example.com";

    // Fixed config values
    private const string TestResetKey    = "test-reset-key";
    private const string JwtKey          = "test-secret-key-that-is-at-least-32-chars!!";
    private const string JwtIssuer       = "test-issuer";
    private const string JwtAudience     = "test-audience";
    private const string FrontendBaseUrl = "http://localhost:5173";

    public AuthControllerTests()
    {
        // UserManager, IUserStore is the only required constructor arg
        var store = new Mock<IUserStore<IdentityUser>>();
        _userManagerMock = new Mock<UserManager<IdentityUser>>(
            store.Object, null, null, null, null, null, null, null, null);

        // IConfiguration, built in-memory rather than mocked with Moq
        // GetValue<T> is an extension method Moq can't intercept
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:ResetKey"]         = TestResetKey,
                ["Jwt:Key"]               = JwtKey,
                ["Jwt:Issuer"]            = JwtIssuer,
                ["Jwt:Audience"]          = JwtAudience,
                ["Jwt:ExpiryMinutes"]     = "60",
                ["Jwt:RefreshExpiryDays"] = "7",
                ["App:FrontendBaseUrl"]   = FrontendBaseUrl
            })
            .Build();

        // In-memory EF — unique name per test class so tests don't share state;
        // AuthController reads RefreshTokens and Jobs from _context directly
        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new JobTrackerContext(options);

        // Unit test expect dev mode
        _envMock = new Mock<IWebHostEnvironment>();
        _envMock.Setup(e => e.EnvironmentName).Returns("Development");

        // IStorageService same as DocumentsControllerTests
        _storageMock = new Mock<IStorageService>();

        // IEmailService — Register, ResendConfirmation, ForgotPassword all call SendEmailAsync;
        // default mock behaviour returns a completed Task, which is what we want
        _emailMock = new Mock<IEmailService>();

        _controller = new AuthController(
            _userManagerMock.Object,
            _config,
            _context,
            _envMock.Object,
            _storageMock.Object,
            _emailMock.Object);

        // AuthController endpoints are unauthenticated, but DefaultHttpContext is still
        // needed so Request.Cookies and Response.Cookies are reachable (Refresh, Logout, Login)
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    // xUnit creates a new class instance per test, so Dispose runs after every test
    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    // Helper method to seed a job into the in-memory database
    private async Task<Job> SeedJobAsync(string userId, string company = "A_Company", string role = "Dev")
    {
        var job = new Job { UserId = userId, Company = company, Role = role, Status = JobStatus.Wishlist, Priority = Priority.Low };
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();
        return job;
    }

    // Happy path — demo user exists, missing seed jobs are added, tokens issued
    [Fact]
    public async Task Demo_Success_ReturnsOkWithAccessToken()
    {
        // Arrange
        var user = new IdentityUser { Id = TestUserId, Email = DemoUser.Email };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(DemoUser.Email))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.Demo();

        // Assert: 200 with an accessToken in the body
        var ok = Assert.IsType<OkObjectResult>(result);
        // Controller returns Ok(new { accessToken }) — anonymous type, unwrapped via reflection
        var body = ok.Value!.GetType().GetProperty("accessToken")?.GetValue(ok.Value);
        Assert.NotNull(body);

        // All seed jobs should now exist in the DB — Demo re-seeds any that are missing
        var jobCount = await _context.Jobs.CountAsync(j => j.UserId == TestUserId);
        Assert.Equal(DemoSeed.CreateJobs(TestUserId).Count, jobCount);
    }

    // X-Reset-Key header missing or wrong — reject before touching the DB
    [Fact]
    public async Task DemoReset_WrongKey_ReturnsUnauthorized()
    {
        var result = await _controller.DemoReset("wrong-key");

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Demo account missing from Identity (e.g. seed never ran) — surface as 503 not 404
    // so the caller knows the service is unavailable, not that the route is wrong
    [Fact]
    public async Task Demo_UserNotFound_ReturnsServiceUnavailable()
    {
        // Arrange: FindByEmailAsync returns null — no demo account in Identity
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(DemoUser.Email))
            .ReturnsAsync((IdentityUser?)null);

        // Act
        var result = await _controller.Demo();

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(503, statusResult.StatusCode);
    }
}
