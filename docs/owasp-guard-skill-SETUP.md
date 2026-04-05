# OWASP Guard — Setup

## Installation

Copy both skill folders into your Claude Code skills directory:

```
.claude/skills/
├── owasp-guard/
│   ├── SKILL.md
│   ├── references/
│   │   ├── python.md
│   │   ├── javascript.md
│   │   ├── go.md
│   │   ├── java.md
│   │   └── csharp.md
│   └── cache/
│       ├── last_updated.json
│       └── *.md              ← pre-bundled cheat sheets
└── owasp-update/
    └── SKILL.md
```

Both folders must be direct siblings under the same parent directory.
`owasp-update` locates the cache via `../owasp-guard/cache/`, so this layout is required.

`owasp-guard` activates automatically on security-relevant code.
`owasp-update` is manual only — run `/owasp-update` to refresh cached cheat sheets.

## Network Requirements

These domains must be reachable from your Claude Code environment for full functionality.

| Domain | Used by | Purpose | Required? | Fallback |
|---|---|---|---|---|
| `raw.githubusercontent.com` | `/owasp-update` | Fetch OWASP cheat sheet content | Yes | None — update cannot proceed without this |
| `api.github.com` | `/owasp-update` | Check if cached sheets are outdated (commit SHA comparison) | Recommended | Falls back to 90-day timestamp check |
| `api.osv.dev` | `owasp-guard` | Verify suggested packages have no known CVEs | Recommended | Falls back to web search |

### How to allow domains

In Claude Code, network access is configured in your project or global settings.
Add the required domains to your allowed list. The exact method depends on your
environment (direct internet, corporate proxy, Claude Code network config).

## Usage

Once installed, `owasp-guard` works automatically. No action needed — it checks
security-relevant code against the OWASP Top 10:2025 as you work.

To refresh the cheat sheet cache:

```
/owasp-update
```

This detects your project's language, checks which sheets are stale, and fetches
only what has changed. If the cache is over 90 days old, `owasp-guard` will
suggest running this command once per session.

## Pre-bundling the Cache

To avoid any runtime fetching, you can pre-populate the cache directory with
cheat sheet files before distributing the skill. Place `.md` files from
the OWASP CheatSheetSeries repo into `owasp-guard/cache/` and create a
`last_updated.json` with entries for each file:

```json
{
  "SQL_Injection_Prevention_Cheat_Sheet.md": {
    "commit_sha": null,
    "fetched_at": "2026-04-01T00:00:00Z"
  },
  "Authentication_Cheat_Sheet.md": {
    "commit_sha": null,
    "fetched_at": "2026-04-01T00:00:00Z"
  }
}
```

Set `commit_sha` to `null` if you don't have the GitHub commit SHA —
`/owasp-update` will fill it in on the next run. Set `fetched_at` to the
date you downloaded the files. The guard skill will use these directly.

If you are not pre-bundling, run `/owasp-update` once and check
`last_updated.json` afterwards to verify the format matches the example above.

---

<!-- PENDING INVESTIGATION — remove this section once resolved -->
## SHA Staleness Check: Rate Limit Problem & Proposed Fix

> **Status: unverified proposal.** Do not change `SKILL.md` until the verification steps below pass.

### Current approach (per-file commits endpoint)

`/owasp-update` currently checks each sheet for staleness by calling:

```bash
curl -s "https://api.github.com/repos/OWASP/CheatSheetSeries/commits?path=cheatsheets/<FILENAME>&per_page=1"
```

One call per sheet. For 48 sheets this burns 48 of the 60 unauthenticated requests allowed
per hour by the GitHub API. Run it alongside content fetching (another 48 calls) and the
rate limit is exhausted, leaving `commit_sha: null` in `last_updated.json` for most entries.
With null SHAs, staleness falls back to a 90-day timestamp check, meaning sheets get
re-downloaded on schedule even if nothing changed upstream.

### Proposed alternative (single tree call)

Replace the 48 per-file calls with one call to the git tree endpoint:

