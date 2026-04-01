# Demo and Auth Features Plan

> All decisions locked. Steps 1–6 complete.

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Demo user + "Try Demo" button | Done |
| 2 | Periodic demo data reset + login re-seed | Done |
| 3 | Change password | Done |
| 4 | AWS SES setup (email infrastructure) | Done (awaiting AWS production access) |
| 5 | Email verification on register | Done |
| 6 | Forgot password | Done |
| 7 | Migrate email provider from SES to Resend | Code + deployment done — testing pending |

---

## Step 1 — Demo User + "Try Demo" Button

**Goal:** Let visitors try the app without registering. One button on the login page logs them in as a fixed demo account automatically.

**Decisions locked:**
- Registration stays open — demo button is an optional shortcut, not a replacement
- Startup seed in `Program.cs` — idempotent, no migration needed, easy to update
- Demo user email: `demo@jobtracker.com` (fake address, no real mailbox needed)
- Demo user password: strong random value stored in DB but never used — `/api/auth/demo` bypasses password check entirely

### Backend

- Startup seed: on app start, check if `demo@jobtracker.com` exists — create it if not (password never used)
- Add `POST /api/auth/demo` endpoint — looks up demo user by email, issues access token + sets refresh cookie directly, no password check
- Rate-limit `/demo` with the existing `"auth"` policy
- **Demo restrictions** (enforced by checking `user.Email == "demo@jobtracker.com"` in relevant endpoints):
  - Cannot upload documents → 403
  - Cannot delete documents → 403
  - Cannot change password → 403 (Step 3)
  - Document upload/delete endpoints return a clear message: `"Document upload and delete are not available in demo mode."`

### Frontend

- Add "Try Demo" button to the login page
- Button calls `POST /api/auth/demo`, navigates to `/jobs` on success — same flow as login
- No form fields needed
- When document upload/delete returns 403, show inline note: "This feature is not available in demo mode. Create an account to try it." (not a generic error toast)

---

## Step 2 — Demo Data Reset + Login Re-seed

**Goal:** Keep demo account data clean automatically and ensure every visitor sees a populated demo.

**Decisions locked:**
- **On every demo login:** check which predefined sample jobs are missing (by title + company), insert only the missing ones — visitor additions are left alone, deleted samples are restored
- **Nightly cron (GitHub Actions scheduled workflow):** full wipe of all demo user jobs + re-seed from scratch — clears visitor-added data and any accumulated mess
- **Documents are never pre-seeded** — avoids S3 cost; visitors can see the upload UI but cannot use it in demo mode (Step 1)

### Backend

- `POST /api/auth/demo` (from Step 1) calls re-seed logic before issuing token:
  - Query existing demo jobs by title + company
  - Insert any predefined jobs that are missing
  - Predefined set: ~3–5 sample jobs with varied statuses, priorities, contacts, correspondences
- `POST /api/auth/demo/reset` — separate endpoint for nightly cron:
  - Deletes all jobs owned by demo user (documents cascade from DB; S3 files deleted via `IStorageService.DeleteAsync` before DB delete to avoid orphans)
  - Re-seeds full predefined job set
  - Authorised by secret header `X-Reset-Key` (not JWT — called from GitHub Actions, not a logged-in user)
  - Demo user account itself is never deleted

### GitHub Actions

- New scheduled workflow (separate from `deploy.yml`) — runs nightly (e.g. `0 3 * * *` UTC)
- `curl -X POST https://[your-domain]/api/auth/demo/reset -H "X-Reset-Key: ${{ secrets.DEMO_RESET_KEY }}"`
- `DEMO_RESET_KEY` added as a GitHub Actions secret
- `workflow_dispatch` trigger included — allows manual reset from Actions UI

### Implementation notes

- `JobTrackerApi/Models/DemoSeed.cs` — static class holding `JobKeys` (Company + Role pairs for missing-check) and `CreateJobs(userId)` (returns 3 sample jobs: Wishlist / Interview / Rejected)
- Sample companies: `Sample Corp`, `Demo Industries`, `Example Ltd` — clearly fictional, professional-looking
- Correspondence dates are relative to `DateTime.UtcNow` — always look recent after a reset
- `AuthController` now injects `IStorageService` (needed by the reset endpoint to delete S3 files before DB records)
- `Demo:ResetKey` config key wired in `compose.prod.yml` as `Demo__ResetKey=${DEMO_RESET_KEY}`; exported in `deploy.yml` SSH session alongside other secrets
- `--fail` flag on curl — workflow step fails visibly if endpoint returns 4xx/5xx

