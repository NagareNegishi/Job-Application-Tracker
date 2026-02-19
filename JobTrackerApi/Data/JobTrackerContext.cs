using JobTrackerApi.Models;
using Microsoft.EntityFrameworkCore;
namespace JobTrackerApi.Data;

public class JobTrackerContext : DbContext
{
    public JobTrackerContext(DbContextOptions<JobTrackerContext> options)
        : base(options)
    {
    }

    // Contacts and Correspondences do not need their own tables, they are owned by Job and stored as JSON
    // While Complex type approach is possible in EF 10+, ComplexProperty maps a single nested object,
    // not collections, so we use OwnsMany with ToJson() instead
    // https://www.npgsql.org/efcore/mapping/json.html?tabs=data-annotations%2Ccomplex-types%2Cjsondocument
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Job>()
            .OwnsMany(j => j.Contacts, contacts => contacts.ToJson());
        modelBuilder.Entity<Job>()
            .OwnsMany(j => j.Correspondences, correspondence => correspondence.ToJson());
    }

    public DbSet<Job> TodoItems { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
}