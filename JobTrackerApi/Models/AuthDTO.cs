using System.ComponentModel.DataAnnotations;

namespace JobTrackerApi.Models;

/// <summary>
/// DTO for register/ login user
/// </summary>
public class RegisterDTO
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginDTO
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class ResendConfirmationDTO
{
    public string Email { get; set; } = "";
}

public class ChangePasswordDTO
{
    [Required]
    [StringLength(128)]
    public string CurrentPassword { get; set; } = "";

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; set; } = "";

    [Required]
    public string ConfirmNewPassword { get; set; } = "";
}

// Forgot password — request a reset link
public class ForgotPasswordDTO
{
    public string Email { get; set; } = "";
}

// Reset password — submitted from the link in the reset email
public class ResetPasswordDTO
{
    public string Email { get; set; } = "";
    public string Token { get; set; } = "";
    public string NewPassword { get; set; } = "";
}