---

## Step 3 — Change Password

**Goal:** Logged-in users can change their password from within the app.

No external services required — ASP.NET Identity provides `ChangePasswordAsync(user, currentPassword, newPassword)`.

### Backend *(complete)*

- `ChangePasswordDTO` added to `AuthDTO.cs` — `{ currentPassword, newPassword, confirmNewPassword }`
- `AccountController.cs` created at `/api/account/` — all authenticated account management lives here, not in `AuthController`
  - Keeps `AuthController` for unauthenticated flows only; `apiFetch` silent-refresh skip stays scoped to `/auth/`
- `POST /api/account/change-password` — Identity validates current password, blocks demo user (403), returns Identity errors on failure
- `[EnableRateLimiting("auth")]` applied — 5 req/min per IP, prevents brute-forcing with a stolen JWT
- `AuthController` — XML doc comment added clarifying the auth vs account split

### Frontend *(complete)*

- NavBar: user icon top-right opens dropdown — username at top, Settings link, Sign Out at bottom
- `SettingsPage.tsx` — change password form, calls `changePassword()` from `authService.ts`; inline success message on change
- `/settings` route registered in `App.tsx` (protected)

---

## Step 4 — AWS SES Setup (Email Infrastructure)

**Goal:** Enable the app to send transactional emails. Required by Steps 5 and 6. No code changes in this step — infrastructure only.

**Decisions locked:**
- Sending identity: **domain verification** — more professional, one-time DNS setup
- Email library: **`AWSSDK.SimpleEmailV2`** behind an `IEmailService` abstraction — consistent with existing S3 SDK pattern; abstraction makes future provider swap a single implementation class change
- DKIM: **Easy DKIM** with **RSA_2048_BIT** signing key
- Custom MAIL FROM domain: subdomain of verified domain — enables DMARC alignment
- MAIL FROM MX failure behavior: **Use default MAIL FROM domain** for now — tighten to **Reject** once DNS is confirmed stable in production
- Sending address: `noreply@[your-domain]` (set in `appsettings.Production.json`)

### Steps (all infrastructure, no code)

1. [x] Verify domain in SES console — domain identity created, DKIM and MAIL FROM configured
2. [x] Add DNS records in DNS provider — 3 CNAME (DKIM) + 1 MX + 1 TXT (SPF) for custom MAIL FROM subdomain
3. [x] Domain verified — DKIM configuration and MAIL FROM configuration both show Verified in SES console
4. [x] Request SES production access — submitted, awaiting AWS approval
5. [x] Create IAM policy for SES `ses:SendEmail` + `ses:SendRawEmail` — attached to EC2 instance role
6. [ ] Note sending address and region for `appsettings.Production.json` — do after production access approved

### Notes
- AWS SES free tier (as of 2026): 3,000 emails/month for first 12 months only (new accounts); $0.10/1,000 after — effectively free at expected volume
- DNS records added manually via DNS provider (Route 53 auto-publish not used)

---

## Step 5 — Email Verification on Register

**Goal:** Require users to verify their email before they can log in. Every account is guaranteed to own its email address — without this, users can register with emails they don't own and forgot password becomes unreliable.

**Requires:** Step 4 (SES) complete.

ASP.NET Identity provides `GenerateEmailConfirmationTokenAsync` and `ConfirmEmailAsync`. The `EmailConfirmed` flag on `IdentityUser` is set to `true` after confirmation.

**Decisions locked:**
- Confirm email flow: **frontend route** — link hits `/confirm-email?userId=...&token=...`, React page calls backend to confirm
- Resend verification: **yes** — `POST /api/auth/resend-confirmation` with a dedicated rate limit policy: **3 requests per hour per IP** (tighter than the default auth policy — each resend is a real SES call with a cost)
- Re-register with unverified email: **overwrite existing unverified account** — enables typo recovery without "already taken" error
- Unverified account cleanup: **nightly cron deletes all unverified (no time filter)** — re-registration covers the early wipe edge case

