namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;


/// <summary>Mapping and validation tests for JobDTO.</summary>
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
        Assert.Equal(Priority.Low, job.Priority); // Default value
        Assert.Null(job.AppliedAt);
        Assert.Null(job.ClosedAt);
        Assert.Null(job.Description);
        Assert.Null(job.Notes);
        Assert.Equal([], job.Contacts);
        Assert.Equal([], job.Documents);
        Assert.Equal([], job.Correspondences);
    }

    // Verifies new fields (JobUrl, Source, SalaryMin, SalaryMax, Location, WorkMode, InterviewAt)
    // are mapped correctly through ToJob()
    [Fact]
    public void Test_ToJob_MapsNewFields()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            JobUrl = "https://example.com/job",
            Source = "LinkedIn",
            SalaryMin = 80000,
            SalaryMax = 120000,
            Location = "New York",
            WorkMode = WorkMode.Hybrid,
            InterviewAt = new DateTime(2024, 6, 1)
        };

        // Act
        var job = dto.ToJob();

        // Assert
        Assert.Equal(dto.JobUrl, job.JobUrl);
        Assert.Equal(dto.Source, job.Source);
        Assert.Equal(dto.SalaryMin, job.SalaryMin);
        Assert.Equal(dto.SalaryMax, job.SalaryMax);
        Assert.Equal(dto.Location, job.Location);
        Assert.Equal(dto.WorkMode, job.WorkMode);
        Assert.Equal(dto.InterviewAt, job.InterviewAt);
    }

    [Fact]
    public void Test_JobUrl_ValidHttps()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            JobUrl = "https://example.com/job"
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    [Fact]
    public void Test_JobUrl_ValidHttp()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            JobUrl = "http://example.com/job"
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    [Fact]
    public void Test_JobUrl_JavascriptScheme_Fails()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            JobUrl = "javascript:alert(1)"
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(JobDTO.JobUrl)));
    }

    [Fact]
    public void Test_JobUrl_FtpScheme_Fails()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            JobUrl = "ftp://example.com"
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(JobDTO.JobUrl)));
    }

    [Fact]
    public void Test_JobUrl_Null_Passes()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            JobUrl = null
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    [Fact]
    public void Test_Salary_MinGreaterThanMax_Fails()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            SalaryMin = 120000,
            SalaryMax = 80000
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(JobDTO.SalaryMin)));
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(JobDTO.SalaryMax)));
    }

    [Fact]
    public void Test_Salary_MinEqualsMax_Passes()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            SalaryMin = 100000,
            SalaryMax = 100000
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    [Fact]
    public void Test_Salary_OnlyMinSet_Passes()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            SalaryMin = 80000
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    [Fact]
    public void Test_WorkMode_Null_MapsToJob()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            WorkMode = null
        };

        // Act
        var job = dto.ToJob();

        // Assert
        Assert.Null(job.WorkMode);
    }

    [Fact]
    public void Test_InterviewAt_Null_MapsToJob()
    {
        // Arrange
        var dto = new JobDTO
        {
            Company = "Test Company",
            Role = "Software Engineer",
            InterviewAt = null
        };

        // Act
        var job = dto.ToJob();

        // Assert
        Assert.Null(job.InterviewAt);
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