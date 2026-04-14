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
    }

    // xUnit creates a new class instance per test, so Dispose runs after every test
    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
