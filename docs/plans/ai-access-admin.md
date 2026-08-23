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
| Seeding assigns `"Admin"` and `"AiUser"` to existing confirmed user only; no user creation | Account creation belongs to `AuthController`; only verified users should hold the role; admin always gets AI access since they can't self-assign |
| `"Admin"` and `"AiUser"` assigned together at `ConfirmEmail` and startup seed | Admins can't self-assign `AiUser` via the toggle (self-modification blocked); assigning both at promotion is the only reliable path |
| `AiUser` toggle in `AdminController` requires `EmailConfirmed == true` | Only verified users can receive AI access; consistent with the verified-only principle |
| Admin cannot remove their own `"Admin"` role or AI access via the API | Prevents accidental self-lockout |
| `AdminController` fetches all users + `GetUsersInRoleAsync` per role (3 queries total) instead of `IsInRoleAsync` per user (N×2 queries) | Flat query count regardless of user count |
| Response DTOs named `UserListItemDto` and `UpdateAiAccessDto` | Matches existing naming pattern: response DTOs describe shape, request DTOs describe action |
| Frontend reads roles by decoding JWT payload — no extra API call or state | Token is already in memory; roles in the token stay in sync with backend automatically via token refresh |
| Admin page at `/admin` — separate route, no nav link shown to non-admins | Keeps admin surface invisible to regular users without disrupting existing components |

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
  { "id": "abc123", "email": "user@example.com", "isAiUser": true, "isAdmin": true },
  { "id": "def456", "email": "other@example.com", "isAiUser": false, "isAdmin": false }
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
| 4 | Include roles as claims in JWT at login in `AuthController` | done |
| 5 | Register `"AiEnabled"` and `"Admin"` policies in `Program.cs` | done |
| 6 | Add `AdminController` — `GET /api/admin/users` + `PATCH /api/admin/users/{userId}/ai-access` | done |
| 7 | Frontend: `getRoles()`/`hasRole()` in `auth.ts`; `AdminRoute` component; `/admin` route in `App.tsx`; `adminService.ts`; TanStack Query hooks; `AdminPage` with user table and `IsAiUser` toggle | done |
| 8 | Unit tests — `AdminControllerTests.cs` (6 tests: `GetUsers`, `UpdateAiAccess`); 3 `ConfirmEmail` admin promotion tests added to `AuthControllerTests.cs` | done |
| 9 | Production config — add `Admin__Email: ${ADMIN_EMAIL}` to backend `environment` in `compose.prod.yml`; add `ADMIN_EMAIL=admin@example.com` placeholder to `.env.example`; add `export ADMIN_EMAIL="${{ secrets.ADMIN_EMAIL }}"` to deploy job SSH session in `.github/workflows/deploy.yml`; add `ADMIN_EMAIL` as a GitHub Actions secret | done |

---

## Notes

- `Admin:Email` set in `appsettings.Development.json` and production environment variables. Use a placeholder (`admin@example.com`) in any checked-in config files.
- Startup seeding is idempotent — creates roles and promotes an existing confirmed admin user; does not create users; logs and continues if admin not found.
- Tests: `AdminControllerTests` mocks `UserManager` directly — no `DbContext` needed. `TestAsyncEnumerable` helpers copied from `AuthControllerTests` (needed for `Users.OrderBy().ToListAsync()`). Startup seeding in `Program.cs` is not unit-testable — requires `WebApplicationFactory` (integration test); skipped by design.
- **Confirmed**: `ClaimTypes.Role` serializes as the full URI (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`) in the JWT payload — the `OutboundClaimTypeMap` does not apply in .NET 10. Backend uses `new Claim("role", role)` explicitly so the frontend can read `payload.role`. The `InboundClaimTypeMap` maps `"role"` → `ClaimTypes.Role` on parse, so `RequireRole()` policies are unaffected.

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
