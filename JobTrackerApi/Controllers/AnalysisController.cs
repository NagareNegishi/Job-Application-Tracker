using JobTrackerApi.Models;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    // Minimum profile completeness required before analysis will run.
    private async Task<(UserProfile? Profile, ActionResult? Error)> GetGatedProfileAsync(string userId)
    {
        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
            return (null, BadRequest(new { message = "No profile found. Add a profile before running analysis." }));

        var meetsMinimum = profile.TargetRoles.Count > 0
            && profile.Skills.Count > 0
            && profile.WorkingRights.Count > 0
            && (profile.Certifications.Count > 0 || profile.WorkHistory.Count > 0 || profile.Education.Count > 0);

        if (!meetsMinimum)
            return (null, BadRequest(new { message = "Profile is missing required information for analysis. Add target roles, skills, working rights, and at least one of certifications, work history, or education." }));

        return (profile, null);
    }
}
