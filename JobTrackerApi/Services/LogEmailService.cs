namespace JobTrackerApi.Services;

/// <summary>Development implementation — logs emails to the console instead of sending them.</summary>
public class LogEmailService : IEmailService
{
    private readonly ILogger<LogEmailService> _logger;

    public LogEmailService(ILogger<LogEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        _logger.LogInformation("--- EMAIL ---\nTo: {To}\nSubject: {Subject}\nBody:\n{Body}", to, subject, htmlBody);
        return Task.CompletedTask;
    }
}
