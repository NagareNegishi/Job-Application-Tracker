# Implementation plan: subscription-tiers

## Maturity
lowest: 🤖 ai-audited(sonnet-5)
🌱 idea 0 · 🤖 ai-audited 9 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Three separate moving parts: (1) a tier data model with entry-cap enforcement on jobs and documents, (2) a usage-tracking table instrumenting AI calls and file transfers with an admin-facing view, and (3) an inactivity lifecycle — reminder emails, then full account deletion — with a billing-history carve-out for anyone who was ever Paid. Self-serve payment (checkout, webhooks, upgrade/downgrade wiring) is the largest single unknown, blocked on a provider choice the product doc leaves open. Tiers and usage tracking don't need payment to exist first — tier state can start as an admin-set flag and ship independently, with payment wired in once the provider is chosen.

## Risks & unknowns
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

- **Resolved — Paid-tier document-per-job cap.** Decided to keep Paid at today's existing value of 10 (`ValidationConstants.MaxDocumentPerJob`), unchanged; only Free drops to 1. Step 2 converts the existing flat check into a tier-conditional one (Free = 1, Paid = 10).
- **Resolved — controller exposing the 5-call job-analysis feature.** It exists: `JobTrackerApi/Controllers/AnalysisController.cs`, route `api/analyse`, with `POST /api/analyse/{alignment,skills,gaps,questions-to-ask,interview-questions}`. Each action is `[Authorize(Policy = "AiEnabled")]` + `[EnableRateLimiting("analyse")]`. This is the surface Step 3's instrumentation wraps.
- Payment provider is unresolved (Stripe assumed, unverified) — blocks Step 6 only; nothing else in this plan depends on it.
- "Last activity" isn't defined in the product doc — login? any job/document mutation? any API call? — needs picking before Step 5's clock logic can be built.
- Reminder-email cadence is unspecified — Step 5 needs a concrete schedule decided before it can be built, not just "more than one."
- Whether the existing `AiUser` role and the rate-limit policies in `Program.cs` (`"parse"` 2/min, `"analyse"` 5/min, both per IP) get replaced by tier checks or continue to coexist is unresolved — affects the scope of Steps 1, 2, and 7.
- Migration path for users an admin already hand-granted `AiUser` to is unresolved — affects Step 1's data migration.
- Whether the desktop app needs its own tier/usage-tracking gate, or shares the same backend checks, is unresolved — affects Steps 2 and 6 if the desktop app calls the API directly.

## Steps

### Step 1: Add tier state to the user model
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Models/ApplicationUser.cs:7-10, JobTrackerApi/Models/Roles.cs:6-10

`ApplicationUser` is confirmed minimal — `IdentityUser` plus a single `Preferences` field — so adding a tier field, a last-activity timestamp, and a "moved to Free at" timestamp is a small, low-risk change. `Roles.Admin`/`Roles.AiUser` are confirmed as plain string constants. Replace or extend the `AiUser` role concept with the new tier field; users an admin already granted `AiUser` need a migration decision (see risks) before this ships. Every other step reads from this.

### Step 2: Enforce Free-tier entry caps
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Controllers/JobsController.cs:92-112, JobTrackerApi/Controllers/DocumentsController.cs:94-140, JobTrackerApi/Models/ValidationConstants.cs:20

`POST /api/jobs` (`JobsController.cs:92-93`) is confirmed to have no cap check today — a 10-job Free-tier limit is genuinely new logic there. `POST /api/jobs/{jobId}/documents` (`DocumentsController.cs:94-95`) is different: a cap already exists at lines 108-111 against `ValidationConstants.MaxDocumentPerJob`, just hardcoded to 10 for everyone rather than tier-aware. This step is: add the job-count check net-new, and convert the existing document check from a flat constant to a tier-conditional one (Free = 1, Paid = 10 — Paid keeps today's existing ceiling unchanged). A downgraded user sitting above either cap keeps existing data but is blocked from adding more until they delete down or resubscribe — same checks, evaluated against current count rather than a hard block on existing rows.

### Step 3: Usage-tracking table and instrumentation
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Services/ClaudeParsingService.cs:31-39, JobTrackerApi/Services/ClaudeAnalysisService.cs:91-103, JobTrackerApi/JobTrackerApi.csproj:10 · doc: https://github.com/tghamm/Anthropic.SDK (README) — `MessageResponse.Usage.InputTokens`/`.OutputTokens`

Both AI services call `_client.Messages.GetClaudeMessageAsync(...)` from `Anthropic.SDK` — confirmed pinned at v5.10.0 in `JobTrackerApi.csproj:10`, the package's current release. The response type for this exact call exposes a `Usage` property with `InputTokens`/`OutputTokens` (plus cache-token fields), confirmed against the package's own README — so capturing real token counts per call is feasible with no workaround needed, contrary to the original plan's uncertainty here. New EF Core table logs one row per AI call (user, feature type, timestamp, input/output tokens) and per file upload/download (`DocumentsController.cs`, user, event type, timestamp). This replaces the modeled estimates in `docs/ai-cost-estimate.md` with real numbers. No caps get enforced from this data yet, per the product doc's non-goals. The analysis side is instrumented via `AnalysisController.cs`'s five `api/analyse/*` actions (see risks — resolved).

### Step 4: Admin usage-tracking view
🤖 ai-audited(sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/AdminPage.tsx:1-73

`AdminPage.tsx` is confirmed to exist as a simple table-driven page (shadcn `Table`, TanStack Query hooks from `@/hooks/adminQuery`) — a natural extension point for a second table/section. The aggregation endpoint and the admin-visible counts-and-cost view itself are net-new; only the extension point is verified. Read-only — no admin actions come out of this step, just visibility.

### Step 5: Inactivity lifecycle
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Services/IEmailService.cs:4-8, JobTrackerApi/Program.cs (full file read — no `AddHostedService`, Hangfire, Quartz, or other scheduled-job registration found)

`IEmailService.SendEmailAsync(string to, string subject, string htmlBody)` is confirmed to exist with exactly this signature — reminder emails route through it. `Program.cs` was read in full and confirmed to register no background/scheduled-job mechanism anywhere — the original plan's assumption here holds: this needs new scheduling infrastructure, not just a new method on an existing service. Build a process that finds Free-tier accounts approaching 6 months since their last-activity timestamp (Step 1), sends reminder emails, and — after the final reminder with no activity — deletes the account and its data. Before deletion, any account that was ever Paid gets its billing/subscription history copied to a separate, non-account-linked record first. Depends on deciding "last activity" and the reminder cadence (see risks) before the scheduling logic can be written.

### Step 6: Self-serve payment integration
🤖 ai-audited(sonnet-5) · ❔ unverified (net-new)

Hosted checkout flow, webhook handling for payment success/failure/cancellation, and wiring webhook events to Step 1's tier field (upgrade on success, downgrade on cancellation or failed renewal, per Step 2's grandfathering behavior). No existing payment code was found anywhere in the codebase, matching the product doc's own premise. Fully blocked on the provider decision in the product doc's open questions. Nothing else in this plan depends on it, so it can be built last, or in parallel once that decision lands.

### Step 7: Adapt the admin override
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Controllers/AdminController.cs:47-67

`PATCH /api/admin/users/{userId}/ai-access` is confirmed to exist exactly as described: blocks self-modification, requires `EmailConfirmed`, and calls `AddToRoleAsync`/`RemoveFromRoleAsync` against `Roles.AiUser`. Update it (or replace it with a tier-equivalent endpoint) so an admin can set a user's tier directly, coexisting with self-serve billing from Step 6. Whether this override stays permanent or gets retired once billing is live is still open.
