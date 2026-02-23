namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;
/// <summary>
/// Represents a correspondence entry related to a job application
/// </summary>
public class Correspondence
{
public required DateTime Date { get; set; }

[MaxLength(ValidationConstants.MaxNotesLength)]
public required string Note { get; set; }
}
