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

    // Exceeding the array count cap on WorkModes must fail validation
    [Fact]
    public void ProfileDTO_ArrayCap_WorkModes_Fails()
    {
        // Arrange: 4 items — one over the 3-item cap
        var dto = new ProfileDTO
        {
            WorkModes = [WorkMode.OnSite, WorkMode.Remote, WorkMode.Hybrid, WorkMode.OnSite]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.WorkModes)));
    }

    // Exceeding the array count cap on ContractTypes must fail validation
    [Fact]
    public void ProfileDTO_ArrayCap_ContractTypes_Fails()
    {
        // Arrange: 7 items — one over the 6-item cap
        var dto = new ProfileDTO
        {
            ContractTypes =
            [
                ContractType.FullTimePermanent, ContractType.FullTimeContract, ContractType.PartTime,
                ContractType.Casual, ContractType.Internship, ContractType.Temporary,
                ContractType.FullTimePermanent
            ]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.ContractTypes)));
    }

    // Exceeding the array count cap on PreferredLocations must fail validation
    [Fact]
    public void ProfileDTO_ArrayCap_PreferredLocations_Fails()
    {
        // Arrange: 11 items — one over the 10-item cap
        var dto = new ProfileDTO
        {
            PreferredLocations = Enumerable.Range(0, 11)
                .Select(i => new PreferredLocationEntry { Country = "NZ" })
                .ToList()
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.PreferredLocations)));
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

    // A location area item exceeding the per-item length cap must fail validation
    [Fact]
    public void ProfileDTO_ItemLength_LocationAreaTooLong_Fails()
    {
        // Arrange: one area that is one character over the 100-char cap
        var dto = new ProfileDTO
        {
            PreferredLocations =
            [
                new PreferredLocationEntry
                {
                    Country = "NZ",
                    Areas = [new string('a', ValidationConstants.MaxProfileLocationAreaItemLength + 1)]
                }
            ]
        };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ProfileDTO.PreferredLocations)));
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

    // Country codes must be uppercase — lowercase must fail the regex
    [Fact]
    public void PreferredLocationEntry_Country_Lowercase_Fails()
    {
        // Arrange: "nz" is valid ISO format but lowercase — regex requires [A-Z]{2}
        var entry = new PreferredLocationEntry { Country = "nz" };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(PreferredLocationEntry.Country)));
    }

    // Country codes longer than 2 characters must fail validation
    [Fact]
    public void PreferredLocationEntry_Country_ThreeChars_Fails()
    {
        // Arrange: "NZL" is the ISO 3166-1 alpha-3 code — wrong standard, too long
        var entry = new PreferredLocationEntry { Country = "NZL" };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(PreferredLocationEntry.Country)));
    }

    // A valid ISO 3166-1 alpha-2 code must pass validation
    [Fact]
    public void PreferredLocationEntry_Country_ValidCode_Passes()
    {
        // Arrange
        var entry = new PreferredLocationEntry { Country = "NZ" };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    // A negative MinAmount must fail the [Range] attribute
    [Fact]
    public void SalaryExpectation_MinAmount_Negative_Fails()
    {
        var entry = new SalaryExpectation { MinAmount = -1, Currency = "NZD", Period = SalaryPeriod.Annual };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(SalaryExpectation.MinAmount)));
    }

    // A MinAmount over the ceiling must fail the [Range] attribute
    [Fact]
    public void SalaryExpectation_MinAmount_OverMax_Fails()
    {
        var entry = new SalaryExpectation
        {
            MinAmount = ValidationConstants.MaxSalaryAmount + 1,
            Currency = "NZD",
            Period = SalaryPeriod.Annual
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(SalaryExpectation.MinAmount)));
    }

    // Lowercase currency must fail the regex
    [Fact]
    public void SalaryExpectation_Currency_Lowercase_Fails()
    {
        var entry = new SalaryExpectation { MinAmount = 50000, Currency = "nzd", Period = SalaryPeriod.Annual };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(SalaryExpectation.Currency)));
    }

    // A currency code of the wrong length must fail the regex
    [Fact]
    public void SalaryExpectation_Currency_WrongLength_Fails()
    {
        var entry = new SalaryExpectation { MinAmount = 50000, Currency = "NZD1", Period = SalaryPeriod.Annual };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(SalaryExpectation.Currency)));
    }

    // An omitted Period must fail the [Required] attribute
    [Fact]
    public void SalaryExpectation_Period_Omitted_Fails()
    {
        var entry = new SalaryExpectation { MinAmount = 50000, Currency = "NZD" };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(SalaryExpectation.Period)));
    }

    // A fully valid SalaryExpectation must pass validation
    [Fact]
    public void SalaryExpectation_Valid_Passes()
    {
        var entry = new SalaryExpectation { MinAmount = 90000, Currency = "NZD", Period = SalaryPeriod.Annual };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.True(isValid);
        Assert.Empty(results);
    }

    // FromYear in the future must fail the IValidatableObject check
    [Fact]
    public void WorkHistoryEntry_FromYear_FutureYear_Fails()
    {
        // Arrange: two years from now — always future regardless of when the test runs
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            FromYear = DateTime.UtcNow.Year + 2,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.FromYear)));
    }

    // ToYear earlier than FromYear must fail validation
    [Fact]
    public void WorkHistoryEntry_ToYear_BeforeFromYear_Fails()
    {
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            FromYear = 2023, ToYear = 2022,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.ToYear)));
    }

    // Same year, ToMonth earlier than FromMonth must fail validation
    [Fact]
    public void WorkHistoryEntry_ToMonth_BeforeFromMonth_SameYear_Fails()
    {
        // Arrange: both in 2023 but June → January is backwards
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            FromYear = 2023, FromMonth = 6,
            ToYear = 2023, ToMonth = 1,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.ToMonth)));
    }

    // ToYear in the future must fail validation
    [Fact]
    public void WorkHistoryEntry_ToYear_FutureYear_Fails()
    {
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            FromYear = 2022, ToYear = DateTime.UtcNow.Year + 2,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.ToYear)));
    }

    // ToYear = null means currently in this role — must pass validation
    [Fact]
    public void WorkHistoryEntry_ToYear_Null_Passes()
    {
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            FromYear = 2022,
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

    // FromYear below the valid range must fail the [Range] attribute
    [Fact]
    public void WorkHistoryEntry_FromYear_OutOfRange_Fails()
    {
        var entry = new WorkHistoryEntry
        {
            Title = "Engineer",
            Company = "Acme",
            FromYear = 1800,
            Description = "Did things."
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(WorkHistoryEntry.FromYear)));
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

    // An education From year below 1900 must fail the [Range] attribute
    [Fact]
    public void EducationEntry_From_OutOfRange_Fails()
    {
        // Arrange: 1899 is one year below the [Range(1900, 2099)] lower bound
        var entry = new EducationEntry
        {
            Institution = "MIT",
            Degree = "BSc CS",
            From = 1899
        };

        // Act
        var context = new ValidationContext(entry);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(entry, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(EducationEntry.From)));
    }
}
