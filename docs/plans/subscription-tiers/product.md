# Product plan: subscription-tiers

## Maturity
lowest: 🌱 idea
🌱 idea 10 · 🤖 ai-audited 0 · 👤 human-ok 0 · ✅ settled 0

## about
🌱 idea

Let users self-serve choose between a Free plan and an AI plan, with the AI
plan gated behind payment, replacing today's admin-only AI access toggle.

## problem / motivation
🌱 idea

AI access is currently granted only by an admin, one user at a time, via
`PATCH /api/admin/users/{userId}/ai-access` (`AdminController.cs`), which
flips the `AiUser` role. That doesn't scale past a handful of hand-picked
users, and there's no way for someone to sign up and pay for AI access
themselves — there's no payment integration in the codebase at all yet.

## goal
🌱 idea

A user can sign up, see Free and AI plan options, and self-upgrade to the AI
plan by paying, with no admin involved. The build-and-launch cost should be
$0 — no committing to a paid vendor tier before there's real usage — but the
payment plumbing itself has to be production-capable, not a stub.

## audience
🌱 idea

End users choosing a plan; admins, who likely still need an override for
support or comping access; whoever builds the payment integration.

## requirements
🌱 idea

- When a user signs up, the system shall default them to the Free plan and
  offer an upgrade path to the AI plan.
- When a Free-plan user chooses to upgrade, the system shall route them
  through a payment flow before granting AI access.
- When payment succeeds, the system shall grant AI access automatically, with
  no admin step.
- When payment fails, is cancelled, or a subscription lapses, the system
  shall revoke AI access.
- When an admin wants to grant or revoke AI access manually, the system shall
  still allow that as an override alongside self-serve billing.

## stack
🌱 idea

Backend: `JobTrackerApi` (.NET). Frontend: `job-tracker-ui` (React). Payment
provider not yet chosen — see open questions.

## target device / platform
🌱 idea

Web app. Whether this also needs to gate AI access from the desktop app is
open (see below).

## constraints
🌱 idea

Cost must be $0 while building and at launch — no vendor plan with a monthly
minimum ahead of real usage. Raw card data must never be handled or stored by
this app directly; needs a PCI-compliant hosted checkout rather than
custom-built card handling.

## non-goals
🌱 idea

- Not building custom card/payment storage — must use a compliant
  third-party processor's hosted flow.
- Not adding tiers beyond Free/AI right now — no "Pro" or "Team" plan yet.
- Not solving desktop-app licensing/payment in this doc — flagged as an open
  question, likely its own doc if it turns out non-trivial.

## open questions
🌱 idea

- Which payment provider (Stripe is the default choice for
  subscriptions/hosted checkout/webhooks, but this deserves a real
  comparison before settling, not an assumption)?
- Recurring subscription vs. one-time or credit-based AI access?
- How does this interact with the existing `"parse"` rate limit (2/min per
  IP, in `Program.cs`) — do paying users get a higher limit, or is payment
  purely a yes/no gate on top of the same shared limit?
- What happens to users an admin already granted `AiUser` to before this
  ships — grandfathered in, or required to go through billing too?
- Does the admin override stay permanently (support/comp cases), or does it
  get removed once self-serve billing is live?
- This topic was flagged up front as potentially too large for one doc —
  should it stay a single umbrella plan, or split into a plan/tier-model doc
  plus a separate payment-integration doc (provider setup, webhooks,
  subscription lifecycle, dunning/failed-payment handling)?
- If AI parsing is also used from the desktop app, does it check the same
  backend gate, or does it need its own handling?
