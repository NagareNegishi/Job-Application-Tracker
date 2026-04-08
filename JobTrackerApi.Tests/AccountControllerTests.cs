namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Moq;

public class AccountControllerTests
{
    private readonly Mock<UserManager<IdentityUser>> _userManagerMock;
    private readonly AccountController _controller;
    private const string TestUserId = "test-user-id";
    private const string TestUserEmail = "test@example.com";

    public AccountControllerTests()
    {
        // In production, ASP.NET Identity registers UserManager<IdentityUser> into the DI container.
        // Its constructor takes the database layer as an IUserStore, in production that's EF Core.
        // In tests, we don't need a real database, so we mock it.
        // All other constructor args (password hasher, validators, logger, etc.) can be null
        var store = new Mock<IUserStore<IdentityUser>>();
        _userManagerMock = new Mock<UserManager<IdentityUser>>(
            store.Object, null, null, null, null, null, null, null, null);

        _controller = new AccountController(_userManagerMock.Object);
        SetUser();
    }

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
            .ReturnsAsync((IdentityUser?)null);

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
}
