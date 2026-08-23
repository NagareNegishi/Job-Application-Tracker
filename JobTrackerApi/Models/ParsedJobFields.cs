using System.Text.Json.Serialization;

namespace JobTrackerApi.Models;

/// <summary>
/// Fields extracted from a raw job listing by the AI parser.
/// Every property that Claude extracts must have [JsonPropertyName] with the exact key name
/// from the system prompt. ClaudeParsingService derives its known-keys set from these attributes
/// via reflection — a property without [JsonPropertyName] is excluded from both deserialization
/// and the unknown-key logging check. Description is intentionally unannotated: it is set by
/// the backend directly, not extracted by Claude.
/// </summary>
public class ParsedJobFields
{
    // Null fields are omitted from the JSON response — frontend skips them in the merge step.
    [JsonPropertyName("company")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Company { get; set; }

    [JsonPropertyName("role")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Role { get; set; }

    [JsonPropertyName("jobUrl")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? JobUrl { get; set; }

    [JsonPropertyName("location")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Location { get; set; }

    [JsonPropertyName("workMode")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public WorkMode? WorkMode { get; set; }

    [JsonPropertyName("salaryMin")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? SalaryMin { get; set; }

    [JsonPropertyName("salaryMax")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? SalaryMax { get; set; }

    // DateOnly serializes as "YYYY-MM-DD" — DateTime would include a time component that breaks date inputs.
    [JsonPropertyName("closedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateOnly? ClosedAt { get; set; }

    [JsonPropertyName("source")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Source { get; set; }

    // Not extracted by Claude — the backend passes the input text through directly.
    // No [JsonPropertyName]: intentionally excluded from the known-keys reflection check.
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }
}
