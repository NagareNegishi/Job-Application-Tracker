namespace JobTrackerApi.Models;

/// <summary>
/// Response DTO for user entries in the admin user list.
/// </summary>
public class UserListItemDto
{
    public required string Id { get; set; }
    public required string Email { get; set; }
    public bool IsAiUser { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsEmailConfirmed { get; set; }
}
