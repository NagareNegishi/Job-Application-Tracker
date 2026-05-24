using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobTrackerApi.Models;

namespace JobTrackerApi.Services;

/// <summary>Production implementation — parses job listings via the Claude API.</summary>
public class ClaudeParsingService : IParsingService
{
    // Derived from [JsonPropertyName] on ParsedJobFields via reflection
    // Single source of truth, computed once at class load.
    private static readonly HashSet<string> _knownKeys = typeof(ParsedJobFields)
        .GetProperties()
        .Select(p => p.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name)
        .Where(name => name != null)
        .ToHashSet()!;

    // JsonStringEnumConverter: required for Claude's string enum values.
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly AnthropicClient _client;
    private readonly ILogger<ClaudeParsingService> _logger;

    public ClaudeParsingService(IConfiguration configuration, ILogger<ClaudeParsingService> logger)
    {
        var apiKey = configuration["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is not configured.");

        // No retry policy, auto-retry adds 10–30s of backoff with no benefit in a form UX.
        _client = new AnthropicClient(apiKey, new HttpClient());
        _logger = logger;
    }

    public async Task<ParsedJobFields> ParseListingAsync(string text)
    {
        var response = await _client.Messages.GetClaudeMessageAsync(new MessageParameters
        {
            Model = ClaudeParsingConfig.Model,
            MaxTokens = ClaudeParsingConfig.MaxTokens,
            System = [new SystemMessage(ClaudeParsingConfig.SystemPrompt)],
            Messages = [new Message(RoleType.User, text)]
        });

        var raw = response.Content.OfType<TextContent>().FirstOrDefault()?.Text ?? string.Empty;
        var json = ExtractJson(raw);
        LogContractIssues(json);

        try
        {
            var result = JsonSerializer.Deserialize<ParsedJobFields>(json, _jsonOptions) ?? new ParsedJobFields();
            result.Description = text;
            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize parse response. Raw: {Raw}", raw);
            return new ParsedJobFields { Description = text };
        }
    }

    // Claude may return prose around the JSON despite instructions — extract the first { } block.
    // Falls back to "{}" so deserialization always yields a safe empty result rather than throwing.
    private string ExtractJson(string raw)
    {
        var trimmed = raw.Trim();
        var start = trimmed.IndexOf('{');
        var end = trimmed.LastIndexOf('}');

        if (start == -1 || end == -1 || end < start)
        {
            _logger.LogWarning("Parse response contains no JSON object. Raw: {Raw}", raw);
            return "{}";
        }

        var json = trimmed[start..(end + 1)];

        if (start > 0 || end < trimmed.Length - 1)
            _logger.LogWarning("Parse response contains text outside JSON. Raw: {Raw}", raw);

        return json;
    }

    // Logs contract violations to tune the system prompt over time — not surfaced to the user.
    private void LogContractIssues(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var props = doc.RootElement.EnumerateObject().ToList();

            if (props.Count == 0)
            {
                _logger.LogWarning("Parse response is an empty object.");
                return;
            }

            foreach (var prop in props)
            {
                if (!_knownKeys.Contains(prop.Name))
                    _logger.LogWarning("Unexpected key in parse response: {Key}", prop.Name);
                else if (prop.Value.ValueKind == JsonValueKind.Null)
                    _logger.LogWarning("Parsed field is null: {Field}", prop.Name);
            }
        }
        // ParseListingAsync logs and handles it
        catch (JsonException) { }
    }
}
