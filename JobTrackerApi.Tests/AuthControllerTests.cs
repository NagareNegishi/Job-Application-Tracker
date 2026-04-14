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

    // Password correct but account not yet activated — 403 not 401 to distinguish from bad credentials
    [Fact]
    public async Task Login_EmailNotConfirmed_ReturnsForbidden()
    {
        // EmailConfirmed = false — password correct but account not yet activated
        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail, EmailConfirmed = false };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.CheckPasswordAsync(user, "Pass1!"))
            .ReturnsAsync(true);

        var result = await _controller.Login(new LoginDTO { Email = TestUserEmail, Password = "Pass1!" });

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, statusResult.StatusCode);
    }

    // Wrong password — same 401 as wrong email to avoid leaking whether the address exists
    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.CheckPasswordAsync(user, "WrongPass1!"))
            .ReturnsAsync(false);

        var result = await _controller.Login(new LoginDTO { Email = TestUserEmail, Password = "WrongPass1!" });

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Wrong email — same 401 as wrong password to avoid leaking whether the address exists
    [Fact]
    public async Task Login_UserNotFound_ReturnsUnauthorized()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync("noone@example.com"))
            .ReturnsAsync((IdentityUser?)null);

        var result = await _controller.Login(new LoginDTO { Email = "noone@example.com", Password = "Pass1!" });

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Happy path — correct credentials, confirmed email, tokens issued and cookie set
    [Fact]
    public async Task Login_Success_ReturnsOkWithAccessTokenAndSetsCookie()
    {
        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail, EmailConfirmed = true };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.CheckPasswordAsync(user, "Pass1!"))
            .ReturnsAsync(true);

        var result = await _controller.Login(new LoginDTO { Email = TestUserEmail, Password = "Pass1!" });

        // 200 with accessToken in body
        var ok = Assert.IsType<OkObjectResult>(result);
        var body = ok.Value!.GetType().GetProperty("accessToken")?.GetValue(ok.Value);
        Assert.NotNull(body);

        // Refresh token persisted in DB
        Assert.Equal(1, await _context.RefreshTokens.CountAsync());

        // HttpOnly cookie written to the response
        Assert.True(_controller.HttpContext.Response.Headers.ContainsKey("Set-Cookie"));
    }

    // Happy path — active token rotated, new access token issued
    [Fact]
    public async Task Refresh_Success_RotatesTokenAndReturnsNewAccessToken()
    {
        // Seed an active refresh token for the test user
        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = "active-token",
            UserId = TestUserId,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        await _context.SaveChangesAsync();

        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);

        _controller.HttpContext.Request.Headers["Cookie"] = "refreshToken=active-token";

        var result = await _controller.Refresh();

        // 200 with new accessToken
        var ok = Assert.IsType<OkObjectResult>(result);
        var body = ok.Value!.GetType().GetProperty("accessToken")?.GetValue(ok.Value);
        Assert.NotNull(body);

        // Old token revoked, new token created — DB has 2 total, old one has RevokedAt set
        Assert.Equal(2, await _context.RefreshTokens.CountAsync());
        var old = await _context.RefreshTokens.FirstAsync(r => r.Token == "active-token");
        Assert.NotNull(old.RevokedAt);
    }

    // Token in DB but already revoked — rotation or manual revocation set RevokedAt
    [Fact]
    public async Task Refresh_TokenRevoked_ReturnsUnauthorized()
    {
        // Seed a revoked token — RevokedAt set means IsActive returns false
        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = "revoked-token",
            UserId = TestUserId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddMinutes(-1)
        });
        await _context.SaveChangesAsync();

        _controller.HttpContext.Request.Headers["Cookie"] = "refreshToken=revoked-token";

        var result = await _controller.Refresh();

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Cookie present but token has no matching row in the DB — rejected as invalid
    [Fact]
    public async Task Refresh_TokenNotInDb_ReturnsUnauthorized()
    {
        // DefaultHttpContext reads cookies from the raw Cookie header
        _controller.HttpContext.Request.Headers["Cookie"] = "refreshToken=unknown-token";

        var result = await _controller.Refresh();

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Active token — revoked in DB on logout, cookie deleted, 204 returned
    [Fact]
    public async Task Logout_ActiveToken_RevokesTokenAndReturnsNoContent()
    {
        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = "active-token",
            UserId = TestUserId,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        await _context.SaveChangesAsync();

        _controller.HttpContext.Request.Headers["Cookie"] = "refreshToken=active-token";

        var result = await _controller.Logout();

        Assert.IsType<NoContentResult>(result);

        // Token revoked in DB — not deleted, so audit trail is preserved
        var token = await _context.RefreshTokens.FirstAsync(r => r.Token == "active-token");
        Assert.NotNull(token.RevokedAt);
    }

    // No cookie — nothing to revoke, but logout should still succeed
    [Fact]
    public async Task Logout_NoCookie_ReturnsNoContent()
    {
        var result = await _controller.Logout();

        Assert.IsType<NoContentResult>(result);
    }

    // No refreshToken cookie present — nothing to rotate
    [Fact]
    public async Task Refresh_NoCookie_ReturnsUnauthorized()
    {
        // No "Cookie" header set — Request.Cookies["refreshToken"] returns null
        var result = await _controller.Refresh();

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Correct key but demo account missing from Identity
    [Fact]
    public async Task DemoReset_UserNotFound_ReturnsServiceUnavailable()
    {
        // Arrange: correct key but no demo account in Identity
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(DemoUser.Email))
            .ReturnsAsync((IdentityUser?)null);

        var result = await _controller.DemoReset(TestResetKey);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(503, statusResult.StatusCode);
    }

    // Happy path — existing jobs and their documents deleted from storage, then fresh seed applied
    [Fact]
    public async Task DemoReset_Success_WipesAndReseeds()
    {
        // Arrange: demo user exists, one existing job with a document in storage
        var user = new IdentityUser { Id = TestUserId, Email = DemoUser.Email };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(DemoUser.Email))
            .ReturnsAsync(user);

        var job = await SeedJobAsync(TestUserId);
        var doc = new Document { JobId = job.Id, Name = "cv.pdf", StoredName = "stored-key.pdf", StorageKey = "stored-key.pdf", Type = DocumentType.CV };
        _context.Documents.Add(doc);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DemoReset(TestResetKey);

        // Assert: 200
        Assert.IsType<OkObjectResult>(result);

        // Storage delete was called for the document
        _storageMock.Verify(s => s.DeleteAsync("stored-key.pdf"), Times.Once);

        // Old jobs gone, fresh seed in place
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

    // Happy path — account created, confirmation email sent, 200 returned
    [Fact]
    public async Task Register_Success_SendsConfirmationEmailAndReturnsOk()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((IdentityUser?)null);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<IdentityUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.GenerateEmailConfirmationTokenAsync(It.IsAny<IdentityUser>()))
            .ReturnsAsync("confirm-token");

        var result = await _controller.Register(new RegisterDTO { Email = TestUserEmail, Password = "Pass1!" });

        Assert.IsType<OkObjectResult>(result);

        // Confirmation email must be sent — user can't log in until they click the link
        _emailMock.Verify(
            e => e.SendEmailAsync(TestUserEmail, It.IsAny<string>(), It.IsAny<string>()),
            Times.Once);
    }

    // Existing unconfirmed account — deleted before re-registration so user can fix a typo
    // without hitting "email already taken"; demo account is excluded from this path
    [Fact]
    public async Task Register_ExistingUnconfirmedAccount_DeletesAndReregisters()
    {
        var existing = new IdentityUser { Id = "old-id", Email = TestUserEmail, EmailConfirmed = false };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(existing);
        _userManagerMock
            .Setup(m => m.DeleteAsync(existing))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<IdentityUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.GenerateEmailConfirmationTokenAsync(It.IsAny<IdentityUser>()))
            .ReturnsAsync("confirm-token");

        var result = await _controller.Register(new RegisterDTO { Email = TestUserEmail, Password = "Pass1!" });

        Assert.IsType<OkObjectResult>(result);
        // Old account deleted before creating the new one
        _userManagerMock.Verify(m => m.DeleteAsync(existing), Times.Once);
    }

    // Identity rejects the new account (e.g. password too weak) — surface errors as 400
    [Fact]
    public async Task Register_IdentityFailure_ReturnsBadRequest()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((IdentityUser?)null);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<IdentityUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "WeakPassword", Description = "Password too weak." }));

        var result = await _controller.Register(new RegisterDTO { Email = TestUserEmail, Password = "Pass1!" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Happy path — user found, token valid, email confirmed, 200 returned
    [Fact]
    public async Task ConfirmEmail_Success_ReturnsOk()
    {
        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ConfirmEmailAsync(user, "valid-token"))
            .ReturnsAsync(IdentityResult.Success);

        var result = await _controller.ConfirmEmail(TestUserId, "valid-token");

        Assert.IsType<OkObjectResult>(result);
    }

    // Token signature invalid or expired — Identity rejects it, surface as 400
    [Fact]
    public async Task ConfirmEmail_InvalidToken_ReturnsBadRequest()
    {
        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ConfirmEmailAsync(user, "bad-token"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "InvalidToken", Description = "Invalid token." }));

        var result = await _controller.ConfirmEmail(TestUserId, "bad-token");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // User not found — always 200 to avoid leaking whether the email is registered
    [Fact]
    public async Task ForgotPassword_UserNotFound_ReturnsOkSilently()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((IdentityUser?)null);

        var result = await _controller.ForgotPassword(new ForgotPasswordDTO { Email = TestUserEmail });

        Assert.IsType<OkResult>(result);
        _emailMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    // Unconfirmed user — resend confirmation email and return 200
    [Fact]
    public async Task ResendConfirmation_UnconfirmedUser_SendsEmailAndReturnsOk()
    {
        var user = new IdentityUser { Id = TestUserId, Email = TestUserEmail, EmailConfirmed = false };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.GenerateEmailConfirmationTokenAsync(user))
            .ReturnsAsync("confirm-token");

        var result = await _controller.ResendConfirmation(new ResendConfirmationDTO { Email = TestUserEmail });

        Assert.IsType<OkResult>(result);
        _emailMock.Verify(
            e => e.SendEmailAsync(TestUserEmail, It.IsAny<string>(), It.IsAny<string>()),
            Times.Once);
    }

    // User not found or already confirmed — always 200 to avoid leaking whether the email exists;
    // no email sent in either case
    [Fact]
    public async Task ResendConfirmation_UserNotFoundOrAlreadyConfirmed_ReturnsOkSilently()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((IdentityUser?)null);

        var result = await _controller.ResendConfirmation(new ResendConfirmationDTO { Email = TestUserEmail });

        Assert.IsType<OkResult>(result);
        _emailMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    // userId in the confirmation link doesn't match any account — same message as invalid token
    // to avoid leaking whether a userId exists
    [Fact]
    public async Task ConfirmEmail_UserNotFound_ReturnsBadRequest()
    {
        _userManagerMock
            .Setup(m => m.FindByIdAsync("bad-id"))
            .ReturnsAsync((IdentityUser?)null);

        var result = await _controller.ConfirmEmail("bad-id", "any-token");

        Assert.IsType<BadRequestObjectResult>(result);
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
