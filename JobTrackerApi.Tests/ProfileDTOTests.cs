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
}
