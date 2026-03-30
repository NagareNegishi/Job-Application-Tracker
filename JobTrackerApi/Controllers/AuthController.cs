using JobTrackerApi.Data;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace JobTrackerApi.Controllers;

/// <summary>
/// Unauthenticated auth flows — register, login, demo login, token refresh, and logout.
/// No JWT required on these endpoints. Authenticated account management lives in AccountController.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly IConfiguration _config;
    private readonly JobTrackerContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly IStorageService _storageService;
    private readonly IEmailService _emailService;

    public AuthController(
        UserManager<IdentityUser> userManager,
        IConfiguration config,
        JobTrackerContext context,
        IWebHostEnvironment env,
        IStorageService storageService,
        IEmailService emailService)
    {
        _userManager = userManager;
        _config = config;
        _context = context;
        _env = env;
        _storageService = storageService;
        _emailService = emailService;
    }

    // Demo login — bypasses password check, issues tokens for the seeded demo account directly
    [HttpPost("demo")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Demo()
    {
        var user = await _userManager.FindByEmailAsync(DemoUser.Email);
        if (user == null) return StatusCode(503, new { message = "Demo account unavailable." });

        // Re-seed any predefined jobs that are missing — visitor deletions are restored, additions left alone
        var existingKeys = await _context.Jobs
            .Where(j => j.UserId == user.Id)
            .Select(j => new { j.Company, j.Role })
            .ToListAsync();

        var missingJobs = DemoSeed.CreateJobs(user.Id)
            .Where(j => !existingKeys.Any(e => e.Company == j.Company && e.Role == j.Role))
            .ToList();

        if (missingJobs.Count > 0)
        {
            _context.Jobs.AddRange(missingJobs);
            await _context.SaveChangesAsync();
        }

        var accessToken = GenerateAccessToken(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);

        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAt);
        return Ok(new { accessToken });
    }

    // Nightly cron reset — full wipe + re-seed, authorized by X-Reset-Key header (not JWT)
    [HttpPost("demo/reset")]
    public async Task<IActionResult> DemoReset([FromHeader(Name = "X-Reset-Key")] string? resetKey)
    {
        var expected = _config["Demo:ResetKey"];
        if (string.IsNullOrEmpty(expected) || resetKey != expected)
            return Unauthorized();

        var user = await _userManager.FindByEmailAsync(DemoUser.Email);
        if (user == null) return StatusCode(503, new { message = "Demo account unavailable." });

        // Delete S3 files before removing DB records to avoid orphans
        var jobs = await _context.Jobs
            .Where(j => j.UserId == user.Id)
            .Include(j => j.Documents)
            .ToListAsync();

        foreach (var doc in jobs.SelectMany(j => j.Documents))
            await _storageService.DeleteAsync(doc.StoredName);

        _context.Jobs.RemoveRange(jobs);
        await _context.SaveChangesAsync();

        _context.Jobs.AddRange(DemoSeed.CreateJobs(user.Id));
        await _context.SaveChangesAsync();

        return Ok(new { message = "Demo data reset." });
    }

    // Register, Identity requires a UserName, using email for both keeps things simple
    [HttpPost("register")]
    [EnableRateLimiting("auth")] // 5 requests per minute per IP — prevents registration spam
    public async Task<IActionResult> Register(RegisterDTO dto)
    {
        var user = new IdentityUser { UserName = dto.Email, Email = dto.Email };
        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // Token is signed by Identity using the user's security stamp — invalidated if password changes
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        // URL-encode before embedding in link — token contains +/= chars that break query strings
        var encoded = Uri.EscapeDataString(token);
        var link = $"{GetFrontendBaseUrl()}/confirm-email?userId={user.Id}&token={encoded}";
        await _emailService.SendEmailAsync(
            user.Email!,
            "Confirm your email — Job Tracker",
            $"<p>Thanks for registering. Click <a href='{link}'>here</a> to confirm your email address.</p><p>If you didn't register, ignore this email.</p>"
        );

        // Don't auto-login — user must confirm email first
        return Ok(new { message = "Registration successful. Check your email to confirm your account." });
    }

    // Login
    // https://codewithmukesh.com/blog/aspnet-core-api-with-jwt-authentication/
    [HttpPost("login")]
    [EnableRateLimiting("auth")] // 5 requests per minute per IP — prevents brute force
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

    // Build the frontend base URL for email links — derived from request in production,
    // config override in dev where frontend and backend run on different ports
    private string GetFrontendBaseUrl()
    {
        if (_env.IsDevelopment())
            return _config["App:FrontendBaseUrl"]
                ?? throw new InvalidOperationException("App:FrontendBaseUrl is not configured.");

        // In production, Nginx passes the real public hostname (proxy_set_header Host $host)
        return $"https://{Request.Host.Value}";
    }

    // Helper method to set the refresh token as an httpOnly cookie
    private void SetRefreshTokenCookie(string token, DateTime expires)
    {
        var sameSite = _env.IsDevelopment() ? SameSiteMode.None : SameSiteMode.Strict;

        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = sameSite,
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
