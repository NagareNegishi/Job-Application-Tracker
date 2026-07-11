using System.Text.Json.Serialization;

namespace JobTrackerApi.Models;

public record AlignmentResult(
    [property: JsonPropertyName("score")]     int    Score,
    [property: JsonPropertyName("reasoning")] string Reasoning
);

public record SkillsResult(
    [property: JsonPropertyName("skills")] string[] Skills
);

public record GapItem(
    [property: JsonPropertyName("gap")]    string Gap,
    [property: JsonPropertyName("advice")] string Advice
);

public record GapsResult(
    [property: JsonPropertyName("gaps")] GapItem[] Gaps
);

/// <summary>Shared shape for Questions-to-ask and Interview-questions endpoints.</summary>
public record QuestionsResult(
    [property: JsonPropertyName("questions")] string[] Questions
);

/// <summary>Thrown when Claude returns an unparseable or structurally invalid response.</summary>
public class AnalysisFormatException : Exception
{
    public AnalysisFormatException(string message, Exception? inner = null) : base(message, inner) { }
}
