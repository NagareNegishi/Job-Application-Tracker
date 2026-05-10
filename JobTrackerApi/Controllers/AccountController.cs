using JobTrackerApi.Data;
using JobTrackerApi.Models;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace JobTrackerApi.Controllers;

/// <summary>
/// Authenticated account management — actions a logged-in user takes on their own account.
/// All endpoints require a valid JWT. Unauthenticated flows (login, register, token refresh) live in AuthController.
/// </summary>
[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JobTrackerContext _context;
    private readonly ILogger<AccountController> _logger;

    public AccountController(UserManager<ApplicationUser> userManager, JobTrackerContext context, ILogger<AccountController> logger)
    {
        _userManager = userManager;
        _context = context;
        _logger = logger;
    }

    // Default columns returned when the user has never saved a preference
    private static readonly List<string> DefaultColumns = ["status", "priority", "appliedAt", "closedAt"];

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();

        if (user.Preferences == null)
            return Ok(new UserPreferencesDto { VisibleColumns = DefaultColumns });

        var prefs = JsonSerializer.Deserialize<UserPreferencesDto>(user.Preferences);
        return Ok(prefs ?? new UserPreferencesDto { VisibleColumns = DefaultColumns });
    }

    // Change password — validates current password via Identity, blocks demo user
    [HttpPost("change-password")]
    [EnableRateLimiting("auth")] // 5 requests per minute per IP — prevents brute-forcing with a stolen JWT
    public async Task<IActionResult> ChangePassword(ChangePasswordDTO dto)
    {
        if (User.FindFirstValue(ClaimTypes.Email) == DemoUser.Email)
            return StatusCode(403, new { message = "Password changes are not available in demo mode." });

        if (dto.NewPassword != dto.ConfirmNewPassword)
            return BadRequest(new { message = "New passwords do not match." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
        {
            _logger.LogWarning("Password change failed for user {UserId}", userId);
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) }); // human-readable part only
        }

        // Revoke all active tokens (password change must invalidate existing sessions across all devices)
        var activeTokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync();

        foreach (var token in activeTokens)
            token.RevokedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Password changed and all sessions revoked for user {UserId}", userId);
        return Ok();
    }
}
