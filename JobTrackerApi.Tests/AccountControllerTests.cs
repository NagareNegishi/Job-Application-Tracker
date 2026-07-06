namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Moq;

/// <summary>Tests for AccountController — preferences retrieval/update and password change flows.</summary>
public class AccountControllerTests : IDisposable
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly JobTrackerContext _context;
    private readonly AccountController _controller;
    private const string TestUserId = "test-user-id";
    private const string TestUserEmail = "test@example.com";

    public AccountControllerTests()
    {
        // In production, ASP.NET Identity registers UserManager<ApplicationUser> into the DI container.
        // Its constructor takes the database layer as an IUserStore, in production that's EF Core.
        // In tests, we don't need a real database, so we mock it.
        // All other constructor args (password hasher, validators, logger, etc.) can be null
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object, null, null, null, null, null, null, null, null);

        // unique DB name per test class — parallel runs can't share state
        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new JobTrackerContext(options);

        var loggerMock = new Mock<ILogger<AccountController>>();
        _controller = new AccountController(_userManagerMock.Object, _context, loggerMock.Object);
        SetUser();
    }

    public void Dispose() => _context.Dispose();

    // In production, JWT middleware builds a ClaimsPrincipal from the Bearer token and sets it
    // on HttpContext.User. In tests there's no HTTP pipeline, so we build it manually.
    // AccountController reads NameIdentifier (user lookup) and Email (demo user check).
    private void SetUser(string userId = TestUserId, string email = TestUserEmail)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Email, email)
        };
        var identity = new ClaimsIdentity(claims, "Test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [Fact]
    public async Task GetPreferences_ReturnsUnauthorized_WhenUserNotFound()
    {
        // Arrange: userId from JWT has no matching account
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _controller.GetPreferences();

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetPreferences_ReturnsDefault_WhenNoPreferencesSaved()
    {
        // Arrange: user exists but has never saved preferences
        var user = new ApplicationUser { Id = TestUserId, Preferences = null };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.GetPreferences();

        // Assert: default set returned
        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<UserPreferencesDto>(ok.Value);
        Assert.Equal(["status", "priority", "appliedAt", "closedAt"], dto.VisibleColumns);
    }

    [Fact]
    public async Task GetPreferences_ReturnsSaved_WhenPreferencesExist()
    {
        // Arrange: user has previously saved a custom column set
        // JSON is PascalCase — matches JsonSerializer default (no camelCase options applied)
        var user = new ApplicationUser
        {
            Id = TestUserId,
            Preferences = "{\"VisibleColumns\":[\"status\",\"location\"]}"
        };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.GetPreferences();

        // Assert: saved columns returned, not the default
        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<UserPreferencesDto>(ok.Value);
        Assert.Equal(["status", "location"], dto.VisibleColumns);
    }

    [Fact]
    public async Task UpdatePreferences_ReturnsUnauthorized_WhenUserNotFound()
    {
        // Arrange
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _controller.UpdatePreferences(
            new UserPreferencesDto { VisibleColumns = ["status"] });

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task UpdatePreferences_ReturnsBadRequest_WhenInvalidColumnKey()
    {
        // Arrange: one valid key + one unknown key
        var user = new ApplicationUser { Id = TestUserId };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.UpdatePreferences(
            new UserPreferencesDto { VisibleColumns = ["status", "invalidKey"] });

        // Assert: rejected before reaching UpdateAsync
        Assert.IsType<BadRequestObjectResult>(result);
        _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
    }

    [Fact]
    public async Task UpdatePreferences_SavesPreferences_WhenValid()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.UpdateAsync(user))
            .ReturnsAsync(IdentityResult.Success);

        var dto = new UserPreferencesDto { VisibleColumns = ["status", "location"] };

        // Act
        var result = await _controller.UpdatePreferences(dto);

        // Assert: 200 returned and UpdateAsync was called exactly once
        Assert.IsType<OkObjectResult>(result);
        _userManagerMock.Verify(m => m.UpdateAsync(user), Times.Once);
    }

    // Demo user is blocked before any Identity call — password changes are not allowed in demo mode
    [Fact]
    public async Task ChangePassword_DemoUser_ReturnsForbidden()
    {
        // Arrange: set the email claim to the demo account's fixed address
        SetUser(email: DemoUser.Email);
        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        var result = await _controller.ChangePassword(dto);

        // Assert: 403 returned, and no Identity call was made
        Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, ((ObjectResult)result).StatusCode);
        _userManagerMock.Verify(m => m.FindByIdAsync(It.IsAny<string>()), Times.Never);
    }

    // NewPassword and ConfirmNewPassword must match before reaching Identity
    [Fact]
    public async Task ChangePassword_PasswordsDoNotMatch_ReturnsBadRequest()
    {
        // Arrange
        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "DifferentPass1!" // intentional mismatch
        };

        // Act
        var result = await _controller.ChangePassword(dto);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
        _userManagerMock.Verify(m => m.FindByIdAsync(It.IsAny<string>()), Times.Never);
    }

    // If the userId from the JWT does not resolve to a known account, return 401
    [Fact]
    public async Task ChangePassword_UserNotFound_ReturnsUnauthorized()
    {
        // Arrange: FindByIdAsync returns null — userId in token has no matching account
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync((ApplicationUser?)null);

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        var result = await _controller.ChangePassword(dto);

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    // Identity rejects the change (e.g. wrong current password) — surface errors as 400
    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequest()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ChangePasswordAsync(user, "WrongPass1!", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Code = "PasswordMismatch", Description = "Incorrect password." }));

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "WrongPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        var result = await _controller.ChangePassword(dto);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Happy path — Identity accepts the change and returns Ok
    [Fact]
    public async Task ChangePassword_Success_ReturnsOk()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestUserId))
            .ReturnsAsync(user);
        _userManagerMock
            .Setup(m => m.ChangePasswordAsync(user, "OldPass1!", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Success);

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        var result = await _controller.ChangePassword(dto);

        // Assert
        Assert.IsType<OkResult>(result);
        _userManagerMock.Verify(m => m.ChangePasswordAsync(user, "OldPass1!", "NewPass1!"), Times.Once);
    }

    // After a successful password change, every active refresh token for this user must be revoked.
    [Fact]
    public async Task ChangePassword_Success_RevokesAllActiveRefreshTokensForUser()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock.Setup(m => m.FindByIdAsync(TestUserId)).ReturnsAsync(user);
        _userManagerMock.Setup(m => m.ChangePasswordAsync(user, "OldPass1!", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Success);

        _context.RefreshTokens.AddRange(
            new RefreshToken { Token = "token-a", UserId = TestUserId, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new RefreshToken { Token = "token-b", UserId = TestUserId, ExpiresAt = DateTime.UtcNow.AddDays(7) }
        );
        await _context.SaveChangesAsync();

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        await _controller.ChangePassword(dto);

        // Assert: both tokens now have a RevokedAt timestamp
        var tokens = _context.RefreshTokens.Where(t => t.UserId == TestUserId).ToList();
        Assert.All(tokens, t => Assert.NotNull(t.RevokedAt));
    }

    // Revocation must be scoped to the password-changing user only — other users' sessions must survive.
    [Fact]
    public async Task ChangePassword_Success_DoesNotRevokeOtherUsersTokens()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock.Setup(m => m.FindByIdAsync(TestUserId)).ReturnsAsync(user);
        _userManagerMock.Setup(m => m.ChangePasswordAsync(user, "OldPass1!", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Success);

        _context.RefreshTokens.AddRange(
            new RefreshToken { Token = "my-token",    UserId = TestUserId,      ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new RefreshToken { Token = "other-token", UserId = "other-user-id", ExpiresAt = DateTime.UtcNow.AddDays(7) }
        );
        await _context.SaveChangesAsync();

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        await _controller.ChangePassword(dto);

        // Assert: other user's token is untouched
        var otherToken = _context.RefreshTokens.Single(t => t.UserId == "other-user-id");
        Assert.Null(otherToken.RevokedAt);
    }

    // Already-revoked tokens must keep their original RevokedAt — don't overwrite history.
    [Fact]
    public async Task ChangePassword_Success_PreservesAlreadyRevokedTokenTimestamp()
    {
        // Arrange
        var user = new ApplicationUser { Id = TestUserId, Email = TestUserEmail };
        _userManagerMock.Setup(m => m.FindByIdAsync(TestUserId)).ReturnsAsync(user);
        _userManagerMock.Setup(m => m.ChangePasswordAsync(user, "OldPass1!", "NewPass1!"))
            .ReturnsAsync(IdentityResult.Success);

        var originalRevokedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        _context.RefreshTokens.Add(
            new RefreshToken { Token = "old-token", UserId = TestUserId, ExpiresAt = DateTime.UtcNow.AddDays(7), RevokedAt = originalRevokedAt }
        );
        await _context.SaveChangesAsync();

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "OldPass1!",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        };

        // Act
        await _controller.ChangePassword(dto);

        // Assert: original RevokedAt is preserved, not overwritten
        var token = _context.RefreshTokens.Single(t => t.Token == "old-token");
        Assert.Equal(originalRevokedAt, token.RevokedAt);
    }

    // GET returns an empty object when no profile row exists yet for this user
    [Fact]
    public async Task GetProfile_ReturnsEmpty_WhenNoProfileExists()
    {
        // Arrange: no UserProfile seeded — DB is empty for this user

        // Act
        var result = await _controller.GetProfile();

        // Assert: 200 with an empty object (not 404)
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
        Assert.Equal("{}", System.Text.Json.JsonSerializer.Serialize(ok.Value));
    }

    // GET returns the saved profile when a row exists for this user
    [Fact]
    public async Task GetProfile_ReturnsProfile_WhenExists()
    {
        // Arrange: seed a profile row directly into the in-memory DB
        _context.UserProfiles.Add(new UserProfile
        {
            UserId = TestUserId,
            Skills = ["C#", "React"],
            TargetRoles = ["Engineer"]
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProfile();

        // Assert: 200 with a ProfileResponseDto carrying the seeded data
        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ProfileResponseDto>(ok.Value);
        Assert.Equal(["C#", "React"], dto.Skills);
        Assert.Equal(["Engineer"], dto.TargetRoles);
    }

    // PUT creates the profile when none exists and returns the saved data
    [Fact]
    public async Task CreateProfile_ReturnsOk_WhenNoProfileExists()
    {
        // Arrange
        var dto = new ProfileDTO
        {
            Skills = ["TypeScript", "C#"],
            TargetRoles = ["Senior Engineer"]
        };

        // Act
        var result = await _controller.CreateProfile(dto);

        // Assert: 200 returned and the profile row was persisted
        var ok = Assert.IsType<OkObjectResult>(result);
        var profile = Assert.IsType<ProfileResponseDto>(ok.Value);
        Assert.Equal(["TypeScript", "C#"], profile.Skills);
        Assert.Single(_context.UserProfiles.Where(p => p.UserId == TestUserId));
    }
}
