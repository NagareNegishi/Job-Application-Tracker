namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;
using Moq;
using System.Linq.Expressions;
using System.Security.Claims;

public class AdminControllerTests
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly AdminController _controller;
    private readonly ApplicationUser _adminUser;
    private readonly ApplicationUser _regularUser;

    private const string TestCallerId = "caller-id";
    private const string OtherUserId  = "other-user-id";

    public AdminControllerTests()
    {
        _adminUser   = new ApplicationUser { Id = TestCallerId, Email = "admin@test.com",   EmailConfirmed = true };
        _regularUser = new ApplicationUser { Id = OtherUserId,  Email = "regular@test.com", EmailConfirmed = true };

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

    // Async query helpers — same pattern as AuthControllerTests; needed because
    // UserManager.Users is IQueryable and ToListAsync requires IAsyncEnumerable<T>
    private class TestAsyncEnumerable<T> : EnumerableQuery<T>, IAsyncEnumerable<T>, IQueryable<T>
    {
        public TestAsyncEnumerable(IEnumerable<T> enumerable) : base(enumerable) { }
        public TestAsyncEnumerable(Expression expression) : base(expression) { }

        IQueryProvider IQueryable.Provider => new TestAsyncQueryProvider<T>(this);

        public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken ct = default)
            => new TestAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
    }

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

    // Happy path — two users returned; admin has both flags set, regular user has neither
    [Fact]
    public async Task GetUsers_ReturnsUsersWithCorrectRoleFlags()
    {
        _userManagerMock
            .Setup(m => m.Users)
            .Returns(new TestAsyncEnumerable<ApplicationUser>(new[] { _adminUser, _regularUser }));
        _userManagerMock
            .Setup(m => m.GetUsersInRoleAsync(Roles.Admin))
            .ReturnsAsync(new List<ApplicationUser> { _adminUser });
        _userManagerMock
            .Setup(m => m.GetUsersInRoleAsync(Roles.AiUser))
            .ReturnsAsync(new List<ApplicationUser> { _adminUser });

        var result = await _controller.GetUsers();

        var ok    = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<IEnumerable<UserListItemDto>>(ok.Value).ToList();

        Assert.Equal(2, items.Count);

        var adminDto   = items.First(u => u.Id == TestCallerId);
        var regularDto = items.First(u => u.Id == OtherUserId);

        Assert.True(adminDto.IsAdmin);
        Assert.True(adminDto.IsAiUser);
        Assert.False(regularDto.IsAdmin);
        Assert.False(regularDto.IsAiUser);
    }

    // Very unlikely — userId always comes from GetUsers() in normal UI flow;
    // only reachable if an admin intentionally crafts a raw request with a non-existent ID
    [Fact]
    public async Task UpdateAiAccess_UserNotFound_ReturnsNotFound()
    {
        _userManagerMock
            .Setup(m => m.FindByIdAsync(OtherUserId))
            .ReturnsAsync((ApplicationUser?)null);

        var result = await _controller.UpdateAiAccess(OtherUserId, new UpdateAiAccessDto { Enabled = true });

        Assert.IsType<NotFoundResult>(result);
    }

    // The tests below only occur when an admin intentionally bypasses the frontend —
    // the UI prevents all of these cases in normal flow

    // Admin cannot modify their own AI access — prevents accidental self-lockout
    [Fact]
    public async Task UpdateAiAccess_SelfModification_ReturnsBadRequest()
    {
        _userManagerMock
            .Setup(m => m.FindByIdAsync(TestCallerId))
            .ReturnsAsync(_adminUser);

        var result = await _controller.UpdateAiAccess(TestCallerId, new UpdateAiAccessDto { Enabled = false });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var message = bad.Value!.GetType().GetProperty("message")?.GetValue(bad.Value) as string;
        Assert.Equal("Cannot modify your own AI access.", message);
    }

    // Unconfirmed users cannot receive AI access — consistent with the verified-only principle
    [Fact]
    public async Task UpdateAiAccess_UnconfirmedUser_ReturnsBadRequest()
    {
        var unconfirmed = new ApplicationUser { Id = OtherUserId, Email = "regular@test.com", EmailConfirmed = false };
        _userManagerMock
            .Setup(m => m.FindByIdAsync(OtherUserId))
            .ReturnsAsync(unconfirmed);

        var result = await _controller.UpdateAiAccess(OtherUserId, new UpdateAiAccessDto { Enabled = true });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var message = bad.Value!.GetType().GetProperty("message")?.GetValue(bad.Value) as string;
        Assert.Equal("User has not confirmed their email.", message);
    }
}
