# Implementation plan: subscription-tiers

## Maturity
lowest: 🤖 ai-audited(sonnet-5)
🌱 idea 0 · 🤖 ai-audited 9 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Three separate moving parts: (1) a tier data model with entry-cap enforcement on jobs and documents, (2) a usage-tracking table instrumenting AI calls and file transfers with an admin-facing view, and (3) an inactivity lifecycle — reminder emails, then full account deletion — with a billing-history carve-out for anyone who was ever Paid. Self-serve payment (checkout, webhooks, upgrade/downgrade wiring) is the largest single unknown, blocked on a provider choice the product doc leaves open. Tiers and usage tracking don't need payment to exist first — tier state can start as an admin-set flag and ship independently, with payment wired in once the provider is chosen.

## Risks & unknowns
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

- Payment provider is unresolved (Stripe assumed, unverified) — blocks Step 6 only; nothing else in this plan depends on it.
- "Last activity" isn't defined in the product doc — login? any job/document mutation? any API call? — needs picking before Step 5's clock logic can be built.
- Unconfirmed whether the Anthropic SDK response used by `ClaudeParsingService`/`ClaudeAnalysisService` exposes `input_tokens`/`output_tokens` in an easily-capturable form — Step 3 assumes it does.
- No scheduled/background-job mechanism is documented anywhere in this codebase — Step 5's reminder-email and purge scheduling may need new infrastructure, not just a new method on an existing service.
- Reminder-email cadence is unspecified — Step 5 needs a concrete schedule decided before it can be built, not just "more than one."
- Whether the existing `AiUser` role and the `"parse"`/`"resend-confirmation"` rate-limit policies (`Program.cs`) get replaced by tier checks or continue to coexist is unresolved — affects the scope of Steps 1, 2, and 7.
- Migration path for users an admin already hand-granted `AiUser` to is unresolved — affects Step 1's data migration.
- Whether the desktop app needs its own tier/usage-tracking gate, or shares the same backend checks, is unresolved — affects Steps 2 and 6 if the desktop app calls the API directly.

## Steps

### Step 1: Add tier state to the user model
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Replace or extend the existing `AiUser` role concept on `ApplicationUser` with an explicit tier field (Free/Paid), a last-activity timestamp, and a "moved to Free at" timestamp for the downgrade inactivity clock. Users an admin already granted `AiUser` need a migration decision (see risks) before this ships. Every other step reads from this.

### Step 2: Enforce Free-tier entry caps
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Add a cap check to job creation (`JobsController`, `POST /api/jobs`) and document upload (`DocumentsController`, `POST /api/jobs/{jobId}/documents`): 10 jobs and 1 document per job on Free, no limit on Paid. A downgraded user sitting above the cap keeps existing data but is blocked from adding more until they delete down or resubscribe — same check, evaluated against current count rather than a hard block on existing rows.

### Step 3: Usage-tracking table and instrumentation
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

New EF Core table logging one row per AI call (`ClaudeParsingService`, `ClaudeAnalysisService`) and per file upload/download (`DocumentsController`), each with user, feature type, timestamp, and — for AI calls — input/output token counts pulled from the Anthropic API response. This is what replaces the modeled estimates in `docs/ai-cost-estimate.md` with real numbers. No caps get enforced from this data yet, per the product doc's non-goals.

### Step 4: Admin usage-tracking view
🤖 ai-audited(sonnet-5) · ❔ unverified (net-new)

New admin endpoint aggregating Step 3's table into counts and computed cost, per user and system-wide, plus a section in `AdminPage` to view it. Read-only — no admin actions come out of this step, just visibility.

### Step 5: Inactivity lifecycle
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

A scheduled process that finds Free-tier accounts approaching 6 months since their last-activity timestamp (Step 1), sends reminder emails via `IEmailService`, and — after the final reminder with no activity — deletes the account and its data. Before deletion, any account that was ever Paid gets its billing/subscription history copied to a separate, non-account-linked record first. Depends on deciding "last activity" and the reminder cadence (see risks) before the scheduling logic can be written.

### Step 6: Self-serve payment integration
🤖 ai-audited(sonnet-5) · ❔ unverified (net-new)

Hosted checkout flow, webhook handling for payment success/failure/cancellation, and wiring webhook events to Step 1's tier field (upgrade on success, downgrade on cancellation or failed renewal, per Step 2's grandfathering behavior). Fully blocked on the provider decision in the product doc's open questions. Nothing else in this plan depends on it, so it can be built last, or in parallel once that decision lands.

### Step 7: Adapt the admin override
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Update `PATCH /api/admin/users/{userId}/ai-access` (or replace it with a tier-equivalent endpoint) so an admin can set a user's tier directly, coexisting with self-serve billing from Step 6. Whether this override stays permanent or gets retired once billing is live is still open.
