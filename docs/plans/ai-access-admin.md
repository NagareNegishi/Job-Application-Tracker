# AI Access & Admin Management

## Overview

Roles-based access control for AI features using ASP.NET Core Identity roles. Two roles: `"Admin"` (manages users) and `"AiUser"` (accesses AI features). Seeding creates roles and promotes an existing confirmed user to admin on startup; new admin registrations are promoted at email confirmation. Admin controller exposes a user list and AI access toggle.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| ASP.NET Core Identity roles (`"Admin"`, `"AiUser"`) over custom boolean flags | Identity is already in use; roles are the idiomatic pattern — one consistent place for access control as more roles may be needed |
| `"AiUser"` role gates all AI features via `[Authorize(Policy = "AiEnabled")]` | Policy is reusable — any future AI endpoint adds one attribute |
| `"Admin"` role gates admin controller via `[Authorize(Policy = "Admin")]` | Same reusable pattern |
| Static `Roles` class for role name constants | Prevents typo bugs when referencing role names across controllers and seeding |
| `Admin:Email` read from config; fail-fast if missing | Not hardcoded in source — config value set per environment; matches existing JWT fail-fast pattern |
| Seeding assigns `"Admin"` role to existing confirmed user only; no user creation | Account creation belongs to `AuthController`; only verified users should hold the role |
| `"Admin"` role assigned at `ConfirmEmail`, not at registration | Prevents unconfirmed accounts from holding the role; no cleanup needed for abandoned registrations |
| `AiUser` toggle in `AdminController` requires `EmailConfirmed == true` | Only verified users can receive AI access; consistent with the verified-only principle |
| Admin cannot remove their own `"Admin"` role or AI access via the API | Prevents accidental self-lockout |

---

## API Shape

### List users
```
GET /api/admin/users
Authorization: Bearer <token> (Admin role required)
```

Response:
```json
[
  { "id": "abc123", "email": "user@example.com", "isAiUser": true },
  { "id": "def456", "email": "other@example.com", "isAiUser": false }
]
```

### Toggle AI access
```
PATCH /api/admin/users/{userId}/ai-access
Authorization: Bearer <token> (Admin role required)
Content-Type: application/json

{ "enabled": true }
```

Response: 200 on success, 404 if user not found, 400 if toggling own access.

---

## Steps

| # | Item | Status |
|---|---|---|
| 1 | Add `.AddRoles<IdentityRole>()` to Identity setup in `Program.cs` + migration for role tables | done |
| 2 | Add static `Roles` class with `Admin` and `AiUser` constants | done |
| 3 | Add `Admin:Email` to config + fail-fast validation + seed roles on startup; assign `"Admin"` to existing confirmed user if found; assign `"Admin"` in `ConfirmEmail` for new admin registrations | done |
| 4 | Include roles as claims in JWT at login in `AuthController` | — |
| 5 | Register `"AiEnabled"` and `"Admin"` policies in `Program.cs` | — |
| 6 | Add `AdminController` — `GET /api/admin/users` + `PATCH /api/admin/users/{userId}/ai-access` | — |
| 7 | Frontend admin page — user table with `IsAiUser` toggle per row | — |

---

## Notes

- `Admin:Email` set in `appsettings.Development.json` and production environment variables. Use a placeholder (`admin@example.com`) in any checked-in config files.
- Startup seeding is idempotent — creates roles and promotes an existing confirmed admin user; does not create users; logs and continues if admin not found.
- Tests: seed roles and users directly in the in-memory DB; no startup seeding logic needed in tests.

---

## Future Enhancement — Pattern 1: Self-Service Request + Email Approval

Not implemented. Documented for future reference.

**Flow:**
1. User clicks "Request AI Access" in settings
2. Backend sends admin an approval email with a signed token link
3. Admin clicks link → `"AiUser"` role assigned to user
4. User receives confirmation email

**What it would add:**
- `POST /api/account/request-ai-access` — sends approval email to admin
- `POST /api/admin/ai-access/approve?token=...` — validates token, assigns role
- Email templates for request notification and user confirmation
- "Request Access" button in frontend settings page
