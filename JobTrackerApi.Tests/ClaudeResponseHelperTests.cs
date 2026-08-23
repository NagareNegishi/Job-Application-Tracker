namespace JobTrackerApi.Tests;
using JobTrackerApi.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Text.Json.Serialization;

/// <summary>Tests for ClaudeResponseHelper — shared JSON extraction and contract-issue logging used by ClaudeParsingService and ClaudeAnalysisService.</summary>
public class ClaudeResponseHelperTests
{
    private record TestModel(
        [property: JsonPropertyName("foo")] string  Foo,
        [property: JsonPropertyName("bar")] string? Bar
    );

    // ---- ExtractJson ----

    [Fact]
    public void ExtractJson_CleanJson_ReturnsUnchanged()
    {
        var json = ClaudeResponseHelper.ExtractJson("""{"foo":"a","bar":"b"}""", NullLogger.Instance, "Test");

        Assert.Equal("""{"foo":"a","bar":"b"}""", json);
    }

    [Fact]
    public void ExtractJson_ProseAroundJson_ExtractsObjectOnly()
    {
        var raw = "Sure, here you go:\n{\"foo\":\"a\"}\nHope that helps!";

        var json = ClaudeResponseHelper.ExtractJson(raw, NullLogger.Instance, "Test");

        Assert.Equal("""{"foo":"a"}""", json);
    }

    [Fact]
    public void ExtractJson_NoBraces_ReturnsEmptyObjectAndLogsWarning()
    {
        var loggerMock = new Mock<ILogger>();

        var json = ClaudeResponseHelper.ExtractJson("no json here", loggerMock.Object, "Test");

        Assert.Equal("{}", json);
        VerifyWarningLogged(loggerMock);
    }

    [Fact]
    public void ExtractJson_ClosingBraceBeforeOpeningBrace_ReturnsEmptyObject()
    {
        var json = ClaudeResponseHelper.ExtractJson("} weird {", NullLogger.Instance, "Test");

        Assert.Equal("{}", json);
    }

    // ---- LogContractIssues ----

    [Fact]
    public void LogContractIssues_AllKnownNonNullKeys_LogsNothing()
    {
        var loggerMock = new Mock<ILogger>();
        var knownKeys  = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        ClaudeResponseHelper.LogContractIssues("""{"foo":"a","bar":"b"}""", knownKeys, loggerMock.Object, "Test");

        VerifyNoWarningLogged(loggerMock);
    }

    [Fact]
    public void LogContractIssues_UnknownKey_LogsWarning()
    {
        var loggerMock = new Mock<ILogger>();
        var knownKeys  = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        ClaudeResponseHelper.LogContractIssues("""{"foo":"a","unexpected":"x"}""", knownKeys, loggerMock.Object, "Test");

        VerifyWarningLogged(loggerMock);
    }

    [Fact]
    public void LogContractIssues_NullKnownField_LogsWarning()
    {
        var loggerMock = new Mock<ILogger>();
        var knownKeys  = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        ClaudeResponseHelper.LogContractIssues("""{"foo":null,"bar":"b"}""", knownKeys, loggerMock.Object, "Test");

        VerifyWarningLogged(loggerMock);
    }

    [Fact]
    public void LogContractIssues_EmptyObject_LogsWarning()
    {
        var loggerMock = new Mock<ILogger>();
        var knownKeys  = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        ClaudeResponseHelper.LogContractIssues("{}", knownKeys, loggerMock.Object, "Test");

        VerifyWarningLogged(loggerMock);
    }

    [Fact]
    public void LogContractIssues_UnparseableJson_DoesNotThrow()
    {
        var knownKeys = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        var ex = Record.Exception(() =>
            ClaudeResponseHelper.LogContractIssues("not json", knownKeys, NullLogger.Instance, "Test"));

        Assert.Null(ex);
    }

    // ---- GetKnownKeys ----

    [Fact]
    public void GetKnownKeys_ReturnsJsonPropertyNames()
    {
        var keys = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        Assert.Equal(new HashSet<string> { "foo", "bar" }, keys);
    }

    [Fact]
    public void GetKnownKeys_CachesAcrossCalls()
    {
        var first  = ClaudeResponseHelper.GetKnownKeys<TestModel>();
        var second = ClaudeResponseHelper.GetKnownKeys<TestModel>();

        Assert.Same(first, second);
    }

    private static void VerifyWarningLogged(Mock<ILogger> loggerMock) =>
        loggerMock.Verify(l => l.Log(
            LogLevel.Warning,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception?>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);

    private static void VerifyNoWarningLogged(Mock<ILogger> loggerMock) =>
        loggerMock.Verify(l => l.Log(
            LogLevel.Warning,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception?>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
}