### Backend *(complete)*

- `IEmailService` abstraction + `LogEmailService` (dev, logs to console) + `SesEmailService` (production, AWS SES v2) — registered in `Program.cs`; swap is one line
- `Register` endpoint updated — generates confirmation token, URL-encodes it, sends link via `IEmailService`; returns message instead of empty 200; overwrites existing unverified account on re-register (typo recovery) — demo user excluded
- `POST /api/auth/cleanup-unverified` — deletes all unverified accounts (except demo); authorized by `X-Reset-Key`; called by nightly cron alongside demo reset
- `GET /api/auth/confirm-email?userId=...&token=...` — URL-decodes token, calls `ConfirmEmailAsync`, same error message for missing user and invalid token (avoids user enumeration)
- `Login` updated — returns 403 `"Email not verified."` after password check passes but `EmailConfirmed` is false
- `POST /api/auth/resend-confirmation` — always returns 200, silently skips unknown/already-confirmed emails; rate limited to 3/hour per IP (dedicated `"resend-confirmation"` policy)
- Demo user seed: `EmailConfirmed = true` — unaffected by this feature
- `App:FrontendBaseUrl` config key required in dev (`appsettings.Development.json`) — production derives URL from `Request.Host` (Nginx passes real hostname via `proxy_set_header Host $host`)

### Frontend *(complete)*

- After register: redirect to `/check-email` with email in router state
- `CheckEmailPage` — spam reminder, resend button with 2-min frontend cooldown (timestamp-based); cooldown starts on mount (email just sent by register)
- After resend: inline "We've sent another verification email" + cooldown resets
- `ConfirmEmailPage` — reads `userId` + `token` from query params via `useSearchParams`, calls backend on mount via `useEffect`, renders loading/success/error
- Login 403: factored `instanceof ApiError` guard, 403 branch shows "Email not verified." + resend link navigating to `/check-email` with email in router state

---

## Step 6 — Forgot Password

**Goal:** Unauthenticated users can request a password reset link sent to their email.

**Requires:** Step 5 (email verification) complete — reset links are only reliable once all emails are verified.

ASP.NET Identity provides `GeneratePasswordResetTokenAsync` and `ResetPasswordAsync` — token generation and validation are built in.

**Decisions locked:**
- Reset link format: **frontend route** `/reset-password?token=...&email=...` — consistent with SPA pattern, full UX control
- Token expiry: **default 1 day** — single-use tokens already limit abuse window; 24h is industry standard for password reset

### Backend *(complete)*

- `POST /api/auth/forgot-password` — accepts email, generates reset token, sends email with link
  - Always returns 200 regardless of whether email exists (prevents email enumeration)
- `POST /api/auth/reset-password` — accepts `{ email, token, newPassword }`, calls `ResetPasswordAsync`
  - Token is URL-encoded in the reset link; must be decoded before passing to Identity

### Frontend *(complete)*

- "Forgot your password?" link on login page → `/forgot-password` page
- Form: email input → submit → success message (always shown, same message regardless of email existence)
- `/reset-password?token=...&email=...` page — new password form → calls reset endpoint → redirect to login on success

---

## Future Enhancement — Time-Based Cleanup of Unverified Accounts

> **Not blocking current work. Acceptable given re-registration covers the edge case.**

Current cleanup (`POST /api/auth/cleanup-unverified`) deletes all unverified accounts at cron time regardless of when they registered. Edge case: a user who registers at 2:59am gets wiped 1 minute later before confirming. Re-registration recovers them cleanly, so UX impact is low.

A more precise approach: a separate `PendingRegistrations (UserId, RegisteredAt)` table. On register → insert row. On confirm → delete row. Cleanup → only delete where `RegisteredAt < UtcNow - 24h`. No changes to `AspNetUsers`. Requires one migration.

---

## Future Enhancement — Rate Limiting on Document Operations

> **Not blocking current work. Revisit if abuse is observed in production.**

Current rate limiting covers auth endpoints only (IP-based, 5 req/min). Document upload and delete have no limit for real users.

