namespace JobTrackerApi.Tests;
using JobTrackerApi.Controllers;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Moq;

/// <summary>Tests for AnalysisController — demo block, profile gate, and Claude-failure mapping.</summary>
public class AnalysisControllerTests : IDisposable
{
    private readonly JobTrackerContext _context;
    private readonly Mock<IAnalysisService> _analysisMock;
    private readonly AnalysisController _controller;
    private const string TestUserId = "test-user-id";
    private const string TestUserEmail = "test@example.com";

    public AnalysisControllerTests()
    {
        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new JobTrackerContext(options);
        _analysisMock = new Mock<IAnalysisService>();
        _controller = new AnalysisController(_context, _analysisMock.Object);
        SetUser();
    }

    public void Dispose() => _context.Dispose();

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

    // Seeds a profile that clears the analysis gate (D9): TargetRoles, Skills, WorkingRights,
    // and at least one of Certifications/WorkHistory/Education.
    private async Task<UserProfile> SeedGatedProfileAsync(string userId = TestUserId)
    {
        var profile = new UserProfile
        {
            UserId = userId,
            TargetRoles = ["Backend Engineer"],
            Skills = ["C#"],
            WorkingRights = [new WorkingRightEntry { Country = "NZ", Status = WorkingRight.Citizen }],
            Certifications = ["AWS Certified Developer"]
        };
        _context.UserProfiles.Add(profile);
        await _context.SaveChangesAsync();
        return profile;
    }

    [Fact]
    public void AnalysisRequest_EmptyDescription_FailsValidation()
    {
        var request = new AnalysisRequest { Description = "" };
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(request, context, results, true);

        Assert.False(isValid);
    }

    [Fact]
    public void AnalysisRequest_DescriptionUnderMinimum_FailsValidation()
    {
        var request = new AnalysisRequest { Description = new string('x', ValidationConstants.MinAnalysisDescription - 1) };
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(request, context, results, true);

        Assert.False(isValid);
    }

    [Fact]
    public void AnalysisRequest_DescriptionOverMaximum_FailsValidation()
    {
        var request = new AnalysisRequest { Description = new string('x', ValidationConstants.MaxDescriptionLength + 1) };
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(request, context, results, true);

        Assert.False(isValid);
    }

    [Fact]
    public void AnalysisRequest_ValidDescription_PassesValidation_WithoutRoleOrCompany()
    {
        var request = new AnalysisRequest { Description = new string('x', ValidationConstants.MinAnalysisDescription) };
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(request, context, results, true);

        Assert.True(isValid);
    }

    [Fact]
    public async Task Alignment_ReturnsForbidden_ForDemoUser()
    {
        SetUser(email: DemoUser.Email);
        var request = new AnalysisRequest { Description = new string('x', ValidationConstants.MinAnalysisDescription) };

        var result = await _controller.Alignment(request);

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task Alignment_ReturnsBadRequest_WhenNoProfileExists()
    {
        var request = new AnalysisRequest { Description = new string('x', ValidationConstants.MinAnalysisDescription) };

        var result = await _controller.Alignment(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Alignment_ReturnsBadRequest_WhenProfileDoesNotMeetMinimum()
    {
        // Missing WorkingRights — otherwise-populated profile still fails the gate
        _context.UserProfiles.Add(new UserProfile
        {
            UserId = TestUserId,
            TargetRoles = ["Backend Engineer"],
            Skills = ["C#"]
        });
        await _context.SaveChangesAsync();
        var request = new AnalysisRequest { Description = new string('x', ValidationConstants.MinAnalysisDescription) };

        var result = await _controller.Alignment(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
