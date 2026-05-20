namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;

public class AdminControllerTests
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly AdminController _controller;

    private const string TestCallerId = "caller-id";
    private const string OtherUserId  = "other-user-id";

    public AdminControllerTests()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object, null, null, null, null, null, null, null, null);

        // GetUsersInRoleAsync is called by GetUsers for every role — return empty by default
        _userManagerMock
            .Setup(m => m.GetUsersInRoleAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<ApplicationUser>());

        _controller = new AdminController(_userManagerMock.Object);
        SetUser();
    }

    public void Dispose()
    {
        GC.SuppressFinalize(this);
    }

    private void SetUser(string callerId = TestCallerId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, callerId) };
        var identity = new ClaimsIdentity(claims, "Test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }
}
