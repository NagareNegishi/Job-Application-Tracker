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
using Microsoft.Extensions.Logging;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore.Query;

public class AuthControllerTests : IDisposable
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly IConfiguration _config;
    private readonly JobTrackerContext _context;
    private readonly Mock<IWebHostEnvironment> _envMock;
    private readonly Mock<IStorageService> _storageMock;
    private readonly Mock<IEmailService> _emailMock;
    private readonly Mock<ILogger<AuthController>> _loggerMock;
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
    private const string AdminEmail      = "admin@test.com";

    // Expected error messages — pinned so both ResetPassword failure paths are caught together
    private const string GenericResetErrorMessage = "Invalid or expired reset link.";

    public AuthControllerTests()
    {
        // UserManager, IUserStore is the only required constructor arg
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
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
        _loggerMock = new Mock<ILogger<AuthController>>();

        // GetRolesAsync is called by GenerateAccessToken; return empty list by default —
        // tests that need specific roles override this setup individually
        _userManagerMock
            .Setup(m => m.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string>());

        _controller = new AuthController(
            _userManagerMock.Object,
            _config,
            _context,
            _envMock.Object,
            _storageMock.Object,
            _emailMock.Object,
            _loggerMock.Object);

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

    // EF Core's ToListAsync requires IAsyncEnumerable<T>, which plain .AsQueryable() doesn't implement.
    // These three classes are the standard test wrapper for mocking IQueryable sources with async support.
    // EnumerableQuery<T> handles sync LINQ (.Where etc.); IAsyncEnumerable<T> satisfies ToListAsync.
    private class TestAsyncEnumerable<T> : EnumerableQuery<T>, IAsyncEnumerable<T>, IQueryable<T>
    {
        public TestAsyncEnumerable(IEnumerable<T> enumerable) : base(enumerable) { }
        public TestAsyncEnumerable(Expression expression) : base(expression) { }

        // Override Provider so .Where() returns another TestAsyncEnumerable, not a plain EnumerableQuery
        IQueryProvider IQueryable.Provider => new TestAsyncQueryProvider<T>(this);

        public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken ct = default)
            => new TestAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
    }

    // Intercepts CreateQuery so chained LINQ operators stay inside the async-capable type
    private class TestAsyncQueryProvider<T>(IQueryProvider inner) : IAsyncQueryProvider
    {
        public IQueryable CreateQuery(Expression expression) => new TestAsyncEnumerable<T>(expression);
        public IQueryable<TElement> CreateQuery<TElement>(Expression expression) => new TestAsyncEnumerable<TElement>(expression);
        public object? Execute(Expression expression) => inner.Execute(expression);
        public TResult Execute<TResult>(Expression expression) => inner.Execute<TResult>(expression);
        public TResult ExecuteAsync<TResult>(Expression expression, CancellationToken ct)
        {
            var resultType = typeof(TResult).GetGenericArguments()[0];
            var result = inner.Execute(expression);
            return (TResult)typeof(Task).GetMethod(nameof(Task.FromResult))!
                .MakeGenericMethod(resultType).Invoke(null, [result])!;
        }
    }

    private class TestAsyncEnumerator<T>(IEnumerator<T> inner) : IAsyncEnumerator<T>
    {
        public T Current => inner.Current;
        public ValueTask<bool> MoveNextAsync() => ValueTask.FromResult(inner.MoveNext());
        public ValueTask DisposeAsync() { inner.Dispose(); return ValueTask.CompletedTask; }
    }

    // Helper method to seed a job into the in-memory database
    private async Task<Job> SeedJobAsync(string userId, string company = "A_Company", string role = "Dev")
    {
        var job = new Job { UserId = userId, Company = company, Role = role, Status = JobStatus.Wishlist, Priority = Priority.Low };
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();
        return job;
    }

    // Builds a controller with Admin:Email in config — reuses all existing mocks
    private AuthController BuildControllerWithAdminEmail()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:ResetKey"]         = TestResetKey,
                ["Jwt:Key"]               = JwtKey,
                ["Jwt:Issuer"]            = JwtIssuer,
                ["Jwt:Audience"]          = JwtAudience,
                ["Jwt:ExpiryMinutes"]     = "60",
                ["Jwt:RefreshExpiryDays"] = "7",
                ["App:FrontendBaseUrl"]   = FrontendBaseUrl,
                ["Admin:Email"]           = AdminEmail
            })
            .Build();

        var controller = new AuthController(
            _userManagerMock.Object,
            config,
            _context,
            _envMock.Object,
            _storageMock.Object,
            _emailMock.Object,
            _loggerMock.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    // Happy path — demo user exists, missing seed jobs are added, tokens issued
    [Fact]
    public async Task Demo_Success_ReturnsOkWithAccessToken()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId, Email = DemoUser.Email };
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
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail, EmailConfirmed = false };
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
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
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
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.Login(new LoginDTO { Email = "noone@example.com", Password = "Pass1!" });

        Assert.IsType<UnauthorizedResult>(result);
    }

    // No User should not skip CheckPasswordAsync -> timing difference leaks whether an email address is registered
    [Fact]
    public async Task Login_UserNotFound_StillCallsCheckPasswordAsync()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync("noone@example.com"))
            .ReturnsAsync((ApplicationUser?)null);
        _userManagerMock
            .Setup(m => m.CheckPasswordAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
            .ReturnsAsync(false);

        var result = await _controller.Login(new LoginDTO { Email = "noone@example.com", Password = "Pass1!" });

        Assert.IsType<UnauthorizedResult>(result);
        // CheckPasswordAsync must run regardless
        _userManagerMock.Verify(
            m => m.CheckPasswordAsync(It.IsAny<ApplicationUser>(), "Pass1!"),
            Times.Once);
    }

    // Happy path — correct credentials, confirmed email, tokens issued and cookie set
    [Fact]
    public async Task Login_Success_ReturnsOkWithAccessTokenAndSetsCookie()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail, EmailConfirmed = true };
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

        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
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
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.DemoReset(TestResetKey);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(503, statusResult.StatusCode);
    }

    // Happy path — existing jobs and their documents deleted from storage, then fresh seed applied
    [Fact]
    public async Task DemoReset_Success_WipesAndReseeds()
    {
        // Arrange: demo user exists, one existing job with a document in storage
        var user = new ApplicationUser { Id = TestUserId, Email = DemoUser.Email };
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
            .ReturnsAsync((ApplicationUser?)null);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.GenerateEmailConfirmationTokenAsync(It.IsAny<ApplicationUser>()))
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
        var existing = new ApplicationUser { Id = "old-id", Email = TestUserEmail, EmailConfirmed = false };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(existing);
        _userManagerMock
            .Setup(m => m.DeleteAsync(existing))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.GenerateEmailConfirmationTokenAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync("confirm-token");

        var result = await _controller.Register(new RegisterDTO { Email = TestUserEmail, Password = "Pass1!" });

        Assert.IsType<OkObjectResult>(result);
        // Old account deleted before creating the new one
        _userManagerMock.Verify(m => m.DeleteAsync(existing), Times.Once);
    }

    // Register failure must not expose IdentityError.Code — machine-readable policy details (OWASP A07)
    [Fact]
    public async Task Register_IdentityFailure_DoesNotLeakErrorCode()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((ApplicationUser?)null);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "PasswordTooShort", Description = "Password is too short." }));

        var result = await _controller.Register(new RegisterDTO { Email = TestUserEmail, Password = "Pass1!" });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var body = System.Text.Json.JsonSerializer.Serialize(bad.Value);
        Assert.DoesNotContain("PasswordTooShort", body);
        Assert.Contains("Password is too short.", body);
    }

    // Identity rejects the new account (e.g. password too weak) — surface errors as 400
    [Fact]
    public async Task Register_IdentityFailure_ReturnsBadRequest()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((ApplicationUser?)null);
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "Pass1!"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "WeakPassword", Description = "Password too weak." }));

        var result = await _controller.Register(new RegisterDTO { Email = TestUserEmail, Password = "Pass1!" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Happy path — user found, token valid, email confirmed, 200 returned
    [Fact]
    public async Task ConfirmEmail_Success_ReturnsOk()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
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
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
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

    // Happy path — user found, token valid, password updated, 200 returned
    [Fact]
    public async Task ResetPassword_Success_ReturnsOk()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ResetPasswordAsync(user, "valid-token", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Success);

        var result = await _controller.ResetPassword(new ResetPasswordDTO { Email = TestUserEmail, Token = "valid-token", NewPassword = "NewPass1!" });

        Assert.IsType<OkObjectResult>(result);
    }

    // Password reset must revoke all active refresh tokens — an attacker who stole a token
    // before the reset would otherwise retain a valid session after the password change
    [Fact]
    public async Task ResetPassword_Success_RevokesAllActiveRefreshTokens()
    {
        // Arrange: two active tokens for the user
        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = "active-token-1",
            UserId = TestUserId,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = "active-token-2",
            UserId = TestUserId,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        await _context.SaveChangesAsync();

        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ResetPasswordAsync(user, "valid-token", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _controller.ResetPassword(
            new ResetPasswordDTO { Email = TestUserEmail, Token = "valid-token", NewPassword = "NewPass1!" });

        // Assert: 200 — password reset succeeded
        Assert.IsType<OkObjectResult>(result);

        // Both active tokens revoked — stolen tokens can no longer be used to refresh
        var token1 = await _context.RefreshTokens.FirstAsync(r => r.Token == "active-token-1");
        var token2 = await _context.RefreshTokens.FirstAsync(r => r.Token == "active-token-2");
        Assert.NotNull(token1.RevokedAt);
        Assert.NotNull(token2.RevokedAt);
    }

    // Token signature invalid or expired — Identity rejects it, surface as 400
    [Fact]
    public async Task ResetPassword_InvalidToken_ReturnsBadRequest()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ResetPasswordAsync(user, "bad-token", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "InvalidToken", Description = "Invalid token." }));

        var result = await _controller.ResetPassword(new ResetPasswordDTO { Email = TestUserEmail, Token = "bad-token", NewPassword = "NewPass1!" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Happy path — all unconfirmed non-demo users deleted, count returned in body
    [Fact]
    public async Task CleanupUnverified_Success_DeletesUnconfirmedUsersAndReturnsOk()
    {
        var unconfirmed1 = new ApplicationUser { Id = "u1", Email = "a@test.com", EmailConfirmed = false };
        var unconfirmed2 = new ApplicationUser { Id = "u2", Email = "b@test.com", EmailConfirmed = false };

        // UserManager.Users is an IQueryable backed by the store — return a fixed set for this test
        _userManagerMock
            .Setup(m => m.Users)
            .Returns(new TestAsyncEnumerable<ApplicationUser>(new[] { unconfirmed1, unconfirmed2 }));
        _userManagerMock
            .Setup(m => m.DeleteAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        var result = await _controller.CleanupUnverified(TestResetKey);

        Assert.IsType<OkObjectResult>(result);
        // Both unconfirmed accounts deleted — demo account excluded by the controller's Where clause
        _userManagerMock.Verify(m => m.DeleteAsync(It.IsAny<ApplicationUser>()), Times.Exactly(2));
    }

    // X-Reset-Key header missing or wrong — reject before touching the DB
    [Fact]
    public async Task CleanupUnverified_WrongKey_ReturnsUnauthorized()
    {
        var result = await _controller.CleanupUnverified("wrong-key");

        Assert.IsType<UnauthorizedResult>(result);
    }

    // Email in the reset link doesn't match any account — reject with 400
    [Fact]
    public async Task ResetPassword_UserNotFound_ReturnsBadRequest()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.ResetPassword(new ResetPasswordDTO { Email = TestUserEmail, Token = "any-token", NewPassword = "NewPass1!" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Bad token must return the same message as missing user — different text leaks whether the email exists
    [Fact]
    public async Task ResetPassword_InvalidToken_ReturnsSameGenericErrorMessage()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ResetPasswordAsync(user, "bad-token", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "InvalidToken", Description = "Invalid token." }));

        var result = await _controller.ResetPassword(
            new ResetPasswordDTO { Email = TestUserEmail, Token = "bad-token", NewPassword = "NewPass1!" });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var message = bad.Value!.GetType().GetProperty("message")?.GetValue(bad.Value) as string;
        Assert.Equal(GenericResetErrorMessage, message);
    }

    // Missing user and bad token must return the same message — different text leaks whether the email exists
    [Fact]
    public async Task ResetPassword_UserNotFound_ReturnsGenericErrorMessage()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.ResetPassword(
            new ResetPasswordDTO { Email = TestUserEmail, Token = "any-token", NewPassword = "NewPass1!" });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var message = bad.Value!.GetType().GetProperty("message")?.GetValue(bad.Value) as string;
        Assert.Equal(GenericResetErrorMessage, message);
    }

    // User found — password reset email sent with signed token link, 200 returned
    [Fact]
    public async Task ForgotPassword_UserFound_SendsResetEmailAndReturnsOk()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.GeneratePasswordResetTokenAsync(user))
            .ReturnsAsync("reset-token");

        var result = await _controller.ForgotPassword(new ForgotPasswordDTO { Email = TestUserEmail });

        Assert.IsType<OkResult>(result);
        _emailMock.Verify(
            e => e.SendEmailAsync(TestUserEmail, It.IsAny<string>(), It.IsAny<string>()),
            Times.Once);
    }

    // User not found — always 200 to avoid leaking whether the email is registered
    [Fact]
    public async Task ForgotPassword_UserNotFound_ReturnsOkSilently()
    {
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.ForgotPassword(new ForgotPasswordDTO { Email = TestUserEmail });

        Assert.IsType<OkResult>(result);
        _emailMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    // Unconfirmed user — resend confirmation email and return 200
    [Fact]
    public async Task ResendConfirmation_UnconfirmedUser_SendsEmailAndReturnsOk()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail, EmailConfirmed = false };
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
            .ReturnsAsync((ApplicationUser?)null);

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
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.ConfirmEmail("bad-id", "any-token");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Spoofed Host header in production must throw before sending — attacker must not
    // receive a password reset link pointing to their own domain
    [Fact]
    public async Task ForgotPassword_SpoofedHost_Production_ThrowsAndDoesNotSendEmail()
    {
        // Arrange: production env with an allowlist that does not include evil.com
        var prodEnv = new Mock<IWebHostEnvironment>();
        prodEnv.Setup(e => e.EnvironmentName).Returns("Production");

        var prodConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]                      = JwtKey,
                ["Jwt:Issuer"]                   = JwtIssuer,
                ["Jwt:Audience"]                 = JwtAudience,
                ["Jwt:ExpiryMinutes"]            = "60",
                ["Jwt:RefreshExpiryDays"]        = "7",
                ["Demo:ResetKey"]                = TestResetKey,
                ["App:AllowedFrontendOrigins:0"] = "https://example.com"
            })
            .Build();

        var controller = new AuthController(
            _userManagerMock.Object,
            prodConfig,
            _context,
            prodEnv.Object,
            _storageMock.Object,
            _emailMock.Object,
            _loggerMock.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        
        // Spoof the Host header 
        controller.HttpContext.Request.Host = new HostString("evil.com");

        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(TestUserEmail))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.GeneratePasswordResetTokenAsync(user))
            .ReturnsAsync("reset-token");

        // Act + Assert: unrecognised host must throw before the email is built
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => controller.ForgotPassword(new ForgotPasswordDTO { Email = TestUserEmail }));

        // Email must never be sent — attacker's domain must not reach the victim's inbox
        _emailMock.Verify(
            e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    // Login must embed the user's SecurityStamp in the JWT — OnTokenValidated in Program.cs
    // compares this claim against the DB on every request to detect password changes mid-session
    [Fact]
    public async Task Login_Success_AccessTokenContainsSecurityStamp()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = TestUserId,
            Email = TestUserEmail,
            EmailConfirmed = true,
            SecurityStamp = "known-security-stamp"
        };
        _userManagerMock.Setup(m => m.FindByEmailAsync(TestUserEmail)).ReturnsAsync(user);
        _userManagerMock.Setup(m => m.CheckPasswordAsync(user, "Pass1!")).ReturnsAsync(true);

        // Act
        var result = await _controller.Login(new LoginDTO { Email = TestUserEmail, Password = "Pass1!" });

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var accessToken = ok.Value!.GetType().GetProperty("accessToken")?.GetValue(ok.Value) as string;
        Assert.NotNull(accessToken);

        // Decode without signature validation — only inspecting claims, not verifying cryptographic integrity
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
        var stampClaim = jwt.Claims.FirstOrDefault(c => c.Type == "stamp")?.Value;

        Assert.Equal(user.SecurityStamp, stampClaim);
    }

    // Demo account missing from Identity (e.g. seed never ran) — surface as 503 not 404
    // so the caller knows the service is unavailable, not that the route is wrong
    [Fact]
    public async Task Demo_UserNotFound_ReturnsServiceUnavailable()
    {
        // Arrange: FindByEmailAsync returns null — no demo account in Identity
        _userManagerMock
            .Setup(m => m.FindByEmailAsync(DemoUser.Email))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _controller.Demo();

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(503, statusResult.StatusCode);
    }

    // Admin email confirmed — both Admin and AiUser roles assigned on first confirmation
    [Fact]
    public async Task ConfirmEmail_AdminEmail_GrantsAdminAndAiUserRoles()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = AdminEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ConfirmEmailAsync(user, "valid-token"))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.IsInRoleAsync(user, Roles.Admin))
            .ReturnsAsync(false);
        _userManagerMock
            .Setup(m => m.IsInRoleAsync(user, Roles.AiUser))
            .ReturnsAsync(false);
        _userManagerMock
            .Setup(m => m.AddToRoleAsync(user, It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        var controller = BuildControllerWithAdminEmail();
        var result = await controller.ConfirmEmail(TestUserId, "valid-token");

        Assert.IsType<OkObjectResult>(result);
        _userManagerMock.Verify(m => m.AddToRoleAsync(user, Roles.Admin),  Times.Once);
        _userManagerMock.Verify(m => m.AddToRoleAsync(user, Roles.AiUser), Times.Once);
    }

    // Regular user confirms email — email doesn't match Admin:Email, no roles assigned
    [Fact]
    public async Task ConfirmEmail_NonAdminEmail_DoesNotGrantRoles()
    {
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ConfirmEmailAsync(user, "valid-token"))
            .ReturnsAsync(IdentityResult.Success);

        var controller = BuildControllerWithAdminEmail();
        var result = await controller.ConfirmEmail(TestUserId, "valid-token");

        Assert.IsType<OkObjectResult>(result);
        _userManagerMock.Verify(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
    }
}
