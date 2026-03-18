using JobTrackerApi.Data;
using JobTrackerApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace JobTrackerApi.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly IConfiguration _config;
    private readonly JobTrackerContext _context;

    public AuthController(UserManager<IdentityUser> userManager, IConfiguration config, JobTrackerContext context)
    {
        _userManager = userManager;
        _config = config;
        _context = context;
    }

    // Register, Identity requires a UserName, using email for both keeps things simple
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDTO dto)
    {
        var user = new IdentityUser { UserName = dto.Email, Email = dto.Email };
        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok();
    }

    // Login
    // https://codewithmukesh.com/blog/aspnet-core-api-with-jwt-authentication/
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDTO dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        // Handle wrong email/password together to prevent attacker guessing
        if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized();

        var accessToken = GenerateAccessToken(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);

        // the refresh token is set in cookie not for JS
        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAt);
        return Ok(new { accessToken });
    }

    // Rotate tokens
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var token = Request.Cookies["refreshToken"];
        if (token == null) return Unauthorized();

        var existing = await _context.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == token);

        if (existing == null || !existing.IsActive)
            return Unauthorized();

        // Revoke old token (rotation)
        existing.RevokedAt = DateTime.UtcNow;

        var user = await _userManager.FindByIdAsync(existing.UserId);
        if (user == null) return Unauthorized();

        var accessToken = GenerateAccessToken(user);
        var newRefreshToken = await CreateRefreshTokenAsync(user.Id);

        SetRefreshTokenCookie(newRefreshToken.Token, newRefreshToken.ExpiresAt);
        return Ok(new { accessToken });
    }

    // At logout the server reads the refresh token from the httpOnly cookie, revokes it in the DB, then deletes the cookie
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var token = Request.Cookies["refreshToken"];

        if (token != null)
        {
            var existing = await _context.RefreshTokens
                .FirstOrDefaultAsync(r => r.Token == token);

            if (existing != null && existing.IsActive)
                existing.RevokedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        Response.Cookies.Delete("refreshToken");
        return NoContent();
    }

    // Helper method to set the refresh token as an httpOnly cookie
    private void SetRefreshTokenCookie(string token, DateTime expires)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = new DateTimeOffset(expires)
        });
    }

    // Helper method to generate Access token
    private string GenerateAccessToken(IdentityUser user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_config.GetValue<int>("Jwt:ExpiryMinutes")),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Helper method to generate Refresh token
    private async Task<RefreshToken> CreateRefreshTokenAsync(string userId)
    {
        var refreshToken = new RefreshToken
        {
            Token = Guid.NewGuid().ToString(),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshExpiryDays"))
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();
        return refreshToken;
    }
}
