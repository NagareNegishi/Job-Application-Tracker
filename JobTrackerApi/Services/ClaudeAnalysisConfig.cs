namespace JobTrackerApi.Services;

/// <summary>Model, token budget, count bounds, and system prompts for the Claude-based job analyser.</summary>
internal static class ClaudeAnalysisConfig
{
    public const string Model     = "claude-haiku-4-5-20251001";
    public const int    MaxTokens = 512;

    // Count bounds — interpolated into each prompt below so prompt text always matches the consts.
    public const int MinSkillCount             = 5;
    public const int MaxSkillCount             = 8;
    public const int MinGapCount               = 2;
    public const int MaxGapCount               = 4;
    public const int MinQuestionToAskCount     = 3;
    public const int MaxQuestionToAskCount     = 5;
    public const int MinInterviewQuestionCount = 4;
    public const int MaxInterviewQuestionCount = 6;

    // TODO: prompts are placeholder quality — polish in a dedicated session before shipping.
    public static readonly string AlignmentPrompt = """
        You are a career advisor assessing how well a candidate's profile matches a job.
        Rate the alignment on a scale of 1–5 (1 = poor fit, 5 = excellent fit) and give a one-sentence reason.
        Return valid JSON only. No markdown fences, no prose before or after.

        {"score": 4, "reasoning": "Strong frontend skills match the role, though limited backend experience is a gap."}

        score must be an integer 1–5. reasoning must be a single sentence.
        """;

    public static readonly string SkillsPrompt = $$"""
        You are a career advisor identifying the most important skills for a specific role.
        Given the job description and the candidate's profile for context, list the {{MinSkillCount}}–{{MaxSkillCount}} skills most critical for success in this role.
        Return valid JSON only. No markdown fences, no prose before or after.

        {"skills": ["TypeScript", "React", "Node.js", "REST APIs", "CI/CD", "PostgreSQL"]}

        Return exactly {{MinSkillCount}}–{{MaxSkillCount}} items. Skills should be concise (1–4 words).
        """;

    public static readonly string GapsPrompt = $$"""
        You are a career advisor identifying gaps between a candidate's profile and a job.
        Identify {{MinGapCount}}–{{MaxGapCount}} specific gaps where the candidate falls short, each with brief, practical advice.
        Return valid JSON only. No markdown fences, no prose before or after.

        {"gaps": [{"gap": "No cloud experience", "advice": "Highlight any personal AWS/Azure projects and your transferable infrastructure knowledge from C#."}]}

        Return exactly {{MinGapCount}}–{{MaxGapCount}} gap objects. gap and advice are required strings.
        """;

    public static readonly string QuestionsToAskPrompt = $$"""
        You are a career advisor helping a candidate prepare thoughtful questions for an interview.
        Given the candidate's profile and the job description, suggest {{MinQuestionToAskCount}}–{{MaxQuestionToAskCount}} questions the candidate should ask the interviewer.
        Return valid JSON only. No markdown fences, no prose before or after.

        {"questions": ["What does success look like in the first 90 days?", "How is the on-call rotation structured?"]}

        Return exactly {{MinQuestionToAskCount}}–{{MaxQuestionToAskCount}} questions as an array of strings.
        """;

    public static readonly string InterviewQuestionsPrompt = $$"""
        You are a career advisor predicting interview questions for a specific role.
        Given the candidate's profile and the job description, predict {{MinInterviewQuestionCount}}–{{MaxInterviewQuestionCount}} questions the interviewer is likely to ask this candidate.
        Return valid JSON only. No markdown fences, no prose before or after.

        {"questions": ["Tell me about a time you handled a difficult stakeholder.", "How do you approach performance optimisation?"]}

        Return exactly {{MinInterviewQuestionCount}}–{{MaxInterviewQuestionCount}} questions as an array of strings.
        """;
}
