namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
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
}
