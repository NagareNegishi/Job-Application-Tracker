using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;

namespace JobTrackerApi.Services;

/// <summary>Production implementation — sends emails via AWS SES v2.</summary>
public class SesEmailService : IEmailService
{
    private readonly IAmazonSimpleEmailServiceV2 _ses;
    private readonly string _fromAddress;

    public SesEmailService(IAmazonSimpleEmailServiceV2 ses, IConfiguration configuration)
    {
        _ses = ses;
        _fromAddress = configuration["Email:FromAddress"]
            ?? throw new InvalidOperationException("Email:FromAddress is not configured.");
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var request = new SendEmailRequest
        {
            FromEmailAddress = _fromAddress,
            Destination = new Destination { ToAddresses = [to] },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content { Data = subject },
                    Body = new Body { Html = new Content { Data = htmlBody } }
                }
            }
        };

        await _ses.SendEmailAsync(request);
    }
}
