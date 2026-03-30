# Demo and Auth Features Plan

> **⚠ DECISIONS NOT FINALISED**
> Steps 1–4 (partial) are complete. Implementation order revised: Step 6 (email verification) before Step 5 (forgot password) — verification is foundational; forgot password is only meaningful once emails are confirmed.

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Demo user + "Try Demo" button | Done |
| 2 | Periodic demo data reset + login re-seed | Done |
| 3 | Change password | Done |
| 4 | AWS SES setup (email infrastructure) | Done (pending production access approval) |
| 6 | Email verification on register | Pending (implement first) |
| 5 | Forgot password | Pending (implement after Step 6) |

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
- `curl -X POST https://jobtracker.nagarenegishi.com/api/auth/demo/reset -H "X-Reset-Key: ${{ secrets.DEMO_RESET_KEY }}"`
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

### Backend ✅

- `ChangePasswordDTO` added to `AuthDTO.cs` — `{ currentPassword, newPassword, confirmNewPassword }`
- `AccountController.cs` created at `/api/account/` — all authenticated account management lives here, not in `AuthController`
  - Keeps `AuthController` for unauthenticated flows only; `apiFetch` silent-refresh skip stays scoped to `/auth/`
- `POST /api/account/change-password` — Identity validates current password, blocks demo user (403), returns Identity errors on failure
- `[EnableRateLimiting("auth")]` applied — 5 req/min per IP, prevents brute-forcing with a stolen JWT
- `AuthController` — XML doc comment added clarifying the auth vs account split

### Frontend

**Decisions locked:**
- User icon top-right in NavBar — placeholder avatar, opens dropdown
- Dropdown: username at top, Settings link (middle), Sign Out at bottom (moved from current location)
- Settings link navigates to `/settings` page (new route)

**Remaining:**
- NavBar: replace Sign Out button with user icon + dropdown (`getEmail()` from `auth.ts` for username display)
- `SettingsPage.tsx` — change password form, calls `changePassword()` from `authService.ts`
- Register `/settings` route in `App.tsx`
- On success: show inline confirmation message

---

## Step 4 — AWS SES Setup (Email Infrastructure)

**Goal:** Enable the app to send transactional emails. Required by Steps 5 and 6. No code changes in this step — infrastructure only.

**Decisions locked:**
- Sending identity: **domain verification** — more professional, one-time DNS setup
- Email library: **`AWSSDK.SimpleEmailV2`** behind an `IEmailService` abstraction — consistent with existing S3 SDK pattern; abstraction makes future provider swap a single implementation class change
- DKIM: **Easy DKIM** with **RSA_2048_BIT** signing key
- Custom MAIL FROM domain: subdomain of verified domain — enables DMARC alignment
- MAIL FROM MX failure behavior: **Use default MAIL FROM domain** for now — tighten to **Reject** once DNS is confirmed stable in production
- Sending address: `noreply@<your-domain>` (set in `appsettings.Production.json`)

### Steps (all infrastructure, no code)

1. ✅ Verify domain in SES console — domain identity created, DKIM and MAIL FROM configured
2. ✅ Add DNS records in DNS provider — 3 CNAME (DKIM) + 1 MX + 1 TXT (SPF) for custom MAIL FROM subdomain
3. ✅ Domain verified — DKIM configuration and MAIL FROM configuration both show Verified in SES console
4. ✅ Request SES production access — submitted, pending AWS approval (typically 24h)
5. ✅ Create IAM policy for SES `ses:SendEmail` + `ses:SendRawEmail` — attached to EC2 instance role
6. ⬜ Note sending address and region for `appsettings.Production.json` — do after production access approved

### Notes
- AWS SES free tier (as of 2026): 3,000 emails/month for first 12 months only (new accounts); $0.10/1,000 after — effectively free at expected volume
- DNS records added manually via DNS provider (Route 53 auto-publish not used)

---

## Step 5 — Forgot Password

**Goal:** Unauthenticated users can request a password reset link sent to their email.

**Requires:** Step 4 (SES) complete.

