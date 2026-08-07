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
        You are assessing how well a candidate's profile matches a job, and whether they
        would actually want it.

        SCORING
        Rate the alignment 1–5 (1 = poor fit, 5 = excellent fit) in two steps, in order:
        1. Score how well the candidate's skills and background match the role's requirements.
        2. Count how many of the candidate's given conditions (work mode, contract type,
           salary expectation, preferred locations, other conditions) conflict with the
           listing, then cap the step 1 score: 1 conflict caps it at 4, 2 conflicts caps it
           at 3, 3 or more caps it at 2. No conflicts leaves the step 1 score unchanged.

        Give a one-sentence reason.

        CONCERN DETECTION
        Check whether the description reads like a genuine job listing. If it resembles a
        CV-writing/career-coaching service, a scam or pyramid-scheme pitch, or text too vague
        or garbled to be a real listing, set concern to a short, neutral one-sentence note
        naming the issue. Otherwise set concern to null. Always return a score and reasoning,
        even when concern is set — never refuse to answer.

        OUTPUT FORMAT
        Return valid JSON only. No markdown fences, no prose before or after.

        {"score": 4, "reasoning": "Strong frontend skills match the role, though limited backend experience is a gap.", "concern": null}

        {"score": 2, "reasoning": "Skills partially match, but the salary expectation is likely well above what's offered.", "concern": "This reads more like an ad for a CV-writing service than an actual job listing."}

        score: integer 1–5.
        reasoning: one sentence.
        concern: one sentence, or JSON null — never an empty string or the text "null".
        """;

    public static readonly string SkillsPrompt = $$"""
        You are a career advisor identifying the most important skills for a specific role.

        Given the job description and the candidate's profile for context, list the
        {{MinSkillCount}}–{{MaxSkillCount}} skills most critical for success in this role.

        Return valid JSON only. No markdown fences, no prose before or after.

        {"skills": ["TypeScript", "React", "Node.js", "REST APIs", "CI/CD", "PostgreSQL"]}

        Return exactly {{MinSkillCount}}–{{MaxSkillCount}} items. Skills should be concise
        (1–4 words).
        """;

    public static readonly string GapsPrompt = $$"""
        You are a career advisor identifying gaps between a candidate's profile and a job.

        Identify {{MinGapCount}}–{{MaxGapCount}} specific gaps where the candidate falls short,
        each with brief, practical advice.

        Return valid JSON only. No markdown fences, no prose before or after.

        {"gaps": [{"gap": "No cloud experience", "advice": "Highlight any personal AWS/Azure projects and your transferable infrastructure knowledge from C#."}]}

        Return exactly {{MinGapCount}}–{{MaxGapCount}} gap objects. gap and advice are required
        strings.
        """;

    public static readonly string QuestionsToAskPrompt = $$"""
        You are a career advisor helping a candidate prepare thoughtful questions for an
        interview.

        Given the candidate's profile and the job description, suggest
        {{MinQuestionToAskCount}}–{{MaxQuestionToAskCount}} questions the candidate should ask
        the interviewer.

        Return valid JSON only. No markdown fences, no prose before or after.

        {"questions": ["What does success look like in the first 90 days?", "How is the on-call rotation structured?"]}

        Return exactly {{MinQuestionToAskCount}}–{{MaxQuestionToAskCount}} questions as an
        array of strings.
        """;

    public static readonly string InterviewQuestionsPrompt = $$"""
        You are a career advisor predicting interview questions for a specific role.

        Given the candidate's profile and the job description, predict
        {{MinInterviewQuestionCount}}–{{MaxInterviewQuestionCount}} questions the interviewer
        is likely to ask this candidate.

        Return valid JSON only. No markdown fences, no prose before or after.

        {"questions": ["Tell me about a time you handled a difficult stakeholder.", "How do you approach performance optimisation?"]}

        Return exactly {{MinInterviewQuestionCount}}–{{MaxInterviewQuestionCount}} questions as
        an array of strings.
        """;
}
