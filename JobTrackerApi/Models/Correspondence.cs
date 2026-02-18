namespace JobTrackerApi.Models;
/// <summary>
/// Represents a correspondence entry related to a job application
/// </summary>
public class Correspondence
{
public required DateTime Date { get; set; }
public required string Note { get; set; }
}
