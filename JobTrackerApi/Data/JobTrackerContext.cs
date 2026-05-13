using JobTrackerApi.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace JobTrackerApi.Data;

public class JobTrackerContext : IdentityDbContext<ApplicationUser>
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
        // IdentityDbContext has its own OnModelCreating that configures all the Identity tables
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Job>()
            .OwnsMany(j => j.Contacts, contacts => contacts.ToJson());
        modelBuilder.Entity<Job>()
            .OwnsMany(j => j.Correspondences, correspondence => correspondence.ToJson());
    }

    public DbSet<Job> Jobs { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
}