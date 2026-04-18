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
        // Unverified accounts can be overwritten — lets users re-register after a typo without hitting "already taken"
        // Demo user is excluded — its account is managed by the startup seed, not the registration flow
        var existing = await _userManager.FindByEmailAsync(dto.Email);
        if (existing != null && !existing.EmailConfirmed && existing.Email != DemoUser.Email)
            await _userManager.DeleteAsync(existing);

        var user = new IdentityUser { UserName = dto.Email, Email = dto.Email };
        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

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

    // Nightly cron cleanup — wipes all unverified accounts; re-registration recovers anyone wiped early
    [HttpPost("cleanup-unverified")]
    public async Task<IActionResult> CleanupUnverified([FromHeader(Name = "X-Reset-Key")] string? resetKey)
    {
        var expected = _config["Demo:ResetKey"];
        if (string.IsNullOrEmpty(expected) || resetKey != expected)
            return Unauthorized();

        // Demo user excluded — EmailConfirmed is always true, but guard explicitly for safety
        var unverified = await _userManager.Users
            .Where(u => !u.EmailConfirmed && u.Email != DemoUser.Email)
            .ToListAsync();

        foreach (var user in unverified)
            await _userManager.DeleteAsync(user);

        return Ok(new { message = $"Cleaned up {unverified.Count} unverified account(s)." });
    }

    // Resend confirmation email — always returns 200 to avoid leaking whether the email exists
    [HttpPost("resend-confirmation")]
    [EnableRateLimiting("resend-confirmation")] // 3 per hour per IP — each request triggers a real SES call
    public async Task<IActionResult> ResendConfirmation(ResendConfirmationDTO dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        // Silently skip if user doesn't exist or is already confirmed
        if (user == null || user.EmailConfirmed) return Ok();

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encoded = Uri.EscapeDataString(token);
        var link = $"{GetFrontendBaseUrl()}/confirm-email?userId={user.Id}&token={encoded}";
        await _emailService.SendEmailAsync(
            user.Email!,
            "Confirm your email — Job Tracker",
            $"<p>Click <a href='{link}'>here</a> to confirm your email address.</p><p>If you didn't register, ignore this email.</p>"
        );

        return Ok();
    }

    // Confirm email — called by the React /confirm-email page after user clicks the link in their inbox
    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token)
    {
        var user = await _userManager.FindByIdAsync(userId);
        // Same message for missing user and invalid token — avoids leaking whether a userId exists
        if (user == null) return BadRequest(new { message = "Invalid confirmation link." });

        // Reverse the URL encoding applied in Register before Identity validates the signature
        var decoded = Uri.UnescapeDataString(token);
        var result = await _userManager.ConfirmEmailAsync(user, decoded);

        if (!result.Succeeded)
            return BadRequest(new { message = "Invalid or expired confirmation link." });

        return Ok(new { message = "Email confirmed. You can now log in." });
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

        // 403 not 401 — password was correct but account is not yet activated
        if (!user.EmailConfirmed)
            return StatusCode(403, new { message = "Email not verified." });

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

    // Forgot password — generates a signed reset token and emails a link; always returns 200 to avoid email enumeration
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDTO dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        // Always return 200 — never reveal whether the email exists
        if (user == null) return Ok();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encoded = Uri.EscapeDataString(token);
        var link = $"{GetFrontendBaseUrl()}/reset-password?token={encoded}&email={Uri.EscapeDataString(user.Email!)}";
        await _emailService.SendEmailAsync(
            user.Email!,
            "Reset your password — Job Tracker",
            $"<p>Click <a href='{link}'>here</a> to reset your password.</p><p>This link expires in 24 hours. If you didn't request a reset, ignore this email.</p>"
        );

        return Ok();
    }

    // Reset password — validates the token from the email link and applies the new password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDTO dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);

        // Reverse URL encoding before Identity validates the token signature
        var decoded = Uri.UnescapeDataString(dto.Token);
        // Same message for missing user and bad/expired token
        if (user == null)
            return BadRequest(new { message = "Invalid or expired reset link." });

        var result = await _userManager.ResetPasswordAsync(user, decoded, dto.NewPassword);

        if (!result.Succeeded)
            return BadRequest(new { message = "Invalid or expired reset link." });

        // Revoke all active tokens (password reset must invalidate existing sessions across all devices)
        var activeTokens = await _context.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ToListAsync();

        foreach (var token in activeTokens)
            token.RevokedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Password reset successful." });
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
