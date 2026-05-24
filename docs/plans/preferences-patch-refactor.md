# Preferences — Refactor PUT to PATCH

## Problem

`PUT /api/account/preferences` replaces the entire preferences blob. Every caller must
spread the existing prefs before overriding their fields, coupling unrelated components
to the full `Preferences` shape. Each new preference field added to the backend requires
auditing all frontend callers.

## Decision

Refactor to `PATCH /api/account/preferences` with merge semantics:
- Backend reads current prefs, merges the partial fields, re-saves
- Frontend `updatePreferences` accepts `Partial<Preferences>` and sends `PATCH`
- Each component sends only the fields it owns — no spreading required

## What changes

| Location | Change |
|---|---|
| `AccountController.cs` | `[HttpPut]` → `[HttpPatch]`; read current prefs, merge, re-save |
| `UserPreferencesDto` | All fields become nullable/optional for the patch shape |
| `preferencesService.ts` | Method → `PATCH`; param type → `Partial<Preferences>` |
| `ColumnToggle.tsx` | Drop spread — send `{ visibleColumns: draft }` only |
| `SettingsPage.tsx` | Drop spread — send `{ autoFillEnabled: ... }` only |
