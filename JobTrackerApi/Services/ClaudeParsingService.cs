using Anthropic;
using Anthropic.Models.Messages;
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

        // MaxRetries = 0: auto-retry adds 10–30 s of backoff with no benefit in a form UX — fail fast instead.
        _client = new AnthropicClient(apiKey: apiKey, maxRetries: 0);
        _logger = logger;
    }

    public async Task<ParsedJobFields> ParseListingAsync(string text)
    {
        var response = await _client.Messages.Create(new MessageCreateParams
        {
            Model     = ClaudeParsingConfig.Model,
            MaxTokens = ClaudeParsingConfig.MaxTokens,
            System    = ClaudeParsingConfig.SystemPrompt,
            Messages  = [new MessageParam { Role = Role.User, Content = text }]
        });

        var raw  = response.Content.OfType<TextBlock>().FirstOrDefault()?.Text ?? string.Empty;
        var json = ExtractJson(raw);
        // TODO: LogContractIssues(json);

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

    // Strips surrounding prose from Claude's response and returns the first { } block.
    // Logs if text outside JSON was found or no JSON object exists at all.
    private string ExtractJson(string raw)
    {
        var trimmed = raw.Trim();
        var start   = trimmed.IndexOf('{');
        var end     = trimmed.LastIndexOf('}');

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
}
