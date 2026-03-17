namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;
using Moq;
using Microsoft.AspNetCore.Http;

public class DocumentDTOTests
{
    private static IFormFile CreateFakeFile(string fileName, long sizeInBytes = 1024)
    {
        var mockFile = new Mock<IFormFile>();
        mockFile.Setup(f => f.FileName).Returns(fileName);
        mockFile.Setup(f => f.Length).Returns(sizeInBytes);
        return mockFile.Object;
    }

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
        var mockFile = CreateFakeFile("testfile" + extension);
        var dto = new DocumentDTO { File = mockFile };

        // Act
        var result = dto.HasValidExtension();

        // Assert
        Assert.Equal(expected, result);
    }

    // Test file size constraints
    [Fact]
    public void Test_HasValidSize()
    {
        // Arrange
        var validFile = CreateFakeFile("validfile.pdf", ValidationConstants.MaxFileSize);
        var invalidFile = CreateFakeFile("invalidfile.pdf", ValidationConstants.MaxFileSize + 1);

        var validDto = new DocumentDTO { File = validFile };
        var invalidDto = new DocumentDTO { File = invalidFile };

        // Act
        var validResult = validDto.HasValidSize();
        var invalidResult = invalidDto.HasValidSize();

        // Assert
        Assert.True(validResult);
        Assert.False(invalidResult);
    }

    // Mapping test
    [Fact]
    public void Test_ToDocumentEntity()
    {
        // Arrange
        var mockFile = CreateFakeFile("testfile.pdf", 2048);
        var dto = new DocumentDTO
        {
            
            File = mockFile,
            Type = DocumentType.CV,
            Name = "Test Document"
        };

        // Act
        string storedName = dto.GenerateStoredName();
        Document doc = dto.ToDocument(1, storedName, storedName); // storageKey == storedName for local storage

        // Assert
        Assert.Equal(DocumentType.CV, doc.Type);
        Assert.Equal("Test Document.pdf", doc.Name);
        Assert.EndsWith(".pdf", doc.StorageKey);
        Assert.Equal(storedName, doc.StoredName);
        Assert.Equal(1, doc.JobId);
        Assert.True((DateTime.UtcNow - doc.CreatedAt).TotalSeconds < 5); // CreatedAt should be recent
    }
}
