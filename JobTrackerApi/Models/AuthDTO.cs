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
