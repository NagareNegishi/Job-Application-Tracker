namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// DTO for register/ login user
/// </summary>
public class RegisterDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    [StringLength(ValidationConstants.MaxPasswordLength, MinimumLength = ValidationConstants.MinPasswordLength)]
    public string Password { get; set; } = "";
}

public class LoginDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    public string Password { get; set; } = "";
}

public class ResendConfirmationDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
}

public class ChangePasswordDTO
{
    [Required]
    [StringLength(ValidationConstants.MaxPasswordLength)]
    public string CurrentPassword { get; set; } = "";

    [Required]
    [StringLength(ValidationConstants.MaxPasswordLength, MinimumLength = ValidationConstants.MinPasswordLength)]
    public string NewPassword { get; set; } = "";

    [Required]
    [Compare("NewPassword")]
    public string ConfirmNewPassword { get; set; } = "";
}

// Forgot password — request a reset link
public class ForgotPasswordDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
}

// Reset password — submitted from the link in the reset email
public class ResetPasswordDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    [StringLength(ValidationConstants.MaxTokenLength)]
    public string Token { get; set; } = "";

    [Required]
    [StringLength(ValidationConstants.MaxPasswordLength, MinimumLength = ValidationConstants.MinPasswordLength)]
    public string NewPassword { get; set; } = "";
}
