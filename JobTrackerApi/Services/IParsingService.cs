namespace JobTrackerApi.Services;

/// <summary>Abstraction for parsing raw job listing text into structured fields.</summary>
public interface IParsingService
{
    /// <summary>Extracts job fields from raw listing text using an AI model.</summary>
    Task<ParsedJobFields> ParseListingAsync(string text);
}
