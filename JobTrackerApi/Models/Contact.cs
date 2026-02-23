using System.ComponentModel.DataAnnotations;

namespace JobTrackerApi.Models;
/// <summary>
/// Represents a contact person associated with a job application
/// </summary>
public class Contact {
    [MaxLength(ValidationConstants.MaxContactNameLength)]
    public required string Name { get; set; }

    [EmailAddress]
    [MaxLength(ValidationConstants.MaxContactEmailLength)]
    public string? Email { get; set; }

    [MaxLength(ValidationConstants.MaxContactRoleLength)]
    public string? Role { get; set; }
    
    [Phone]
    [MaxLength(ValidationConstants.MaxContactPhoneLength)]
    public string? Phone { get; set; }

    [MaxLength(ValidationConstants.MaxNotesLength)]
    public string? Notes { get; set; }
}