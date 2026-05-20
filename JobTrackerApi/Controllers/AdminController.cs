using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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
        throw new NotImplementedException();
    }

    // PATCH /api/admin/users/{userId}/ai-access
    [HttpPatch("users/{userId}/ai-access")]
    public async Task<IActionResult> UpdateAiAccess(string userId, [FromBody] UpdateAiAccessDto dto)
    {
        throw new NotImplementedException();
    }
}
