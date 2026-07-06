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
}
