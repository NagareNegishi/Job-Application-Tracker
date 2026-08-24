# Product plan: subscription-tiers

## Maturity
lowest: 🤖 ai-audited(sonnet-5)
🌱 idea 0 · 🤖 ai-audited 10 · 👤 human-ok 0 · ✅ settled 0

## about
🤖 ai-audited(sonnet-5) — reshaped from a binary Free/AI gate into capped-Free vs. unlimited-Paid, plus an inactivity lifecycle

Let users self-serve between a capped Free tier and an unlimited Paid tier, replacing today's admin-only AI-access toggle. Free-tier limits target what actually drives hosting cost — job and document storage, not AI calls or file transfers — and inactive Free accounts get reclaimed after a notice period.

## problem / motivation
🤖 ai-audited(sonnet-5) — added the cost-driver finding from the hosting-migration investigation as a second motivating problem alongside the original admin-scaling one

AI access is currently granted only by an admin, one user at a time, via `PATCH /api/admin/users/{userId}/ai-access` (`AdminController.cs`) — that doesn't scale past a handful of hand-picked users, and there's no way for someone to sign up and pay for access themselves. Separately, a review of the app's actual AWS costs (`docs/plans/hosting-migration/product.md`) found the database itself — not the AI feature or file storage, both of which cost roughly $1/month or less even under heavy use (`docs/ai-cost-estimate.md`) — is what drives hosting spend. Left unmanaged, free signups accumulate job and document data indefinitely, growing that same cost driver with no offsetting revenue. A tier model needs to solve both: self-serve payment, and a Free tier whose limits and lifecycle actually bound the cost it creates.

## goal
🤖 ai-audited(sonnet-5) — folded in the usage-tracking goal, since it was decided as the replacement for rate-capping

A user can sign up, land on a capped Free tier, and self-upgrade to an unlimited Paid tier by paying, with no admin involved. The Free tier's entry caps and inactivity cleanup keep its cost footprint bounded on their own, and usage tracking replaces guesswork with real per-feature cost data for future pricing decisions.

## audience
🤖 ai-audited(sonnet-5) — added admin's new usage-tracking visibility

End users choosing and living within a tier; admins, who need a manual override for support/comping and visibility into the new usage-tracking data; whoever builds the payment integration.

## requirements
🤖 ai-audited(sonnet-5) — replaced the old caps-on-AI/file-usage draft with the settled shape: entry caps only, usage tracking instead of rate limits, full-deletion inactivity policy, downgrade grandfathering

- When a user signs up, the system shall default them to the Free tier: up to 10 job entries, up to 1 document per job, and unrestricted AI feature use and file upload/download.
- When a Free-tier user is at the job-entry or per-job-document cap, the system shall block adding another until one is removed or the user upgrades.
- When a user upgrades to the Paid tier, the system shall lift all entry, document, AI-feature, and file-transfer limits for as long as the subscription is active.
- When a Paid-tier subscription lapses, is cancelled, or payment fails, the system shall move the user to the Free tier, keep all existing data above the Free-tier caps as-is without trimming, and block new job/document entries beyond the caps until the user deletes down to the cap or resubscribes.
- When a user is moved to or starts on the Free tier, the system shall start a 6-month inactivity clock from that point.
- When a Free-tier account approaches 6 months of inactivity, the system shall send more than one reminder email before taking any action (exact cadence: see open questions).
- When a Free-tier account reaches 6 months of inactivity after the final reminder, the system shall delete the account and all associated data (jobs, documents, auth record).
- When a purged account was ever on the Paid tier, the system shall retain its billing/subscription history independent of the account row before deleting the account itself.
- When a user triggers the AI parsing or analysis feature, the system shall record a usage event with user, feature type, timestamp, and input/output token counts from the Anthropic API response.
- When a user uploads or downloads a document, the system shall record a usage event with user, event type, and timestamp.
- When an admin views the usage-tracking data, the system shall see aggregate counts and computed cost per feature, per user and system-wide.
- When a Free-tier user chooses to upgrade, the system shall route them through a payment flow before granting Paid-tier access.
- When payment succeeds, the system shall grant Paid-tier access automatically, with no admin step.
- When an admin wants to grant, revoke, or extend a user's tier manually, the system shall still allow that as an override alongside self-serve billing.

