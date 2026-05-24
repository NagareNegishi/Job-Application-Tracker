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
    // Derived from [JsonPropertyName] on ParsedJobFields via reflection — single source of truth; computed once at class load.
    private static readonly HashSet<string> _knownKeys = typeof(ParsedJobFields)
        .GetProperties()
        .Select(p => p.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name)
        .Where(name => name != null)
        .ToHashSet()!;

    // JsonStringEnumConverter: required for Claude's string enum values (e.g. "Remote" → WorkMode).
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

    public Task<ParsedJobFields> ParseListingAsync(string text)
    {
        throw new NotImplementedException();
    }
}
