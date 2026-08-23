using JobTrackerApi.Models;

namespace JobTrackerApi.Services;

/// <summary>Abstraction for AI-powered job analysis against a candidate's profile.</summary>
public interface IAnalysisService
{
    Task<AlignmentResult>  AnalyseAlignmentAsync         (UserProfile profile, string description, string? role, string? company);
    Task<SkillsResult>     AnalyseSkillsAsync            (UserProfile profile, string description, string? role, string? company);
    Task<GapsResult>       AnalyseGapsAsync              (UserProfile profile, string description, string? role, string? company);
    Task<QuestionsResult>  AnalyseQuestionsToAskAsync    (UserProfile profile, string description, string? role, string? company);
    Task<QuestionsResult>  AnalyseInterviewQuestionsAsync(UserProfile profile, string description, string? role, string? company);
}
