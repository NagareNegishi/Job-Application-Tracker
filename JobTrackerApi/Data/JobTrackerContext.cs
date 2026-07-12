using JobTrackerApi.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace JobTrackerApi.Data;

/// <summary>EF Core DbContext; configures Contacts and Correspondences as owned JSON columns rather than separate tables.</summary>
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

        // UserProfile: one per user; cascade delete when user is removed
        modelBuilder.Entity<UserProfile>()
            .HasOne(p => p.User)
            .WithOne()
            .HasForeignKey<UserProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserProfile>()
            .HasIndex(p => p.UserId)
            .IsUnique();
        modelBuilder.Entity<UserProfile>()
            .OwnsMany(p => p.WorkingRights, wr => wr.ToJson());
        modelBuilder.Entity<UserProfile>()
            .OwnsMany(p => p.WorkHistory, wh => wh.ToJson());
        modelBuilder.Entity<UserProfile>()
            .OwnsMany(p => p.Education, e => e.ToJson());
        // PrimitiveCollection is the EF Core 8 API for List<enum/scalar>; OwnsMany only works for entity types
        modelBuilder.Entity<UserProfile>()
            .PrimitiveCollection(p => p.WorkModes)
            .HasColumnType("jsonb");
        modelBuilder.Entity<UserProfile>()
            .PrimitiveCollection(p => p.ContractTypes)
            .HasColumnType("jsonb");
    }

    public DbSet<Job> Jobs { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<UserProfile> UserProfiles { get; set; } = null!;
}