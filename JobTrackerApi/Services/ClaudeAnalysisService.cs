using System.Globalization;
using System.Text;
using System.Text.Json;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using JobTrackerApi.Models;

namespace JobTrackerApi.Services;

/// <summary>Production implementation — analyses jobs against a user profile via the Claude API.</summary>
public class ClaudeAnalysisService : IAnalysisService
{
    private readonly AnthropicClient _client;
    private readonly ILogger<ClaudeAnalysisService> _logger;

    public ClaudeAnalysisService(IConfiguration configuration, ILogger<ClaudeAnalysisService> logger)
    {
        var apiKey = configuration["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is not configured.");

        // No retry policy — same deliberate choice as ClaudeParsingService.
        _client = new AnthropicClient(apiKey, new HttpClient());
        _logger = logger;
    }

    public async Task<AlignmentResult> AnalyseAlignmentAsync(UserProfile profile, string description, string? role, string? company)
    {
        var result = await CallClaudeAsync<AlignmentResult>(
            ClaudeAnalysisConfig.AlignmentPrompt,
            FormatUserMessage(profile, description, role, company, includeConditions: true));

        if (result.Score < 1 || result.Score > 5 || string.IsNullOrWhiteSpace(result.Reasoning))
            throw new AnalysisFormatException($"Alignment response failed field validation. Score={result.Score}");

        return result;
    }

    public async Task<SkillsResult> AnalyseSkillsAsync(UserProfile profile, string description, string? role, string? company)
    {
        var result = await CallClaudeAsync<SkillsResult>(
            ClaudeAnalysisConfig.SkillsPrompt,
            FormatUserMessage(profile, description, role, company));

        if (result.Skills is not { Length: >= 1 })
            throw new AnalysisFormatException("Skills response is empty or missing.");

        return result;
    }

    public async Task<GapsResult> AnalyseGapsAsync(UserProfile profile, string description, string? role, string? company)
    {
        var result = await CallClaudeAsync<GapsResult>(
            ClaudeAnalysisConfig.GapsPrompt,
            FormatUserMessage(profile, description, role, company));

        if (result.Gaps is not { Length: >= 1 })
            throw new AnalysisFormatException("Gaps response is empty or missing.");

        return result;
    }

    public async Task<QuestionsResult> AnalyseQuestionsToAskAsync(UserProfile profile, string description, string? role, string? company)
    {
        var result = await CallClaudeAsync<QuestionsResult>(
            ClaudeAnalysisConfig.QuestionsToAskPrompt,
            FormatUserMessage(profile, description, role, company));

        if (result.Questions is not { Length: >= 1 })
            throw new AnalysisFormatException("Questions-to-ask response is empty or missing.");

        return result;
    }

    public async Task<QuestionsResult> AnalyseInterviewQuestionsAsync(UserProfile profile, string description, string? role, string? company)
    {
        var result = await CallClaudeAsync<QuestionsResult>(
            ClaudeAnalysisConfig.InterviewQuestionsPrompt,
            FormatUserMessage(profile, description, role, company));

        if (result.Questions is not { Length: >= 1 })
            throw new AnalysisFormatException("Interview questions response is empty or missing.");

        return result;
    }

    private async Task<T> CallClaudeAsync<T>(string systemPrompt, string userMessage)
    {
        string raw;
        try
        {
            var response = await _client.Messages.GetClaudeMessageAsync(new MessageParameters
            {
                Model     = ClaudeAnalysisConfig.Model,
                MaxTokens = ClaudeAnalysisConfig.MaxTokens,
                System    = [new SystemMessage(systemPrompt)],
                Messages  = [new Message(RoleType.User, userMessage)]
            });
            raw = response.Content.OfType<TextContent>().FirstOrDefault()?.Text ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude API call failed during analysis.");
            throw new AnalysisFormatException("Claude API request failed.", ex);
        }

        var json = ExtractJson(raw);
        try
        {
            return JsonSerializer.Deserialize<T>(json)
                ?? throw new AnalysisFormatException($"Claude analysis response deserialized to null. Raw: {raw}");
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize analysis response. Raw: {Raw}", raw);
            throw new AnalysisFormatException("Claude analysis response could not be parsed.", ex);
        }
    }

    // Claude may return prose around the JSON despite instructions — extract the first { } block.
    // Falls back to "{}" so deserialization always runs; field validation in each public method catches the empty result.
    private string ExtractJson(string raw)
    {
        var trimmed = raw.Trim();
        var start   = trimmed.IndexOf('{');
        var end     = trimmed.LastIndexOf('}');

        if (start == -1 || end == -1 || end < start)
        {
            _logger.LogWarning("Analysis response contains no JSON object. Raw: {Raw}", raw);
            return "{}";
        }

        var json = trimmed[start..(end + 1)];

        if (start > 0 || end < trimmed.Length - 1)
            _logger.LogWarning("Analysis response contains text outside JSON. Raw: {Raw}", raw);

        return json;
    }

