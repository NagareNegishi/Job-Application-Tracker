using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace JobTrackerApi.Data;

// EF CLI tools (dotnet ef migrations/database update) need a DbContext instance at design time.
// Normally they'd build the app's DI container via Program.cs — but that throws on missing
// JWT config before DbContext is ever registered. This factory gives EF a direct path:
// it's auto-discovered by the tools and used instead of Program.cs entirely.
// https://learn.microsoft.com/en-us/ef/core/cli/dbcontext-creation?tabs=dotnet-core-cli
public class JobTrackerContextFactory : IDesignTimeDbContextFactory<JobTrackerContext>
{
    public JobTrackerContext CreateDbContext(string[] args)
    {
        // Read connection string from environment — same source as production (compose.prod.yml)
        // and the migrate job (ConnectionStrings__JobTrackerContext env var via sed).
        var config = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();

        var options = new DbContextOptionsBuilder<JobTrackerContext>()
            .UseNpgsql(config.GetConnectionString("JobTrackerContext"))
            .Options;

        return new JobTrackerContext(options);
    }
}
