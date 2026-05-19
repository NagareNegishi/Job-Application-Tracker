# AI Access & Admin Management

## Overview

Roles-based access control for AI features using ASP.NET Core Identity roles. Two roles: `"Admin"` (manages users) and `"AiUser"` (accesses AI features). Admin bootstrapped from config on startup. Admin controller exposes a user list and AI access toggle.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| ASP.NET Core Identity roles (`"Admin"`, `"AiUser"`) over custom boolean flags | Identity is already in use; roles are the idiomatic pattern — one consistent place for access control as more roles may be needed |
| `"AiUser"` role gates all AI features via `[Authorize(Policy = "AiEnabled")]` | Policy is reusable — any future AI endpoint adds one attribute |
| `"Admin"` role gates admin controller via `[Authorize(Policy = "Admin")]` | Same reusable pattern |
| Static `Roles` class for role name constants | Prevents typo bugs when referencing role names across controllers and seeding |
| Initial admin bootstrapped from `Admin:Email` config on startup | Not hardcoded in source — config value set per environment; idempotent on every startup |
| Fail-fast on missing `Admin:Email` | Matches existing JWT config validation pattern in `Program.cs` |
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
| 1 | Add `.AddRoles<IdentityRole>()` to Identity setup in `Program.cs` + migration for role tables | — |
| 2 | Add static `Roles` class with `Admin` and `AiUser` constants | — |
| 3 | Add `Admin:Email` to config + fail-fast validation + seed roles and assign `"Admin"` on startup in `Program.cs` | — |
| 4 | Include roles as claims in JWT at login in `AuthController` | — |
| 5 | Register `"AiEnabled"` and `"Admin"` policies in `Program.cs` | — |
| 6 | Add `AdminController` — `GET /api/admin/users` + `PATCH /api/admin/users/{userId}/ai-access` | — |
| 7 | Frontend admin page — user table with `IsAiUser` toggle per row | — |

---

## Notes

- `Admin:Email` set in `appsettings.Development.json` and production environment variables. Use a placeholder (`admin@example.com`) in any checked-in config files.
- Startup seeding is idempotent — roles and admin assignment are skipped if already present.
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
