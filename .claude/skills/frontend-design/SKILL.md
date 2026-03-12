---
name: frontend-design
description: Improve the visual design of the job tracker React frontend. Use when asked to improve, redesign, restyle, or enhance the UI in job-tracker-ui/.
---

## Scope

### Allowed
- Restyling existing components and pages
- Improving layout, spacing, typography, color
- Adding or modifying Tailwind utility classes
- Refactoring components in `src/components/` for visual improvements
- Adding new shadcn/ui primitives if needed

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