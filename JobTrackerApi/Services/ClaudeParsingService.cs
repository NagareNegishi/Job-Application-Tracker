using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobTrackerApi.Models;

namespace JobTrackerApi.Services;

/// <summary>Production implementation — parses job listings via the Claude API.</summary>
public class ClaudeParsingService : IParsingService
{
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
        var json = ClaudeResponseHelper.ExtractJson(raw, _logger, "Parse");
        ClaudeResponseHelper.LogContractIssues(json, ClaudeResponseHelper.GetKnownKeys<ParsedJobFields>(), _logger, "Parse");

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

}