```bash
curl -s "https://api.github.com/repos/OWASP/CheatSheetSeries/git/trees/master?recursive=1"
```

This returns a JSON object whose `tree` array lists every file in the repo with its path
and blob SHA:

```json
{
  "truncated": false,
  "tree": [
    { "path": "cheatsheets/Authentication_Cheat_Sheet.md", "sha": "d4e5f6...", "type": "blob" },
    { "path": "cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.md", "sha": "a1b2c3...", "type": "blob" }
  ]
}
```

Filter entries where `type == "blob"` and `path` starts with `cheatsheets/`. Build a
filename -> blob SHA map. The decision logic per sheet becomes:

```
tree blob SHA == stored SHA  →  skip (content unchanged)
tree blob SHA != stored SHA  →  download + update SHA
file missing on disk         →  download + update SHA
stored SHA is null           →  download + update SHA
```

**Why blob SHA instead of commit SHA:** Blob SHA is the hash of the file content itself.
It changes if and only if the file content changes — same staleness signal as a commit SHA,
but available from a single tree call instead of 48 individual commit lookups.

**90-day fallback:** With blob SHAs stored for all entries the 90-day timestamp fallback
never fires. It remains only as a safety net for entries where `commit_sha` is null (i.e.
the GitHub API was unreachable when the file was last fetched).

**`truncated` flag:** If the repo ever exceeds ~100,000 tree entries GitHub sets
`"truncated": true` and omits some files. The OWASP repo is well under that limit, but
the implementation should check this flag and fall back to the timestamp check if true.

### Migration: back-fill blob SHAs to avoid re-downloading cached files

The current `last_updated.json` has 6 entries with commit SHAs (wrong type) and 42 with
`null`. Switching to blob SHAs without a migration step would cause all 48 sheets to be
re-downloaded on the first run (commit SHAs don't match blob SHAs, nulls always trigger
download). Avoid this by back-filling blob SHAs before updating the skill — 1 API call,
0 content downloads:

**Step 1 — fetch the tree** (wait for GitHub rate limit to reset first if needed):
```bash
curl -s "https://api.github.com/repos/OWASP/CheatSheetSeries/git/trees/master?recursive=1" \
  > /tmp/owasp_tree.json
```

**Step 2 — verify the response is not truncated:**
```bash
jq '{truncated: .truncated, cheatsheet_count: [.tree[] | select(.path | startswith("cheatsheets/"))] | length}' /tmp/owasp_tree.json
```
Expected: `truncated: false`, count around 100+.

**Step 3 — back-fill blob SHAs into `last_updated.json`** (preserves `fetched_at`, replaces SHA only):
```bash
CACHE=".claude/skills/owasp-guard/cache"
jq --slurpfile tree /tmp/owasp_tree.json \
  'to_entries | map(
    .key as $f |
    ($tree[0].tree[] | select(.path == "cheatsheets/\($f)") | .sha) as $blob |
    {key: $f, value: (.value + {commit_sha: ($blob // .value.commit_sha)})}
  ) | from_entries' \
  "$CACHE/last_updated.json" > /tmp/last_updated_new.json \
  && mv /tmp/last_updated_new.json "$CACHE/last_updated.json"
```

**Step 4 — update `SKILL.md`** step 3 to use the tree endpoint instead of per-file commits.

**Step 5 — run `/owasp-update`** and confirm 0 sheets are downloaded (all SHAs should match).

**Step 6 — remove this section** from the doc once confirmed working.

<!-- END PENDING INVESTIGATION -->

---

## AI/LLM Security

The OWASP Cheat Sheet Series includes sheets for AI/LLM security that are
not part of the OWASP Top 10:2025 but are relevant if your project integrates
LLMs, AI agents, or MCP:

- `LLM_Prompt_Injection_Prevention_Cheat_Sheet.md`
- `AI_Agent_Security_Cheat_Sheet.md`
- `MCP_Security_Cheat_Sheet.md`

These are not covered by `owasp-guard`. If your project needs them,
either add them to this skill's reference files and checklist, or create
a separate skill using this one as a reference for structure.
