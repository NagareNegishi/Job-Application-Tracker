using JobTrackerApi.Models;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace JobTrackerApi.Controllers;

/// <summary>Content-scoped AI analysis endpoints — takes job text in the body, not a stored job id.</summary>
[ApiController]
[Route("api/analyse")]
[Authorize]
public class AnalysisController : ControllerBase
{
    private readonly JobTrackerContext _context;
    private readonly IAnalysisService _analysis;

    public AnalysisController(JobTrackerContext context, IAnalysisService analysis)
    {
        _context = context;
        _analysis = analysis;
    }

    // Returns true if the current request is authenticated as the demo account
    // JWT middleware maps "email" → ClaimTypes.Email — "email" (short name) no longer exists in User.Claims
    private bool IsDemo() =>
        User.FindFirstValue(ClaimTypes.Email) == DemoUser.Email;
}
