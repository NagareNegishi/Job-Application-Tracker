# Project Seed — Build Plan

Source: `Job-Application-Tracker` repo. Target: a fresh repo marked as a GitHub
template. No cloning — cloning drags this project's history into the seed.

## Decisions

- Fresh repo + GitHub "Template repository" flag, not a clone.
- Stack examples are real files under `examples/`, not code blocks in markdown.
- Keep a minimal working Dockerfile + compose pair. The firewall install lives in
  the Dockerfile, so the seed cannot ship `devcontainer.json` alone.
- The `claude-credentials` volume keeps its fixed name: every project built from
  the seed shares one Claude login/config. Documented in the seed README.

## Target layout

```
seed-repo/
├── .devcontainer/
│   ├── devcontainer.json        # generic base, placeholders marked
│   ├── docker-compose.yml       # app service + claude-credentials volume only
│   ├── Dockerfile               # FROM <placeholder> + firewall install block
│   ├── project-firewall.sh      # generic allowlist + "add stack domains here"
│   └── .env.example
├── .claude/
│   ├── settings.json
│   └── skills/                  # portable skills only
├── docs/
│   ├── progress.md              # empty template
│   └── plans/                   # .gitkeep; convention documented in CLAUDE.md
├── examples/
│   └── dotnet-postgres/         # this repo's real files + per-stack README
├── CLAUDE.md                    # section-header skeleton to fill per project
└── README.md                    # what the seed is + instantiation checklist
```

## Keep and genericize

- `.devcontainer/devcontainer.json` — placeholders for: `name`, `forwardPorts`,
  `postCreateCommand` entries, `TZ`. Move the Kestrel `remoteEnv` block and the
  `aspnet-https` mount to the dotnet example. Keep: features (node, claude-code),
  `claude-credentials` mount, `containerEnv` (NODE_OPTIONS, CLAUDE_CONFIG_DIR),
  firewall `postStartCommand` + `waitFor`.
- `.devcontainer/Dockerfile` — keep base-image placeholder, firewall package
  installs (iptables, ipset, iproute2, jq, dnsutils, aggregate), firewall
  COPY/chmod/sudoers block. Move `postgresql-client` and `dotnet-ef` to the example.
- `.devcontainer/docker-compose.yml` — keep `app` service and `claude-credentials`
  volume. Move `db` service, `postgres-data`, `aspnet-https` to the example.
- `.devcontainer/project-firewall.sh` — generic allowlist: GitHub meta ranges,
  `api.anthropic.com`, `registry.npmjs.org`. Stack block (moved to example, with a
  marked insertion point): `api.nuget.org`, `www.nuget.org`, `globalcdn.nuget.org`,
  `dist.nuget.org`, `marketplace.visualstudio.com`, `vscode.blob.core.windows.net`,
  `update.code.visualstudio.com`, `dotnetcli.blob.core.windows.net`, `ui.shadcn.com`.
  Undecided: `api.osv.dev` (used by owasp skills — generic if those skills ship).
- `.claude/settings.json` — keep permissions as-is. The `.comment-audit` allow
  entries stay only if the code-commenting skill ships with the seed.
- `CLAUDE.md` — ready-made skeleton at `project-seed/CLAUDE.md.template`; rename
  to `CLAUDE.md` at the seed root.
- `docs/progress.md` — empty template with the update convention noted.

## Skills triage (confirm with `ls .claude/skills` — repo-level list unverified)

- Portable as-is: code-commenting, human-writing, github-issue-creator,
  dev-research, owasp-guard/scan/update, unit-tests, learning-mode-coding.
- Genericize or drop: frontend-design, responsive-layout (hardcode `job-tracker-ui/`).

## Create new

- Root `README.md` — instantiation checklist: pick a stack from `examples/`, copy
  its files over the placeholders, set ports, create `.devcontainer/.env`, fill
  `CLAUDE.md`.
- `.devcontainer/.env.example` — placeholder POSTGRES_* vars live in the example;
  the seed copy documents the pattern.
- `examples/dotnet-postgres/` — this repo's actual Dockerfile, docker-compose.yml,
  firewall domain block, devcontainer fragments (ports, mounts, remoteEnv,
  postCreateCommand), `.env.example`, short README.
- `examples/<other-stack>/` — from the user's other projects with similar setups.
- `.gitignore` (base; per-stack additions in examples), `.editorconfig`,
  LICENSE if public.

## Drop

- All source: `JobTrackerApi/`, `job-tracker-ui/`, `JobTrackerApi.Tests/`.
- Project docs: `docs/plans/*`, `docs/progress.md` content,
  `docs/company-verification-api-reference.md`.
- Project git history (fresh `git init`).

## Open items

- Confirm repo-level skill list (`ls -R .claude`).
- Decide seed repo name.
- Decide whether `api.osv.dev` is generic or per-stack.
- Decide which other projects become `examples/` entries, and gather their files.
