namespace JobTrackerApi.Models;

/// <summary>EF Core entity tracking issued refresh tokens for rotation and revocation.</summary>
public class RefreshToken
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;  // opaque GUID, what the client stores
    public string UserId { get; set; } = string.Empty; // owner
    public DateTime ExpiresAt { get; set; }            // when it stops being valid
    public DateTime? RevokedAt { get; set; }           // null = active, set = revoked

    // Active if not revoked and not expired
    public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
}
