namespace JobTrackerApi.Models;
/// <summary>
/// Centralized constants for validation constraints across the application
/// </summary>
public static class ValidationConstants
{
    // Job entity constraints
    public const int MaxCompanyLength = 100;
    public const int MaxRoleLength = 100;
    public const int MaxDescriptionLength = 5000;
    public const int MaxNotesLength = 5000;
    public const int MaxContactSize = 10;
    public const int MaxCorrespondenceSize = 10;
    public const int MaxDocumentSize = 10;

    // Document entity constraints
    public const int MaxDocumentNameLength = 255;
    public const int MaxFileSize = 10 * 1024 * 1024; // 10 MB
    public static readonly string[] AllowedExtensions = [".pdf", ".doc", ".docx"];


}