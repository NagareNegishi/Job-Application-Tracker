---
name: frontend-design
description: Improve the visual design of the job tracker React frontend. Use when asked to improve, redesign, restyle, or enhance the UI in job-tracker-ui/.
---

## Scope

### Allowed
- Restyle one component at a time — stop after each and wait for approval
- Improving layout, spacing, typography, color
- Adding or modifying Tailwind utility classes
- Refactoring components in `src/components/` for visual improvements
- Suggest new shadcn/ui primitives before adding — explain why it's needed and what alternatives exist, then wait for approval

### Off-limits
- Do not modify backend files (`JobTrackerApi/`, `JobTrackerApi.Tests/`)
- Do not change `src/services/`, `src/hooks/`, or `src/types/`
- Do not change routing structure
- Do not modify `vite.config.ts`, `tsconfig.json`, or build config
- Do not add npm dependencies without explicit approval

## Conventions
- Tailwind utility classes only — no inline styles, no CSS modules
- Use shadcn/ui primitives from `src/components/ui/` before creating new components
- Use `@/` path alias for all imports
- Enums use `const` object pattern — never the `enum` keyword

## Workflow

### Before starting
If the request is ambiguous, do not proceed — ask for clarification first:
- If layout or positioning is unclear, generate 2–3 concrete options and ask which to use, with an option to describe something different
- If the target component is not specified, ask which one

### Per component loop
1. Make changes to one component only
2. Show a summary of what changed and why
3. Stop and wait — do not proceed to the next component
4. If approved, commit with a short descriptive message
5. If not approved, ask what to change before retrying