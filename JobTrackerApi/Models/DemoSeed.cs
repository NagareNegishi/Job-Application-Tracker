namespace JobTrackerApi.Models;

/// <summary>Static seed data for the demo user account.</summary>
public static class DemoSeed
{
    // Company + Role pairs used to detect which jobs are missing on demo login
    public static readonly (string Company, string Role)[] JobKeys =
    [
        ("Sample Corp", "Software Engineer"),
        ("Demo Industries", "Full Stack Developer"),
        ("Example Ltd", "Backend Developer")
    ];

    // Dates are relative to now so they always look recent after a reset
    public static List<Job> CreateJobs(string userId)
    {
        var now = DateTime.UtcNow;
        return
        [
            new Job
            {
                UserId = userId,
                Company = "Sample Corp",
                Role = "Software Engineer",
                Status = JobStatus.Wishlist,
                Priority = Priority.High,
                Description = "Full-stack role focused on internal tooling.",
                Notes = "Referred by a contact — worth following up."
            },
            new Job
            {
                UserId = userId,
                Company = "Demo Industries",
                Role = "Full Stack Developer",
                Status = JobStatus.Interview,
                Priority = Priority.Urgent,
                AppliedAt = now.AddDays(-21),
                Description = "Product-focused team building B2B SaaS.",
                Notes = "Great culture fit. Comp range aligns well.",
                Contacts =
                [
                    new Contact { Name = "Alex Morgan", Role = "Hiring Manager" }
                ],
                Correspondences =
                [
                    new Correspondence { Date = now.AddDays(-21), Note = "Submitted application via careers portal." },
                    new Correspondence { Date = now.AddDays(-14), Note = "Recruiter reached out — phone screen scheduled." },
                    new Correspondence { Date = now.AddDays(-7),  Note = "Phone screen completed. Moving to technical round." },
                    new Correspondence { Date = now.AddDays(-2),  Note = "Technical interview completed. Awaiting feedback." }
                ]
            },
            new Job
            {
                UserId = userId,
                Company = "Example Ltd",
                Role = "Backend Developer",
                Status = JobStatus.Rejected,
                Priority = Priority.Low,
                AppliedAt = now.AddDays(-45),
                ClosedAt = now.AddDays(-10),
                Notes = "Position filled internally.",
                Correspondences =
                [
                    new Correspondence { Date = now.AddDays(-45), Note = "Applied online." },
                    new Correspondence { Date = now.AddDays(-10), Note = "Received rejection email." }
                ]
            }
        ];
    }
}
