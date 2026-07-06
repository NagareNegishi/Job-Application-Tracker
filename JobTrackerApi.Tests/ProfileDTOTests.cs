namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>Validation tests for ProfileDTO and its nested entry types.</summary>
public class ProfileDTOTests
{
    // Exceeding the array count cap on TargetRoles must fail validation
    [Fact]
    public void ProfileDTO_ArrayCap_TargetRoles_Fails()
    {
        // Arrange: 11 items — one over the 10-item cap
        var dto = new ProfileDTO
        {
            TargetRoles = Enumerable.Range(0, 11).Select(i => $"Role {i}").ToList()
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.TargetRoles)));
    }

    // A skill item exceeding the per-item length cap must fail validation
    [Fact]
    public void ProfileDTO_ItemLength_SkillTooLong_Fails()
    {
        // Arrange: one skill that is one character over the 50-char cap
        var dto = new ProfileDTO
        {
            Skills = [new string('a', ValidationConstants.MaxProfileSkillItemLength + 1)]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.Skills)));
    }

    // A target role item exceeding the per-item length cap must fail validation
    [Fact]
    public void ProfileDTO_ItemLength_TargetRoleTooLong_Fails()
    {
        // Arrange: one role that is one character over the 100-char cap
        var dto = new ProfileDTO
        {
            TargetRoles = [new string('a', ValidationConstants.MaxProfileTargetRoleItemLength + 1)]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.TargetRoles)));
    }

    // A certification item exceeding the per-item length cap must fail validation
    [Fact]
    public void ProfileDTO_ItemLength_CertificationTooLong_Fails()
    {
        // Arrange: one certification that is one character over the 100-char cap
        var dto = new ProfileDTO
        {
            Certifications = [new string('a', ValidationConstants.MaxProfileCertificationItemLength + 1)]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.Certifications)));
    }

    // A language item exceeding the per-item length cap must fail validation
    [Fact]
    public void ProfileDTO_ItemLength_LanguageTooLong_Fails()
    {
        // Arrange: one language that is one character over the 30-char cap
        var dto = new ProfileDTO
        {
            Languages = [new string('a', ValidationConstants.MaxProfileLanguageItemLength + 1)]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.Languages)));
    }

    // Country codes must be uppercase — lowercase must fail the regex
    [Fact]
    public void WorkingRightEntry_Country_Lowercase_Fails()
    {
        // Arrange: "nz" is valid ISO format but lowercase — regex requires [A-Z]{2}
        var entry = new WorkingRightEntry { Country = "nz", Status = WorkingRight.Citizen };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkingRightEntry.Country)));
    }

    // Country codes longer than 2 characters must fail validation
    [Fact]
    public void WorkingRightEntry_Country_ThreeChars_Fails()
    {
        // Arrange: "NZL" is the ISO 3166-1 alpha-3 code — wrong standard, too long
        var entry = new WorkingRightEntry { Country = "NZL", Status = WorkingRight.Citizen };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkingRightEntry.Country)));
    }

    // A valid ISO 3166-1 alpha-2 code must pass validation
    [Fact]
    public void WorkingRightEntry_Country_ValidCode_Passes()
    {
        // Arrange
        var entry = new WorkingRightEntry { Country = "NZ", Status = WorkingRight.Citizen };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    // A work history entry with a future From date must fail the IValidatableObject check
    [Fact]
    public void WorkHistoryEntry_From_FutureDate_Fails()
    {
        // Arrange: a date two years from now — always future regardless of when the test runs
        var futureDate = DateTime.UtcNow.AddYears(2).ToString("yyyy-MM");
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            From = futureDate,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.From)));
    }

    // A work history entry where To is earlier than From must fail validation
    [Fact]
    public void WorkHistoryEntry_To_BeforeFrom_Fails()
    {
        // Arrange: From is 2023-06, To is 2023-01 — earlier month, same year
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            From = "2023-06",
            To = "2023-01",
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.To)));
    }

    // A work history entry with a future To date must fail validation
    [Fact]
    public void WorkHistoryEntry_To_FutureDate_Fails()
    {
        // Arrange: From is a past date; To is two years from now
        var futureDate = DateTime.UtcNow.AddYears(2).ToString("yyyy-MM");
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            From = "2022-01",
            To = futureDate,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.To)));
    }

    // To = null means currently in this role — must pass validation
    [Fact]
    public void WorkHistoryEntry_To_Null_Passes()
    {
        // Arrange
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            From = "2022-01",
            To = null,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    // A From date that doesn't match YYYY-MM format must fail the regex attribute
    [Fact]
    public void WorkHistoryEntry_InvalidFormat_Fails()
    {
        // Arrange: "2024-1" is missing the leading zero — fails the regex
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            From = "2024-1",
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.From)));
    }

    // An education entry with a future From year must fail the IValidatableObject check
    [Fact]
    public void EducationEntry_From_FutureYear_Fails()
    {
        // Arrange: a year two years from now — always future regardless of when the test runs
        var entry = new EducationEntry
        {
            Institution = "MIT",
            Degree = "BSc CS",
            From = DateTime.UtcNow.Year + 2
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(EducationEntry.From)));
    }

    // An education entry where To is earlier than From must fail validation
    [Fact]
    public void EducationEntry_To_BeforeFrom_Fails()
    {
        // Arrange: graduated before starting
        var entry = new EducationEntry
        {
            Institution = "MIT",
            Degree = "BSc CS",
            From = 2022,
            To = 2020
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(EducationEntry.To)));
    }

    // To = null means currently enrolled — must pass validation
    [Fact]
    public void EducationEntry_To_Null_Passes()
    {
        // Arrange
        var entry = new EducationEntry
        {
            Institution = "MIT",
            Degree = "BSc CS",
            From = 2022,
            To = null
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }
}
