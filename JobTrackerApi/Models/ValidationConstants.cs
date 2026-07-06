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
    public const int MaxJobUrlLength = 2048;
    public const int MaxSourceLength = 100;
    public const int MaxLocationLength = 100;

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

    // Profile array count limits
    public const int MaxProfileTargetRolesCount = 10;
    public const int MaxProfileSkillsCount = 50;
    public const int MaxProfileCertificationsCount = 20;
    public const int MaxProfileLanguagesCount = 15;
    public const int MaxProfileWorkingRightsCount = 20;
    public const int MaxProfileWorkHistoryCount = 20;
    public const int MaxProfileEducationCount = 10;

    // Profile per-item string length limits
    public const int MaxProfileTargetRoleItemLength = 100;
    public const int MaxProfileSkillItemLength = 50;
    public const int MaxProfileCertificationItemLength = 100;
    public const int MaxProfileLanguageItemLength = 30;
    public const int MaxProfileWorkHistoryTitleLength = 100;
    public const int MaxProfileWorkHistoryCompanyLength = 100;
    public const int MaxProfileWorkHistoryDescriptionLength = 2000;
    public const int MaxProfileEducationInstitutionLength = 100;
    public const int MaxProfileEducationDegreeLength = 100;
}