# Product plan: repo-split

## Maturity
lowest: 👤 human-ok
🌱 idea 0 · 🤖 ai-audited 0 · 👤 human-ok 10 · ✅ settled 0

## about
👤 human-ok

Fork the current public repo into a new private repo under the new brand
name. The new private repo becomes the sole location for all future
development — rebranding (#136), subscription-tiers (#137),
hosting-migration (#138), and anything after. This public repo is cleaned up
after the fork point and kept around as a portfolio/open-source artifact, not
actively developed further.

## problem / motivation
👤 human-ok

This repo is public with no LICENSE file. Once self-serve paid plans ship
(`docs/plans/subscription-tiers`), the code implementing billing, tier caps,
and usage tracking would sit in a public repo anyone can clone — making it
trivial to stand up a free competing clone of a paid product. Splitting off a
private repo before that code exists avoids ever publishing it in the first
place.

This isn't a reaction to anything already leaked: cost estimates
(`docs/ai-cost-estimate.md`), infra setup docs, and past plan docs are
already public, and the user has explicitly decided not to worry about or
scrub that — it stays as-is. The split only protects what hasn't been
written yet.

This also isn't a new pattern for this project — the desktop app already
works this way: a private `job-tracker-desktop` source repo, with only a
public `job-tracker-desktop-releases` repo for installers
(`docs/plans/desktop-app-download/product.md:69-71`). This plan extends the
same shape to the main web app.

## goal
👤 human-ok

Two repos exist going forward: this one (public, frozen at the fork point
plus a cleanup pass, no further feature development) and a new one (private,
under the new brand name, where rebranding, subscription-tiers,
hosting-migration, and all subsequent work happens). Both carry an explicit
LICENSE file.

## audience
👤 human-ok

The user, as maintainer of both repos and owner of the commercial product.
Secondarily, anyone browsing the public repo as a portfolio piece.

## requirements
👤 human-ok

- When the fork happens, the system shall mirror full git history
  (`git push --mirror` into a new empty private repo) rather than starting
  from a fresh `git init`, so the private repo retains everything currently
  public plus all commit history.
- When the new private repo is created, the system shall apply the new brand
  name from `docs/plans/app-rebrand` (repo name, README, in-app product name
  strings).
- After the fork point, all future work on rebranding, subscription-tiers,
  hosting-migration, and later features shall land in the new private repo,
  not this one.
- After the fork, this repo shall get a cleanup pass so its latest state
  looks presentable to anyone browsing it — scope of that pass (README
  rewrite, pinning/tagging the fork point, archiving vs. staying active) is
  still open, see below.
- The public repo shall carry a permissive open-source LICENSE.
- The new private repo shall carry a proprietary/all-rights-reserved LICENSE.

## stack
👤 human-ok

Not a technology choice — this is a repo-hosting and licensing decision.

**Public repo — MIT License (recommended).** Simple, universally recognized,
permissive: anyone can view, fork, and reuse the code, which fits the
"portfolio piece" goal. No patents are involved, so MIT's lack of an explicit
patent grant isn't a gap here.

Alternatives considered:
- **Apache 2.0** — adds an explicit patent grant and patent-retaliation
  clause; unnecessary legal weight for a personal portfolio project.
- **BSD-2/3-Clause** — functionally equivalent to MIT; less immediately
  recognizable to someone skimming a portfolio repo, no real advantage over
  MIT here.

**Private repo — Proprietary / All Rights Reserved (recommended).** A short
LICENSE file stating the code is confidential and no rights are granted to
use, copy, or distribute it. Mirrors how `job-tracker-desktop` (private)
already sits next to `job-tracker-desktop-releases` (public).

Alternatives considered:
- **No LICENSE file at all** — copyright protection is automatic even
  without one, but leaving it implicit invites ambiguity the moment a
  contractor, co-founder, or investor gets repo access.
- **Business Source License (BSL)** — restricts competing commercial use
  while promising the code goes open-source after a fixed delay. Only earns
  its complexity if outsiders (investors, contractors) get read access before
  the repo is ever meant to be public; overkill for a fully private, solo
  repo today.

## target device / platform
👤 human-ok

Not applicable — this is a repo-management and licensing decision, not
user-facing software.

## constraints
👤 human-ok

- Git history is never rewritten or squashed — past commits stay reachable via
  `git log`/GitHub history. The current file tree is fair game to curate
  (e.g. `git rm` a doc via a normal commit) during the cleanup pass.
- The private repo must retain full commit history from the fork point, not
  a squashed or fresh start.

## non-goals
👤 human-ok

- Not rewriting or squashing git history in either repo — see constraints
  above.
- Not building a sync or merge mechanism between the two repos going
  forward — this is a one-time fork, not ongoing dual-maintenance.
- Not a licensing scheme beyond a single top-level LICENSE per repo — no CLA,
  no dual-licensing.

## open questions
👤 human-ok

- Exact new brand/repo name — still open, tracked in the private repo now
  (`docs/plans/app-rebrand` was removed from this repo since that work no
  longer happens here; see about section).
- **Resolved:** fork executed — mirrored into the private repo, GitHub
  Actions secrets re-added, gitignored local files copied over.
- Scope of the public repo's post-fork cleanup pass: README updated to
  reflect current features/stack; noobi-only plan docs (app-rebrand,
  subscription-tiers, hosting-migration) removed from the tree. Tagging the
  fork commit and archive-vs-active still open.
