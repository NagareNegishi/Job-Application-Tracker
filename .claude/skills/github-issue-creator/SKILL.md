---
name: github-issue-creator
description: Use this skill whenever the user wants to create a GitHub issue, write up a task or bug report for GitHub, or turn a conversation or rough explanation into a structured GitHub issue. Triggers include phrases like "make an issue", "create a GitHub issue", "write this up as an issue", "turn this into a ticket", "I need an issue for this", or any request that involves producing a title and body suitable for pasting into GitHub's issue form. Also trigger when the user describes a feature, bug, or task and asks you to formalize or structure it. This skill is GitHub-only. Do NOT use for Jira, Linear, Asana, or other issue trackers.
---

# GitHub Issue Creator

Produce a GitHub issue from conversation context or rough input. Output must be copy-paste-ready.

## Example output — follow this format exactly

**Suggested title:** `feat: add bulk export for user activity logs`

**Body:**

Allow admins to export user activity logs as CSV for compliance auditing. No current way to extract this data without direct DB access.

- [ ] Add date range picker to activity logs page
- [ ] Implement backend endpoint for filtered CSV generation
- [ ] Handle large exports via streaming or background job
- [ ] Add export button to admin UI with loading state
- [ ] Include columns: user, action, timestamp, IP, resource
- [ ] Write tests for export endpoint edge cases
- [ ] Update admin docs with export instructions

## Rules beyond what the example shows

- Title: use `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefix when obvious. Keep under 70 chars.
- Each checkbox = a coherent unit of work. Not micro-steps, not mega-tasks.
- Keep checkboxes between 4–20. If exceeding 20, consolidate first. If still over 20, split into separate issues — produce the first one, suggest follow-up titles with one-line descriptions, and ask the user if they want those written out.
- Add `### Context` or `### Notes` only when there's genuinely useful background. Otherwise omit entirely.