
namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;

public class DocumentDTOTests
{
    // Test acceptable file extensions
    [Theory]
    [InlineData(".pdf", true)]
    [InlineData(".doc", true)]
    [InlineData(".docx", true)]
    [InlineData(".exe", false)]
    [InlineData(".txt", false)]
    [InlineData(".md", false)]
    [InlineData("", false)]
    [InlineData(".PDF", true)] // case-insensitive
    [InlineData(".DocX", true)] // case-insensitive
    [InlineData(".TXT", false)]
    public void Test_HasValidExtension(string extension, bool expected)
    {
        // Arrange
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns("test" + extension);
        var dto = new DocumentDTO { File = fileMock.Object };

        // Act
        var result = dto.HasValidExtension();

        // Assert
        Assert.Equal(expected, result);
    }

    // HasValidSize() — accepts files under 10MB, rejects over
}
