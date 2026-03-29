# Demo and Auth Features Plan

> **⚠ DECISIONS NOT FINALISED**
> Steps 1 and 2 have decisions locked (see Open Decisions Summary). Steps 3–6 still require decisions before implementation.

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Demo user + "Try Demo" button | Done |
| 2 | Periodic demo data reset + login re-seed | Pending |
| 3 | Change password | Pending |
| 4 | AWS SES setup (email infrastructure) | Pending |
| 5 | Forgot password | Pending |
| 6 | Email verification on register | Pending |

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

---

## Step 3 — Change Password

**Goal:** Logged-in users can change their password from within the app.

No external services required — ASP.NET Identity provides `ChangePasswordAsync(user, currentPassword, newPassword)`.

### Backend

- Add `POST /api/auth/change-password` endpoint (requires `[Authorize]`)
- DTO: `{ currentPassword, newPassword, confirmNewPassword }`
- Calls `_userManager.ChangePasswordAsync(...)` — Identity validates current password and enforces password rules
- Returns 400 with errors on failure
- Demo user blocked — returns 403

**[DECISION REQUIRED] — Where to surface this in the UI?**

| Option | Notes |
|---|---|
| Settings/profile page (new route `/settings`) | Clean separation. Requires new page + nav link. |
| Modal triggered from NavBar user menu | No new route. Stays in context. Simpler. |

### Frontend

- Form: current password, new password, confirm new password
- Calls `POST /api/auth/change-password` via `apiFetch`
- Shows validation errors inline
- On success: show confirmation, optionally log out and redirect to login

---

## Step 4 — AWS SES Setup (Email Infrastructure)

**Goal:** Enable the app to send transactional emails. Required by Steps 5 and 6. No code changes in this step — infrastructure only.

**[DECISION REQUIRED] — SES sending identity:**

| Option | Notes |
|---|---|
| Verify domain (`nagarenegishi.com`) | Allows sending from any address at the domain (e.g. `noreply@nagarenegishi.com`). Requires DNS TXT/DKIM records. More professional. |
| Verify single email address only | Simpler setup. Only that exact address can send. Fine for low volume. |

Leaning toward **domain verification** — one-time DNS setup, more flexible.

### Steps (all infrastructure, no code)

1. Go to AWS SES console → verify sending domain → add DNS records (TXT for domain, CNAME for DKIM)
2. If account is in SES sandbox: request production access (or add recipient addresses to sandbox for testing)
3. Create IAM policy for SES `ses:SendEmail` — attach to EC2 instance role (reuses existing IAM role pattern)
4. Note the sending address and region for `appsettings.Production.json`

**[DECISION REQUIRED] — Email sending library:**

| Option | Notes |
|---|---|
| `AWSSDK.SimpleEmailV2` (SES v2 SDK) | Native AWS, consistent with existing S3 SDK pattern in the project. |
| `MailKit` + SES SMTP endpoint | SMTP abstraction, not AWS-specific. More portable if hosting changes. Extra NuGet dependency. |

Leaning toward **AWSSDK.SimpleEmailV2** — already using AWS SDK pattern for S3, consistent DI wiring.

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

**[DECISION REQUIRED] — Reset link format:**

| Option | Notes |
|---|---|
| `/reset-password?token=...&email=...` frontend route | Token decoded in the browser, submitted via form. Simple. |
| `/api/auth/reset-password?token=...` direct backend link | User lands on a backend redirect. Less control over UX. |

Leaning toward **frontend route** — consistent with SPA pattern, better UX.

**[DECISION REQUIRED] — Token expiry:**

Identity's default reset token expiry is 1 day. Configurable via `DataProtectionTokenProviderOptions`. Likely fine as-is — confirm before implementing.

### Frontend

- "Forgot your password?" link on login page → `/forgot-password` page
- Form: email input → submit → success message (always shown, same message regardless of email existence)
- `/reset-password?token=...&email=...` page — new password + confirm → calls reset endpoint → redirect to login on success

---

## Step 6 — Email Verification on Register

**Goal:** Require users to verify their email before they can log in. Prevents registration spam.

**Requires:** Step 4 (SES) complete.

ASP.NET Identity provides `GenerateEmailConfirmationTokenAsync` and `ConfirmEmailAsync`. The `EmailConfirmed` flag on `IdentityUser` is set to `true` after confirmation.

**[DECISION REQUIRED] — Whether to implement this at all:**

| Option | Notes |
|---|---|
| Implement verification | Adds friction to registration. Prevents spam. Makes the app more production-realistic. |
| Skip for now | Most visitors will use demo and not register. Can be added later if spam becomes a problem. |

If implemented:

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
| 3-A | Change password UI location | **[DECISION REQUIRED]** Settings page / NavBar modal |
| 4-A | SES sending identity | **[DECISION REQUIRED]** Domain verification / Single email |
| 4-B | Email library | **[DECISION REQUIRED]** AWSSDK.SimpleEmailV2 / MailKit |
| 5-A | Reset link format | **[DECISION REQUIRED]** Frontend route / Backend redirect |
| 5-B | Token expiry | **[DECISION REQUIRED]** Default 1 day / Custom |
| 6-A | Implement email verification at all? | **[DECISION REQUIRED]** Yes / Skip |
| 6-B | Confirm email flow | **[DECISION REQUIRED]** Backend redirect / Frontend calls API |
| 6-C | Resend verification endpoint | **[DECISION REQUIRED]** Yes / No |
