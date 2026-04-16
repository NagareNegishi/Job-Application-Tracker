namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

public class AuthDTOTests
{
    // RegisterDTO requires email
    [Fact]
    public void Test_RegisterDTO_MissingEmail()
    {
        // Arrange
        var dto = new RegisterDTO { Password = "Password1!" };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(RegisterDTO.Email)));
    }

    // RegisterDTO rejects malformed email
    [Fact]
    public void Test_RegisterDTO_InvalidEmail()
    {
        // Arrange
        var dto = new RegisterDTO { Email = "not-an-email", Password = "Password1!" };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(RegisterDTO.Email)));
    }

    // RegisterDTO requires password
    [Fact]
    public void Test_RegisterDTO_MissingPassword()
    {
        // Arrange
        var dto = new RegisterDTO { Email = "user@example.com" };

        // Act
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(dto, context, results, true);

        // Assert
        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(RegisterDTO.Password)));
    }
}
