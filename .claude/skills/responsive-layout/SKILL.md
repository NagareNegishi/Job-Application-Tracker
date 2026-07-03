---
name: responsive-layout
description: >
  Find and fix frontend layout issues that break at small window or mobile sizes.
  Three modes: "scan" builds/updates the frontend file inventory, "audit" finds
  risky styles and records them, "fix" resolves recorded issues one at a time.
  Use when the user runs /responsive-layout <mode> or asks to make the UI responsive.
---

# Responsive Layout

## State files

- `.claude/skills/responsive-layout/files.json` — frontend file inventory
- `.claude/skills/responsive-layout/issues.md` — open issue list

Outside of fix mode, these two files are the ONLY files this skill may write.
Fix mode may additionally edit files listed in `files.json`.

## Constraints (all modes)

- No functional changes — className / CSS edits only
- No new npm dependencies
- Match the project's existing styling system (Tailwind, CSS modules, plain CSS, styled-components) — do not introduce a new one
- If the project uses Tailwind: mobile-first (base classes = small screen, add `sm:` / `md:` / `lg:` for larger)
- Do not run git commands or dev servers — suggest commands in a code block for the user to run

## Mode selection

Argument `scan`, `audit`, or `fix` selects the mode.
No argument: read both state files, report counts (files tracked / unaudited / open issues), ask which mode to run.

## Mode: scan — build or update the file inventory

1. Detect the frontend root (first scan only): find a `package.json` with a UI framework
   dependency (react, vue, svelte, angular); the frontend root is that package's source
   folder (usually `src/`). If none or several match, ask the user. Store the result in
   `files.json` under `"config"` and reuse it on later runs.
2. Glob markup and style files under the root: `**/*.{tsx,jsx,vue,svelte,html}` and
   `**/*.{css,scss}`. Keep files that render styled markup (pages, components, layouts,
   global stylesheets). Exclude folders holding only types, API clients, hooks, state
   stores, tests, or generated code — read a sample file when unclear from the folder name.
3. Read `files.json` (missing → `{}`). Add new files with `"audited": null`, keep existing entries unchanged, delete entries whose file no longer exists.
4. Write `files.json`. Report: total tracked, newly added, removed.

Schema — file paths relative to the detected root, so the inventory stays portable:
```json
{
  "config": { "root": "job-tracker-ui/src" },
  "files": { "components/KanbanBoard.tsx": { "audited": "2026-07-03" } }
}
```

## Mode: audit — find issues, record only, fix nothing

1. Read `files.json`. If missing or empty, run scan mode first.
2. Process files with `"audited": null` one at a time: read the file, apply the checklist, append findings to `issues.md`, set the file's `audited` date. This keeps progress if interrupted. (Re-audit all files only if the user explicitly asks.)
3. Checklist — names below are Tailwind; look for the equivalent pattern in whatever
   styling system the project uses. Flag any of:
   - Fixed widths/heights on containers: `w-[Npx]`, `min-w-[Npx]`, `w-96`+, inline `style` widths
   - Multi-column layout without responsive prefixes: `grid-cols-N` (N ≥ 2) or side-by-side flex rows with no `sm:`/`md:` variant
   - Flex rows of multiple fixed-size children without `flex-wrap`
   - Tables or wide content without an `overflow-x-auto` wrapper
   - `absolute`/`fixed` positioning with hard pixel offsets
   - Dialogs/popovers with fixed width and no `max-w-*` viewport fallback
   - Large fixed horizontal padding (`px-10`+) on page-level containers
   - Hardcoded `px` widths in CSS files with no media query
4. Do not modify any source file in this mode.
5. Report: files audited this run, issues appended, files remaining.

Issue entry format in `issues.md` — one `##` block per issue, located by
component + element description + a short class snippet (NOT line numbers):

```markdown
## job-tracker-ui/src/components/KanbanBoard.tsx — board column container
- Snippet: `className="grid grid-cols-5 gap-4"`
- Risk: 5 fixed columns overflow below ~1024px
- Suggestion: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`
```

## Mode: fix — resolve one issue per pass

1. Read `issues.md` with `limit: 30` — only enough to get the FIRST issue block. Do not load the whole list into context.
2. Read the target file, locate the element via the snippet. If the snippet no longer matches, report it and remove the stale entry instead of guessing.
3. Fix with responsive Tailwind classes. Smallest change that resolves the risk — do not restyle surrounding code.
4. Remove the fixed issue's block from `issues.md` with Edit.
5. Show what changed and why, state how many issues remain, then STOP and wait for approval before the next fix. Suggest the user verify at a narrow window width with the project's frontend dev command.
