namespace JobTrackerApi.Models;

/// <summary>
/// Request body for toggling AI access on a user account.
/// </summary>
public class UpdateAiAccessDto
{
    public bool Enabled { get; set; }
}
