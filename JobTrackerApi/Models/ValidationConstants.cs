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

    // Document entity constraints
    public const int MaxDocumentPerJob = 10;
    public const int MaxDocumentNameLength = 255;
    public const int MaxFileSize = 10 * 1024 * 1024; // 10 MB
    public static readonly string[] AllowedExtensions = [".pdf", ".doc", ".docx"];

    // Auth / password constraints
    public const int MaxPasswordLength = 128;
    public const int MinPasswordLength = 8;
    public const int MaxTokenLength = 2048;

    // Contact entity constraints
    public const int MaxContactNameLength = 50;
    public const int MaxContactRoleLength = 50;
    public const int MaxContactEmailLength = 100;
    public const int MaxContactPhoneLength = 20;
}