namespace JobTrackerApi.Models;
/// <summary>
/// Represents a contact person associated with a job application
/// </summary>
public class Contact {
    public required string Name { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
}