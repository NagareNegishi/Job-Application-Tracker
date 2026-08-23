namespace JobTrackerApi.Models;

/// <summary>General fluency level for a language a candidate speaks.</summary>
public enum LanguageFluency
{
    // Legacy rows migrated from the old string[] shape carry no fluency signal
    Unspecified,
    Elementary,
    LimitedWorking,
    ProfessionalWorking,
    FullProfessional,
    NativeOrBilingual
}
