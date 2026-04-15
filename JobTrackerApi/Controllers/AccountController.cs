using JobTrackerApi.Data;
using JobTrackerApi.Models;
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
    private readonly UserManager<IdentityUser> _userManager;
    private readonly JobTrackerContext _context;

    public AccountController(UserManager<IdentityUser> userManager, JobTrackerContext context)
    {
        _userManager = userManager;
        _context = context;
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
            return BadRequest(result.Errors);

        return Ok();
    }
}
