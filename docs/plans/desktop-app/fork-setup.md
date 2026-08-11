# Forking into the desktop-app repo

A follow-along runbook for cutting the desktop fork out of this web-app repo. It stops
where `impl.md` Step 1 begins. Assumes the desktop-plan work in this repo is already
committed and merged.

The fork is permanent (`product.md` non-goals: no shared codebase, not a feature flag).
So this is a one-way copy, not a GitHub fork that tracks upstream. The new repo inherits
this project's dev container, firewall, `.claude/` skills and rules, session/docs
conventions, and the no-attribution layers already in place — nothing to re-add.

## 1. Create the new repo

Make an empty repo on GitHub (e.g. `job-tracker-desktop`), then push this project's code
into it. This keeps the full history but detaches from the web app — no fork network, no
upstream tracking.

```bash
# from a clean clone of this repo
git clone https://github.com/NagareNegishi/Job-Application-Tracker.git job-tracker-desktop
cd job-tracker-desktop
git remote set-url origin https://github.com/NagareNegishi/job-tracker-desktop.git
git push -u origin main
```

If you would rather start with a clean history (no web-app commits), squash first:

```bash
git checkout --orphan fresh
git commit -m "Import web-app baseline as desktop fork starting point"
git branch -D main && git branch -m main
git push -f -u origin main
```

Keep history unless you have a reason not to — it costs nothing and records where the
fork came from.

## 2. First commit boundary

Draw the boundary so the diff "what the fork changed vs. the web app" starts from one
clear marker. Make the first fork-only commit a setup/identity commit with **no feature
code touched yet**:

- Point `CLAUDE.md` and `README.md` at the desktop fork: single-user, local-only, Tauri +
  SQLite. Drop the web-app framing (accounts, hosted backend, multi-user).
- Confirm `docs/plans/desktop-app/` (this folder — `product.md`, `impl.md`, this file)
  came across with the push.
- Apply the firewall change from step 3.

Commit it alone, e.g. `chore: reframe repo as local-only desktop fork`. Everything before
this commit is the untouched web-app baseline; everything after is desktop-only work
(`impl.md` Steps 1–11). That baseline is exactly the "before" the plan subtracts from in
Steps 2–4.

## 3. Firewall: add the desktop research domains

`impl.md` leans on Tauri, Rust, and per-platform packaging docs. Add those to the
allowlist in `.devcontainer/project-firewall.sh` (the `for domain in \` block, alongside
the existing npm/NuGet entries) so planning research isn't blocked:

```
    "v2.tauri.app" \
    "crates.io" \
    "docs.rs" \
    "learn.microsoft.com" \
    "flathub.org" \
```

- `v2.tauri.app` — Tauri v2 docs (sidecar, updater, keyring, distribution).
- `crates.io` / `docs.rs` — Rust crate registry and docs.
- `learn.microsoft.com` — Windows MSI/NSIS and Store packaging.
- `flathub.org` — Linux Flatpak distribution.

The Rust toolchain's build-time hosts (rustup, cargo registry mirrors) get added later
when the container actually gains Rust in `impl.md` Step 1 — this step is only about
unblocking research reads now.

## 4. New-repo GitHub setup (one-time)

The publish and label skills need a configured repo:

```bash
gh auth login              # you run this; no skill does
```

Then `/label-setup` (creates the preset labels) and `scripts/protect-main.sh` (require a
PR to merge, block force-push and deletion on `main`).

## 5. Open in the container and confirm the baseline

Reopen in the dev container so the firewall runs with the new domains. Before changing any
code, confirm the imported web app still runs — backend up, frontend rendering against it.
That green baseline is what `impl.md` Step 1 (scaffold the Tauri shell around the existing
frontend) builds on.

## Handoff

Repo exists, identity reframed, firewall widened, baseline confirmed. Start `impl.md`
Step 1.
