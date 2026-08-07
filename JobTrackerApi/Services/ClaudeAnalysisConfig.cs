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

        SCORING:
        Rate the alignment 1–5 (1 = poor fit, 5 = excellent fit) in two steps, in order:
        1. Score how well the candidate's skills and background match the role's requirements.
        2. Count how many of the candidate's given conditions (work mode, contract type,
           salary expectation, preferred locations, other conditions) conflict with the
           listing, then cap the step 1 score: 1 conflict caps it at 4, 2 conflicts caps it
           at 3, 3 or more caps it at 2. No conflicts leaves the step 1 score unchanged.

        REASONING:
        In one sentence, state what matched or fell short between the candidate's
        skills/background and the role, and if a condition capped the score in step 2,
        name it.

        CONCERN DETECTION:
        Check whether the description reads like a genuine job listing. If it resembles a
        CV-writing/career-coaching service, a scam or pyramid-scheme pitch, or text too vague
        or garbled to be a real listing, set concern to a neutral one-sentence note naming the
        issue. Otherwise set concern to null. Never refuse to answer because of a concern.

        OUTPUT FORMAT:
        - Return valid JSON only. No markdown fences, no prose before or after.
        - `score`: integer 1–5.
        - `reasoning`: one sentence.
        - `concern`: one sentence, or JSON null — never an empty string or the text "null".

        Examples:
        {"score": 4, "reasoning": "Strong frontend skills match the role, though limited backend experience is a gap.", "concern": null}
        {"score": 1, "reasoning": "No real role details to assess fit against.", "concern": "This reads like an ad for a CV-writing service, not a job listing."}
        """;

    public static readonly string SkillsPrompt = $$"""
        Identify which of the candidate's own skills are most relevant to this specific
        role.

        SELECTION:
        Draw skills only from evidence in the Candidate Profile:
        - The Skills line.
        - The Certifications line.
        - Work history and Education entries (e.g. a tool named in a work history
          entry counts, even if not on the Skills line).
        Exclude skills the role wants that aren't evidenced in the profile.

        RANKING:
        Order most to least relevant.
        Return {{MinSkillCount}}–{{MaxSkillCount}} skills. If genuine overlap is thinner
        than {{MaxSkillCount}}, return fewer — don't pad with weak or irrelevant
        matches.

        OUTPUT FORMAT:
        - Return valid JSON only. No markdown fences, no prose before or after.
        - `skills`: array of strings, concise (1–4 words each).

        Example:
        {"skills": ["TypeScript", "React", "REST APIs", "CI/CD"]}
        """;

    public static readonly string GapsPrompt = $$"""
        Identify where the candidate's profile falls short of what this specific role
        wants.

        SELECTION:
        Find role requirements that aren't evidenced in the Candidate Profile:
        - The Skills line.
        - The Certifications line.
        - Work history and Education entries.
        Exclude requirements the profile already evidences.

        ADVICE:
        For each gap, give brief, practical advice for addressing it:
        - Point to transferable experience or a related skill if the profile shows
          one.
        - Don't suggest gaining new experience.
        - If nothing transfers, say so plainly instead of manufacturing a connection.

        RANKING:
        Order most significant gap first (biggest impact on fit for this role).
        Return {{MinGapCount}}–{{MaxGapCount}} gap objects. Never fabricate a gap to
        fill the count — if genuine gaps are fewer than {{MinGapCount}}, return only
        the ones that are real.

        OUTPUT FORMAT:
        - Return valid JSON only. No markdown fences, no prose before or after.
        - `gap` and `advice`: required strings.

        Example:
        {"gaps": [{"gap": "No cloud experience", "advice": "Highlight any personal AWS/Azure projects and transferable infrastructure knowledge from C#."}]}
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