Potential approach:
- Per-user rate limit (keyed on JWT user ID claim, not IP) — more accurate for authenticated endpoints
- Separate policy for document operations, e.g. 20 uploads per user per hour
- ASP.NET's built-in rate limiter supports custom partition keys — requires a custom policy that reads the user ID from `HttpContext.User`

Demo users are already blocked from upload/delete entirely (Step 1), so this only applies to registered users.

---

## Step 7 — Migrate Email Provider from SES to Resend

**Goal:** Replace AWS SES with Resend for sending transactional emails. SES production access was denied with no actionable feedback (see `docs/ses-rejection-notes.md`). The existing `IEmailService` abstraction allows swapping the provider without changes to controllers, auth flows, or frontend.

**Requires:** Steps 5 and 6 already built against `IEmailService` — no changes needed there.

**Decisions locked:**
- Provider: **Resend** — permanent free tier (3,000 emails/month, 100/day), no production access gatekeeping, not tied to AWS (survives future infrastructure migration)
- Integration method: **REST API via `HttpClient`** — no official .NET SDK exists, not needed at this volume; one POST call per email
- `SesEmailService` stays in the codebase, SES DI registration commented out — available as a fallback if SES production access is later granted
- Config key: `Resend:ApiKey` — stored as environment variable in production, never committed
- `Email:FromAddress` updated to `noreply@[app-subdomain]` — matches verified Resend domain (app subdomain, not root); keeps email reputation separate from root domain and SES setup
- Resend domain: app subdomain (not root domain) — clean separation from SES records on root domain; region closest to users

### Resend account setup

1. [x] Sign up at resend.com (free plan, no credit card)
2. [x] Add app subdomain in Resend dashboard (Domains > Add Domain) — pick region closest to users
3. [x] Add Resend DNS records in DNS provider — DKIM CNAMEs + SPF TXT + MX for bounce handling; all on app subdomain, no conflict with existing SES records on root domain
4. [x] Verify domain in Resend dashboard — DKIM verified; MX (Enable Receiving) pending DNS propagation
5. [x] Create API key with Sending access permission only — store in password manager

### Backend

- [x] `ResendEmailService.cs` — new implementation of `IEmailService`; uses `HttpClient` to POST to `https://api.resend.com/emails` with Bearer token auth and JSON body (`from`, `to`, `subject`, `html`)
- [x] `Program.cs` — comment out SES DI registration (`AddAWSService<IAmazonSimpleEmailServiceV2>` + `SesEmailService`); add `AddHttpClient<IEmailService, ResendEmailService>()`
- Config: `Resend:ApiKey` not needed in dev (`LogEmailService` used instead); `Email:FromAddress` set via `EMAIL_FROM_ADDRESS` environment variable in production
- [x] Error handling: `response.EnsureSuccessStatusCode()` on the HTTP response — matches the throw-on-failure pattern of the SES SDK call

### Production deployment

- [x] `Resend__ApiKey` + `Email__FromAddress` added as environment variables in `compose.prod.yml`
- [x] `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS` added as GitHub Actions secrets
- [x] Exported in `deploy.yml` SSH session alongside other secrets
- Remove `AWSSDK.SimpleEmailV2` NuGet package from production dependencies (optional — can keep for future SES fallback)
- Remove SES IAM policy from EC2 instance role (optional — no cost to keep)

### DNS notes

- Resend DKIM records use different selectors from SES — both can coexist
- If Resend requires an SPF TXT record on the root domain, merge with any existing SPF record into a single TXT record (DNS spec allows only one SPF record per domain)
- DMARC record (`_dmarc.nagarenegishi.com`) already exists — no change needed, works with any provider that passes DKIM alignment
- Existing SES DNS records can remain in place — they do not interfere and allow reverting to SES if production access is later granted

### Frontend

- No changes required — all email sending is backend-only through `IEmailService`

### Testing

- [ ] Send test email via Resend dashboard to verify domain setup
- [ ] Deploy to staging/production and trigger email verification flow (register new account)
- [ ] Trigger forgot password flow
- [ ] Confirm emails arrive with SPF, DKIM, DMARC all passing (check Gmail "Show original")