## stack
🤖 ai-audited(sonnet-5) — added the usage-tracking table and referenced its cost baseline

Backend: `JobTrackerApi` (.NET) — new usage-tracking table (EF Core), an inactivity-purge job, and tier-limit checks on job/document creation. Frontend: `job-tracker-ui` (React) — tier-aware UI, admin usage-tracking view. Payment provider not yet chosen (see open questions).

Underlying AI cost per user is estimated in `docs/ai-cost-estimate.md`: ~$0.0025 per parse call, ~$0.014 per full 5-part analysis, ~$0.20-$1.03/month per user depending on usage — small enough that rate-capping it isn't worth the complexity. The usage-tracking table will replace these modeled estimates with actual token counts once built.

## target device / platform
🤖 ai-audited(sonnet-5) — unchanged in substance from the original doc; desktop interaction stays open

Web app. Whether the desktop app needs its own tier/usage-tracking gate, or checks the same backend, is open (see below).

## constraints
🤖 ai-audited(sonnet-5) — added the AWS free-plan deadline and the billing-history carve-out as hard constraints

Cost must be $0 while building and at launch — no vendor plan with a monthly minimum ahead of real usage. Raw card data must never be handled or stored by this app directly — needs a PCI-compliant hosted checkout. The current AWS free plan closes 2026-09-20 (`docs/plans/hosting-migration/product.md`), so this shouldn't assume unlimited runway on the current hosting setup while it's being built. Account deletion must carve out billing/subscription history for any user who was ever Paid, independent of the account row.

## non-goals
🤖 ai-audited(sonnet-5) — added the two decisions that were explicitly considered and rejected this session (usage rate-limiting, partial data wipe)

- Not building custom card/payment storage — must use a compliant third-party processor's hosted flow.
- Not adding tiers beyond Free/Paid right now — no separate "Pro" or "Team" tier.
- Not rate-limiting AI calls or file transfers by usage — considered and rejected, since both are cheap enough that usage tracking, not capping, is the right first step. Caps stay available later if the tracking data justifies them.
- Not a partial "wipe data but keep the account" state for inactive accounts — full account deletion only, since email as the identity anchor makes re-registration a clean substitute.
- Not solving desktop-app licensing/payment in this doc — flagged as an open question, likely its own doc if it turns out non-trivial.

## open questions
🤖 ai-audited(sonnet-5) — added the reminder-cadence and billing-retention questions this session surfaced; carried the rest forward unresolved

- Which payment provider (Stripe is the default choice for subscriptions/hosted checkout/webhooks, but deserves a real comparison before settling)?
- Recurring subscription vs. one-time or credit-based Paid access?
- Exact reminder-email cadence before the 6-month purge — needs deciding before the purge job is built.
- Whether billing/subscription history for ever-Paid users is retained locally, or relying on the payment provider's own records is sufficient.
- How this interacts with the existing `"parse"` rate limit (2/min per IP, in `Program.cs`) — does tier replace it, sit alongside it, or does the IP limit stay as a separate abuse guard regardless of tier?
- What happens to users an admin already granted `AiUser` to before this ships — grandfathered onto Paid, or required to go through billing too?
- Does the admin override stay permanently, or get removed once self-serve billing is live?
- Should this stay a single umbrella plan, or split into a tier-model doc plus a separate payment-integration doc (provider setup, webhooks, subscription lifecycle, dunning/failed-payment handling)?
- If AI parsing is also used from the desktop app, does it check the same backend gate, or does it need its own handling?
