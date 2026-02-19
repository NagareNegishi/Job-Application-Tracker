using JobTrackerApi.Models;
using Microsoft.EntityFrameworkCore;
namespace JobTrackerApi.Data;

public class JobTrackerContext : DbContext
{
    public JobTrackerContext(DbContextOptions<JobTrackerContext> options)
        : base(options)
    {
    }

    public DbSet<Job> TodoItems { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
}