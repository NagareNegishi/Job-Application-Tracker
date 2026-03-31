namespace JobTrackerApi.Services;

/// <summary>Abstraction for sending transactional emails.</summary>
public interface IEmailService
{
    /// <summary>Sends an email to the specified address.</summary>
    Task SendEmailAsync(string to, string subject, string htmlBody);
}
