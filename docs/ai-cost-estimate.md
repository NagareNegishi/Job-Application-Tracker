# AI Feature Cost Estimate — Claude API

> **This is a modeled estimate, not measured production spend.** No cost/usage
> logging exists yet for `ClaudeParsingService` or `ClaudeAnalysisService` — that's
> a real gap, not just an oversight (tracked in the private repo's
> subscription-tiers plan).
> Token counts below use ~4 characters/token, a standard approximation for English
> prose; job-listing and profile lengths are estimated ranges, not measured samples.
> Pricing is current Anthropic first-party API pricing (cached 2026-06-24) — verify
> against `https://www.anthropic.com/pricing` before locking in a paid-tier price.

## Model & pricing

Both AI features use `claude-haiku-4-5-20251001` (pinned snapshot of Claude Haiku 4.5):

| | Price |
|---|---|
| Input | $1.00 / 1M tokens |
| Output | $5.00 / 1M tokens |

## System prompt sizes (measured from source)

| Prompt | File | Characters | Tokens (~4 char/token) |
|---|---|---|---|
| Parsing system prompt | `ClaudeParsingConfig.cs` | 1,921 | ~480 |
| Alignment | `ClaudeAnalysisConfig.cs` | 2,125 | ~531 |
| Skills | `ClaudeAnalysisConfig.cs` | 1,023 | ~256 |
| Gaps | `ClaudeAnalysisConfig.cs` | 1,668 | ~417 |
| Questions to ask | `ClaudeAnalysisConfig.cs` | 1,596 | ~399 |
| Interview questions | `ClaudeAnalysisConfig.cs` | 2,273 | ~568 |

## Per-call cost estimate

Both services cap `MaxTokens` at 512, but realistic output is well under that —
structured JSON with a few short fields/sentences.

### `POST /api/jobs/parse` (1 call per listing)

| Component | Tokens | Cost |
|---|---|---|
| System prompt | ~480 | $0.00048 |
| Pasted listing text (est. 300–1,500 words) | ~500–2,000 | $0.0005–0.002 |
| Output (structured extraction) | ~150 | $0.00075 |
| **Total** | | **~$0.0017–0.0032, ≈$0.0025 typical** |

### Job analysis (5 separate calls per job — alignment, skills, gaps, questions-to-ask, interview-questions)

`ClaudeAnalysisService.FormatUserMessage` builds the candidate profile + job
description block fresh for **each** of the 5 calls. Skills, gaps,
questions-to-ask, and interview-questions send an **identical** user message;
alignment's differs only by an appended conditions section. Estimated
combined profile+job length: ~1,500 tokens (alignment: ~1,650 with
conditions).

| Analysis type | System | User msg | Output (est.) | Cost |
|---|---|---|---|---|
| Alignment | ~531 | ~1,650 | ~100 | ~$0.0027 |
| Skills | ~256 | ~1,500 | ~60 | ~$0.0021 |
| Gaps | ~417 | ~1,500 | ~150 | ~$0.0027 |
| Questions to ask | ~399 | ~1,500 | ~150 | ~$0.0026 |
| Interview questions | ~568 | ~1,500 | ~200 | ~$0.0031 |
| **Total (all 5)** | | | | **~$0.0132, ≈$0.014 typical** |

### Combined: parsing a listing + running full analysis on it

**~$0.0165 per job, ≈ 1.6–2 cents.**

## Per-user monthly cost (Anthropic spend only, excludes hosting)

| Usage level | Volume/month | Cost/month |
|---|---|---|
| Light | 20 parses, 10 full analyses | ~$0.20 |
| Moderate | 50 parses, 25 full analyses | ~$0.51 |
| Heavy | 100 parses, 50 full analyses | ~$1.03 |

Even a heavy user's raw Claude spend is roughly $1/month — small relative to
typical SaaS AI-tier pricing, and small relative to the $25-28/month AWS
hosting bill in `docs/stack-decisions.md`.

## Efficiency opportunity: prompt caching on the analysis calls

4 of the 5 analysis calls (skills, gaps, questions-to-ask, interview-questions)
send a byte-identical ~1,500-token user message, priced at full input rate
every time — none of it is cached. Cached reads run at roughly 1/10th the base
input price. Caching that shared block across the 4 repeat calls would save
roughly 3 × 1,500 tokens × ~$0.0009/1K (the delta between base and cached
input rate) ≈ **$0.004 per job analyzed**, cutting the 5-call analysis total by
roughly 25-30%. Not implemented today — worth a line item if/when the AI
feature gets revisited for cost, independent of the pricing-tier decision
itself.

## What this doesn't answer

- Actual measured usage volume (no logging exists) — the per-user scenarios
  above are assumptions, not observed behavior.
- Anthropic API costs are separate from the AWS hosting bill and aren't
  covered by AWS Budgets — no equivalent spend alert exists for them.
