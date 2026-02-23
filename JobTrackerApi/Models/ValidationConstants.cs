namespace JobTrackerApi.Models;
/// <summary>
/// Centralized constants for validation constraints across the application
/// </summary>
public static class ValidationConstants
{
    public const int MaxCompanyLength = 100;
    public const int MaxRoleLength = 100;
    public const int MaxDescriptionLength = 5000;
    public const int MaxNotesLength = 5000;
    public const int MaxDocumentNameLength = 255;
}