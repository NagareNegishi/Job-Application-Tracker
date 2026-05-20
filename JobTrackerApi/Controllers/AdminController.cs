using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JobTrackerApi.Models;

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users   = await _userManager.Users.ToListAsync();
        var aiUsers = await _userManager.GetUsersInRoleAsync(Roles.AiUser);
        var admins  = await _userManager.GetUsersInRoleAsync(Roles.Admin);

        // HashSet for O(1) lookup
        var aiUserIds = aiUsers.Select(u => u.Id).ToHashSet();
        var adminIds  = admins.Select(u => u.Id).ToHashSet();

        var result = users.Select(u => new UserListItemDto
        {
            Id       = u.Id,
            Email    = u.Email!,
            IsAiUser = aiUserIds.Contains(u.Id),
            IsAdmin  = adminIds.Contains(u.Id)
        });

        return Ok(result);
    }

    // PATCH /api/admin/users/{userId}/ai-access
    [HttpPatch("users/{userId}/ai-access")]
    public async Task<IActionResult> UpdateAiAccess(string userId, [FromBody] UpdateAiAccessDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound();

        // Block toggling own access
        var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (user.Id == callerId) return BadRequest(new { message = "Cannot modify your own AI access." });

        // Only confirmed accounts can receive AI access
        if (!user.EmailConfirmed) return BadRequest(new { message = "User has not confirmed their email." });

        if (dto.Enabled)
            await _userManager.AddToRoleAsync(user, Roles.AiUser);
        else
            await _userManager.RemoveFromRoleAsync(user, Roles.AiUser);

        return Ok();
    }
}