ASP.NET Identity provides `GeneratePasswordResetTokenAsync` and `ResetPasswordAsync` — token generation and validation are built in.

### Backend

- `POST /api/auth/forgot-password` — accepts email, generates reset token, sends email with link
  - Always returns 200 regardless of whether email exists (prevents email enumeration)
- `POST /api/auth/reset-password` — accepts `{ email, token, newPassword }`, calls `ResetPasswordAsync`
  - Token is URL-encoded in the reset link; must be decoded before passing to Identity

**Decisions locked:**
- Reset link format: **frontend route** `/reset-password?token=...&email=...` — consistent with SPA pattern, full UX control
- Token expiry: **default 1 day** — single-use tokens already limit abuse window; 24h is industry standard for password reset

### Frontend

- "Forgot your password?" link on login page → `/forgot-password` page
- Form: email input → submit → success message (always shown, same message regardless of email existence)
- `/reset-password?token=...&email=...` page — new password + confirm → calls reset endpoint → redirect to login on success

---

## Step 6 — Email Verification on Register

**Goal:** Require users to verify their email before they can log in. Prevents registration spam.

**Requires:** Step 4 (SES) complete.

ASP.NET Identity provides `GenerateEmailConfirmationTokenAsync` and `ConfirmEmailAsync`. The `EmailConfirmed` flag on `IdentityUser` is set to `true` after confirmation.

**Decision locked: implement email verification.** Goal is to guarantee every account owns its email address — without verification, users can register with emails they don't own, and forgot password becomes unreliable.

### Backend

- Update `Register` endpoint: after creating user, generate email confirmation token and send verification email
- Add `GET /api/auth/confirm-email?userId=...&token=...` endpoint — calls `ConfirmEmailAsync`, redirects to frontend
- Update `Login` endpoint: check `user.EmailConfirmed` — return 403 with `"Email not verified"` if false
- Demo user: `EmailConfirmed = true` in startup seed — unaffected by this feature

**[DECISION REQUIRED] — Confirm email flow:**

| Option | Notes |
|---|---|
| Link in email hits backend endpoint → redirect to frontend success page | Simpler email template (just a plain link). |
| Link hits frontend page → frontend calls backend to confirm | More SPA-consistent. Requires frontend to extract token from URL and call API. |

### Frontend

- After register: show "Check your email" page instead of auto-login
- `/confirm-email` page — shows success/failure based on API response
- Login page: handle 403 "Email not verified" with a specific message + "Resend verification" link

**[DECISION REQUIRED] — Resend verification email:** Should users be able to request a new confirmation email? Requires another endpoint (`POST /api/auth/resend-confirmation`). Probably yes — confirmation emails can get lost.

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

## Open Decisions Summary

| # | Decision | Status |
|---|---|---|
| 1-A | Demo user seeding approach | **Locked: startup seed in `Program.cs`** |
| 1-B | Allow public registration alongside demo? | **Locked: yes, registration stays open** |
| 1-C | Demo document restrictions | **Locked: upload + delete blocked for demo user, inline message shown** |
| 2-A | Reset mechanism | **Locked: GitHub Actions nightly cron** |
| 2-B | Re-seed on demo login? | **Locked: yes — insert missing predefined jobs on every demo login** |
| 2-C | Pre-seed documents? | **Locked: no — avoids S3 cost** |
| 3-A | Change password UI location | **Locked: NavBar user icon → `/settings` page** |
| 4-A | SES sending identity | **[DECISION REQUIRED]** Domain verification / Single email |
| 4-B | Email library | **[DECISION REQUIRED]** AWSSDK.SimpleEmailV2 / MailKit |
| 5-A | Reset link format | **[DECISION REQUIRED]** Frontend route / Backend redirect |
| 5-B | Token expiry | **[DECISION REQUIRED]** Default 1 day / Custom |
| 6-A | Implement email verification at all? | **[DECISION REQUIRED]** Yes / Skip |
| 6-B | Confirm email flow | **[DECISION REQUIRED]** Backend redirect / Frontend calls API |
| 6-C | Resend verification endpoint | **[DECISION REQUIRED]** Yes / No |
