namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using Microsoft.AspNetCore.Identity;
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
}
