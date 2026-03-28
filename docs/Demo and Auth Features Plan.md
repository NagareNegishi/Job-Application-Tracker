# Demo and Auth Features Plan

> **⚠ DECISIONS NOT FINALISED**
> This document is a planning draft. Technical approach for each step is marked as **[DECISION REQUIRED]** where a choice has not been confirmed. Do not begin implementation until the relevant decision is made.

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Demo user + "Try Demo" button | Pending |
| 2 | Periodic demo data reset | Pending |
| 3 | Change password | Pending |
| 4 | AWS SES setup (email infrastructure) | Pending |
| 5 | Forgot password | Pending |
| 6 | Email verification on register | Pending |

---

## Step 1 — Demo User + "Try Demo" Button

**Goal:** Let visitors try the app without registering. One button on the login page logs them in as a fixed demo account automatically.

### Backend

- Seed a demo user into the DB (fixed email, e.g. `demo@jobtracker.com`) on startup or via a migration
- Add `POST /api/auth/demo` endpoint — finds the demo user, returns access token + sets refresh cookie, same as login
- Rate-limit the `/demo` endpoint (reuse the existing `"auth"` rate limiting policy)

**[DECISION REQUIRED] — Demo user seeding approach:**

| Option | Notes |
|---|---|
| EF Core migration with hardcoded credentials | Simple, reproducible, runs in CI. Password hash is environment-specific (Identity hashes differ per instance). Harder to rotate credentials. |
| Application startup seed (in `Program.cs`) | Runs on every start, idempotent — skips if user already exists. Easy to change. No migration needed. |
| Manual one-time creation via register endpoint | Zero code. Fragile — deleted user breaks the demo. |

Leaning toward **startup seed in `Program.cs`** — idempotent, no migration, easy to update.

**[DECISION REQUIRED] — Should visitors be able to register their own accounts, or demo-only?**

Affects whether the Register page/route stays public or gets hidden/disabled for the demo.

### Frontend

- Add "Try Demo" button to the login page
- Button calls `/api/auth/demo`, then navigates to `/jobs` on success — same flow as login
- No form fields needed

---

## Step 2 — Periodic Demo Data Reset

**Goal:** Keep the demo account's data clean without manual intervention. Resets jobs/documents for the demo user on a schedule.

**[DECISION REQUIRED] — Reset mechanism:**

| Option | Notes |
|---|---|
| GitHub Actions scheduled workflow (cron) | Calls a protected reset endpoint via HTTP. No server changes needed. Easy to monitor (Actions UI shows run history). Requires a secret API key to authorise the call. |
| Cron job on EC2 host | `crontab -e` on EC2, calls reset endpoint via `curl`. No GitHub Actions dependency. Harder to monitor/audit. |
| Backend `IHostedService` on a timer | Runs inside the app process. No external trigger needed. Harder to inspect or trigger manually. |

Leaning toward **GitHub Actions scheduled workflow** — consistent with existing CI/CD approach, visible run history, easy to trigger manually.

### Backend

- Add `POST /api/auth/demo/reset` endpoint
- Deletes all jobs (and cascading documents, contacts, correspondences) owned by the demo user
- Optionally re-seeds a few sample jobs so the demo isn't empty after reset
- Authorised by a secret header (e.g. `X-Reset-Key`) — not JWT, since this is called from outside
- Demo user account itself is never deleted — only data

**[DECISION REQUIRED] — Re-seed sample data on reset?**

| Option | Notes |
|---|---|
| Reset to empty | Simplest. Demo starts blank after each reset. |
| Reset with sample jobs | Better first impression — visitor lands on a non-empty list. Requires hardcoded seed data. |

---

## Step 3 — Change Password

**Goal:** Logged-in users can change their password from within the app.

No external services required — ASP.NET Identity provides `ChangePasswordAsync(user, currentPassword, newPassword)`.

### Backend

- Add `POST /api/auth/change-password` endpoint (requires `[Authorize]`)
- DTO: `{ currentPassword, newPassword, confirmNewPassword }`
- Calls `_userManager.ChangePasswordAsync(...)` — Identity validates the current password and enforces password rules
- Returns 400 with errors on failure (wrong current password, weak new password, etc.)
- **Guard: demo user cannot change password** — check `user.Email == demoemail` and return 403

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

ASP.NET Identity provides `GeneratePasswordResetTokenAsync` and `ResetPasswordAsync` — the token generation and validation are built in.

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

**[DECISION REQUIRED] — Whether to implement this at all for the demo:**

| Option | Notes |
|---|---|
| Implement verification | Adds friction to registration. Prevents spam. Makes the app more production-realistic. |
| Skip for now | Demo-user flow means most visitors won't register. Can be added later if spam becomes a problem. |

If implemented:

### Backend

- Update `Register` endpoint: after creating user, generate email confirmation token and send verification email
- Add `GET /api/auth/confirm-email?userId=...&token=...` endpoint — calls `ConfirmEmailAsync`, redirects to frontend
- Update `Login` endpoint: check `user.EmailConfirmed` — return 403 with `"Email not verified"` if false
- Demo user: mark `EmailConfirmed = true` in seed so the demo button is unaffected

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

## Open Decisions Summary

| # | Decision | Options |
|---|---|---|
| 1-A | Demo user seeding approach | Startup seed vs migration vs manual |
| 1-B | Allow public registration alongside demo? | Yes (keep register page) / No (demo-only) |
| 2-A | Reset mechanism | GitHub Actions cron / EC2 cron / hosted service |
| 2-B | Re-seed sample data on reset? | Empty / Pre-populated sample jobs |
| 3-A | Change password UI location | Settings page / NavBar modal |
| 4-A | SES sending identity | Domain verification / Single email |
| 4-B | Email library | AWSSDK.SimpleEmailV2 / MailKit |
| 5-A | Reset link format | Frontend route / Backend redirect |
| 5-B | Token expiry | Default 1 day / Custom |
| 6-A | Implement email verification at all? | Yes / Skip for demo |
| 6-B | Confirm email flow | Backend redirect / Frontend calls API |
| 6-C | Resend verification endpoint | Yes / No |