    /// <summary>Builds the user-turn message sent to Claude: profile summary, optionally conditions, then the job.</summary>
    private static string FormatUserMessage(UserProfile profile, string description, string? role, string? company, bool includeConditions = false)
    {
        var sb = new StringBuilder();

        sb.AppendLine("## Candidate Profile");
        sb.AppendLine($"Target roles: {(profile.TargetRoles.Count > 0 ? string.Join(", ", profile.TargetRoles) : "None listed")}");
        sb.AppendLine($"Skills: {(profile.Skills.Count > 0 ? string.Join(", ", profile.Skills) : "None listed")}");
        sb.AppendLine($"Certifications: {(profile.Certifications.Count > 0 ? string.Join(", ", profile.Certifications) : "None listed")}");
        sb.AppendLine($"Languages: {(profile.Languages.Count > 0 ? string.Join(", ", profile.Languages.Select(l => $"{l.Language} ({l.Fluency})")) : "None listed")}");

        if (profile.WorkingRights.Count > 0)
            sb.AppendLine($"Working rights: {string.Join(", ", profile.WorkingRights.Select(r => $"{r.Country}: {r.Status}"))}");

        if (profile.WorkHistory.Count > 0)
        {
            sb.AppendLine("Work history:");
            foreach (var w in profile.WorkHistory)
            {
                sb.AppendLine($"  - {w.Title} at {w.Company} ({FormatDateRange(w.FromYear, w.FromMonth, w.ToYear, w.ToMonth)})");
                if (!string.IsNullOrWhiteSpace(w.Description))
                    sb.AppendLine($"    {w.Description}");
            }
        }

        if (profile.Education.Count > 0)
        {
            sb.AppendLine("Education:");
            foreach (var e in profile.Education)
            {
                var to = e.To.HasValue ? e.To.Value.ToString() : "present";
                sb.AppendLine($"  - {e.Degree}, {e.Institution} ({e.From} – {to})");
            }
        }

        // Only Alignment weighs conditions (work mode/salary/location fit) — the other four types are background-only.
        if (includeConditions)
            sb.Append(FormatConditionsSection(profile));

        sb.AppendLine();
        sb.AppendLine("## Job");
        if (role    is not null) sb.AppendLine($"Role: {role}");
        if (company is not null) sb.AppendLine($"Company: {company}");
        sb.AppendLine();
        sb.AppendLine("## Job Description");
        sb.Append(description);

        return sb.ToString();
    }

    /// <summary>Renders the candidate's stated conditions as a prompt section; empty string if none are set.</summary>
    private static string FormatConditionsSection(UserProfile profile)
    {
        var hasConditions = profile.WorkModes.Count > 0
            || profile.ContractTypes.Count > 0
            || profile.SalaryExpectations.Count > 0
            || profile.PreferredLocations.Count > 0
            || !string.IsNullOrWhiteSpace(profile.AdditionalConditions);

        if (!hasConditions)
            return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine();
        sb.AppendLine("## Candidate Conditions");

        if (profile.WorkModes.Count > 0)
            sb.AppendLine($"Acceptable work modes: {string.Join(", ", profile.WorkModes)}");

        if (profile.ContractTypes.Count > 0)
            sb.AppendLine($"Acceptable contract types: {string.Join(", ", profile.ContractTypes)}");

        if (profile.SalaryExpectations.Count == 1)
        {
            var s = profile.SalaryExpectations[0];
            sb.AppendLine($"Minimum salary expectation: {s.MinAmount} {s.Currency} ({s.Period})");
        }
        else if (profile.SalaryExpectations.Count > 1)
        {
            sb.AppendLine("Minimum salary expectations (apply the one matching the role's market/currency):");
            foreach (var s in profile.SalaryExpectations)
                sb.AppendLine($"- {s.MinAmount} {s.Currency} ({s.Period})");
        }

        if (profile.PreferredLocations.Count > 0)
        {
            var locations = profile.PreferredLocations.Select(l =>
                l.Areas.Count > 0 ? $"{l.Country} ({string.Join("/", l.Areas)})" : l.Country);
            sb.AppendLine($"Preferred locations: {string.Join(", ", locations)}");
        }

        if (!string.IsNullOrWhiteSpace(profile.AdditionalConditions))
            sb.AppendLine($"Additional conditions: {profile.AdditionalConditions}");

        return sb.ToString();
    }

    private static string FormatDateRange(int fromYear, int? fromMonth, int? toYear, int? toMonth)
    {
        var from = fromMonth.HasValue
            ? $"{new DateTime(2000, fromMonth.Value, 1).ToString("MMM", CultureInfo.InvariantCulture)} {fromYear}"
            : $"{fromYear}";
        var to = toYear.HasValue
            ? (toMonth.HasValue
                ? $"{new DateTime(2000, toMonth.Value, 1).ToString("MMM", CultureInfo.InvariantCulture)} {toYear}"
                : $"{toYear}")
            : "present";
        return $"{from} – {to}";
    }
}
