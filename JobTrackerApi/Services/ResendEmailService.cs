using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace JobTrackerApi.Services;

/// <summary>Production implementation — sends emails via the Resend REST API.</summary>
public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly string _fromAddress;

    public ResendEmailService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _fromAddress = configuration["Email:FromAddress"]
            ?? throw new InvalidOperationException("Email:FromAddress is not configured.");

        var apiKey = configuration["Resend:ApiKey"]
            ?? throw new InvalidOperationException("Resend:ApiKey is not configured.");

        // Set once on the shared client — all requests inherit these
        _httpClient.BaseAddress = new Uri("https://api.resend.com/");
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var payload = new { from = _fromAddress, to, subject, html = htmlBody };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("emails", content);
        // Throws HttpRequestException on 4xx/5xx — consistent with SES SDK behaviour
        response.EnsureSuccessStatusCode();
    }
}
