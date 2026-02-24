
namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;


public class JobDTOTests
{
    // Mapping from JobDTO to Job should work correctly
    [Fact]
    public void Test_ToJob()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            Status = JobStatus.Applied,
            Priority = Priority.High,
            AppliedAt = new DateTime(2024, 1, 1),
            ClosedAt = new DateTime(2024, 2, 1),
            Description = "Test job description",
            Notes = "Test notes",
            Contacts =
            [
                new Contact {
                    Name = "John Doe",
                    Email = "Some@Email",
                    Phone = "1234567890",
                    Notes = "Test contact notes"
                }
            ]
        };

        // Act
        var job = dto.ToJob();

        // Assert
        Assert.Equal(dto.Company, job.Company);
        Assert.Equal(dto.Role, job.Role);
        Assert.Equal(dto.Status, job.Status);
        Assert.Equal(dto.Priority, job.Priority);
        Assert.Equal(dto.AppliedAt, job.AppliedAt);
        Assert.Equal(dto.ClosedAt, job.ClosedAt);
        Assert.Equal(dto.Description, job.Description);
        Assert.Equal(dto.Notes, job.Notes);
        Assert.NotNull(job.Contacts);
        Assert.Single(job.Contacts);
        Assert.Equal(dto.Contacts![0].Name, job.Contacts[0].Name);
    }

    // Mapping with minimal required fields
    [Fact]
    public void Test_MinimalFields()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            Status = JobStatus.Applied
        };

        // Act
        var job = dto.ToJob();

        // Assert
        Assert.Equal(dto.Company, job.Company);
        Assert.Equal(dto.Role, job.Role);
        Assert.Equal(dto.Status, job.Status);
        Assert.Null(job.Priority);
        Assert.Null(job.AppliedAt);
        Assert.Null(job.ClosedAt);
        Assert.Null(job.Description);
        Assert.Null(job.Notes);
        Assert.Empty(job.Contacts!);
        Assert.Null(job.Documents);
        Assert.Null(job.Correspondences);
    }

    // Missing required fields
    [Fact]
    public void Test_MissingRequiredFields()
    {
        // Arrange
        var dto = new JobDTO
        {
            Role = "Software Engineer",
            Status = JobStatus.Applied
        };

        // Act & Assert
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(JobDTO.Company)));
    }
}