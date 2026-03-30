# Demo and Auth Features Plan

> All decisions locked. Steps 1–5 complete. Implementation order: Step 6 (forgot password).

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Demo user + "Try Demo" button | Done |
| 2 | Periodic demo data reset + login re-seed | Done |
| 3 | Change password | Done |
| 4 | AWS SES setup (email infrastructure) | Done (pending production access approval) |
| 5 | Email verification on register | Done |
| 6 | Forgot password | Pending (implement after Step 5) |

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

## Step 5 — Email Verification on Register

**Goal:** Require users to verify their email before they can log in. Every account is guaranteed to own its email address — without this, users can register with emails they don't own and forgot password becomes unreliable.

**Requires:** Step 4 (SES) complete.

ASP.NET Identity provides `GenerateEmailConfirmationTokenAsync` and `ConfirmEmailAsync`. The `EmailConfirmed` flag on `IdentityUser` is set to `true` after confirmation.

**Decisions locked:**
- Implement email verification: **yes** — foundational to the auth model

### Backend ✅

- `IEmailService` abstraction + `LogEmailService` (dev, logs to console) + `SesEmailService` (production, AWS SES v2) — registered in `Program.cs`; swap is one line
- `Register` endpoint updated — generates confirmation token, URL-encodes it, sends link via `IEmailService`; returns message instead of empty 200
- `GET /api/auth/confirm-email?userId=...&token=...` — URL-decodes token, calls `ConfirmEmailAsync`, same error message for missing user and invalid token (avoids user enumeration)
- `Login` updated — returns 403 `"Email not verified."` after password check passes but `EmailConfirmed` is false
- `POST /api/auth/resend-confirmation` — always returns 200, silently skips unknown/already-confirmed emails; rate limited to 3/hour per IP (dedicated `"resend-confirmation"` policy)
- Demo user seed: `EmailConfirmed = true` — unaffected by this feature
- `App:FrontendBaseUrl` config key required in dev (`appsettings.Development.json`) — production derives URL from `Request.Host` (Nginx passes real hostname via `proxy_set_header Host $host`)

**Decisions locked:**
- Confirm email flow: **frontend route** — link hits `/confirm-email?userId=...&token=...`, React page calls backend to confirm — consistent with Step 6 reset-password pattern
- Resend verification: **yes** — `POST /api/auth/resend-confirmation` with a dedicated rate limit policy: **3 requests per hour per IP** (tighter than the default auth policy — each resend is a real SES call with a cost)
  - Future enhancement: per-email-address keying (3 per day per email) for more precise abuse prevention — requires custom rate limiter partition key beyond the existing IP-based policy

### Frontend ✅

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

### Backend

- `POST /api/auth/forgot-password` — accepts email, generates reset token, sends email with link
  - Always returns 200 regardless of whether email exists (prevents email enumeration)
- `POST /api/auth/reset-password` — accepts `{ email, token, newPassword }`, calls `ResetPasswordAsync`
  - Token is URL-encoded in the reset link; must be decoded before passing to Identity

### Frontend

- "Forgot your password?" link on login page → `/forgot-password` page
- Form: email input → submit → success message (always shown, same message regardless of email existence)
- `/reset-password?token=...&email=...` page — new password + confirm → calls reset endpoint → redirect to login on success

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
| 4-A | SES sending identity | **Locked: domain verification** |
| 4-B | Email library | **Locked: AWSSDK.SimpleEmailV2 behind IEmailService abstraction** |
| 5-A | Confirm email flow | **Locked: frontend route `/confirm-email?userId=...&token=...`, React page calls backend** |
| 5-B | Resend verification endpoint | **Locked: yes — 3/hour per IP, 2–3 min frontend cooldown after each send** |
| 6-A | Reset link format | **Locked: frontend route `/reset-password?token=...&email=...`** |
| 6-B | Token expiry | **Locked: default 1 day** |
