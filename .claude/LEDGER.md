---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-07
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Both items the last session flagged as needing your decision are done — you said "let's fix
both of these now" and they shipped the same session, live-verified.**

**`sgs/media` and `sgs/hero` borders can now change colour on hover.** Same capability
`sgs/button` and `sgs/container` already had; the shared media-atom that owns their border
never got it. Checked live on the canary — hover the image, the border colour changes; move
away, it goes back. Confirmed by you directly in the editor too.

**The cheat-gate false alarm is gone.** A legitimate, tested line of pipeline code was tripping
a fraud-detection check meant to catch a different, real problem (a converter accidentally
copying a draft's own styling class onto a clone). Told the checker about that one legitimate
line by name, proved it still catches a real violation elsewhere.

**Bonus, found along the way:** the box-shape deploy's full test run surfaced two unrelated,
pre-existing test failures elsewhere in the pipeline (nothing to do with the border work) —
root-caused properly (not guessed) and fixed, so the deploy gate is fully green again rather
than needing a bypass every time.

## Shipped today (2026-09-07)

| What | Detail lives at |
|---|---|
| **`sgs/media`/`sgs/hero` border hover/gradient state** (matches button/container's pattern) | D985 · `11f1e2386` (merged direct to `main`, no PR — D983) |
| **Cheat-gate Check #9 allowlist** for `section_passes.py`'s legitimate anchor-class write | D985 · `3e20518c7` |
| **Two pre-existing converter test failures root-caused + fixed** (tier-of-boxes COLLISION false-positive; missing `xfail` marker) | D985 · `efeb0b8e7` |

## Blockers

**None.**

## THE FRONT — three live tracks, pick one

Untouched this session — still the live front from 2026-09-06.

### Track A — colour conformance, TEXT surface
**Read first (full, not skim):** `.claude/prompts/2026-09-06-colour-conformance-text-surface-next.md`.
FILL surface closed 2026-09-06 (`b30c6bfc4`); TEXT is the next-largest colour category.

### Track B — tier-object migration, Phase 3 remainder
**Read first:** `.claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md` (full read).
Groups 0+1 done and merged; Priorities 1-6 remain (media-atom migration, border-radius stragglers,
a compliance gate — live order in the file). Independent of Tracks A/C.

### Track C — the 8 orphaned-branch draft PRs (#53-#60)
**Superseded/verified salvage-free 2026-09-07 (D983's trigger event) — every one already
superseded by work on `main`, zero salvage.** Several would have REGRESSED `main` if merged.
Bean can close these PRs at leisure; no further investigation needed.

## Open — carried from before (not touched this session, still real)

- **`push-theme-snapshot.py`** — last known (2026-08-18): aborts safely for mamas-munches, refuses
  to write `wp_global_styles` without a verified backup. NOT re-verified since.
- **`text-secondary` client-only slug read by framework code** (`sgs-text-variations.php:83`) —
  needs per-client resolution or a decision to seed it for all clients.
- **5 blocks missing `:focus-visible`** on `:hover`: `hero`, `icon-list`, `mega-panel`,
  `process-steps`, `testimonial` (35 comply).
- **45 attributes a client can never reach** — needs per-attribute judgement, not a blind fix.
- **Two dead components** (`StateToggleControl`, `SgsLinkControl`) — clutter, not gaps.
- **`box-shape`/`overlay`'s `:hover` rules are unguarded against touch-hover-stuck** — flagged,
  not fixed, this session (D985 detail): `scripts/hover-guard/` only scans `build/blocks/*/style.css`
  and PHP render surfaces, never `assets/css/media-atoms/*.css`. A real, named gap in the
  hover-guard tooling's coverage, shared by the whole media-atom family — not unique to this
  session's change.

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees can inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A verdict function needs the same can-this-fail proof as a gate.**
- ⛔ **A subagent must never mutate a repo file as a test fixture** — require temp fixtures.
- ⛔ **Metadata is not evidence.** Filename, line count, file existence, grep-hit count — open the file.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines of output — never `--no-verify`; use
  the scoped `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` + `generate-attr-role-map.py`
  immediately, not at session end.**
- **A "dead control" can mean the CHILD block is missing context**, not that the control is dead.
- **An exemption heuristic must check what CONTAINS a rule** (`@media`, `@container`), not just
  the rule's own selector text.
- **NEW (2026-09-07, D983): commit straight to `main`, never open a PR, never `git stash`;
  integrate with `origin/main` after every completed task, not per session.**
- **NEW (2026-09-07): a shared custom-property-only atom (values only, never bare CSS rules)
  needing a hover/gradient pair should NOT reach for `sgs_border_gradient_css()` (masked
  `::before`-ring, emits full rules) — use the atom's own paired-custom-property pattern
  instead (`overlay.js`'s `hoverPaint`). Check the atom's OWN contract before borrowing a
  helper by analogy to a different block's border mechanism.**
- **NEW (2026-09-07): `build-deploy.py --payload` breaks the deploy↔commit deadlock** when the
  pre-commit visual-diff gate demands a live capture — scoped canary-deploy the uncommitted
  payload, capture the report, then commit.
- **NEW (2026-09-07): a dirty file in a SHARED worktree overlapping an incoming merge blocks
  the fast-forward** — don't stash/checkout over it (another track's work); rely on
  `origin/main` as the source of truth, or merge via an isolated `git worktree add`.

## State Snapshot

- **Branch:** `main`. `origin/main` at `11f1e2386` (confirmed pushed). **The local primary
  worktree's HEAD may lag behind this** — it could not fast-forward past `efeb0b8e7` because
  `plugins/sgs-blocks/src/blocks/hero/render.php` carries a concurrent session's uncommitted
  work (a border-radius-legacy-args codemod, `strip-dead-radius-legacy-args.py`, unrelated to
  this session). Do not stash or discard it — re-check `git status` and let that track land its
  own commit, then `git pull --ff-only`.
- **D-ceiling:** **D985** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npm run build` (sgs-blocks) — full gate chain including `hover-guard`,
  `check-dead-controls`, `check-hardcoded-render-defaults`, payload-verify (83/83) all pass.
  `npm run gate:full` (the exact pre-deploy pytest scope) — clean, 1055 passed / 0 failed.
- **Canary:** deployed + live-verified via Playwright this session (box-shape hover, both
  `sgs/media` and `sgs/hero`). Probe page (3350) created and deleted after verification —
  nothing left on the canary from this session. `push-theme-snapshot.py` status from
  2026-08-18 NOT re-checked.
- **Open PRs:** #53-#60 still open on GitHub, confirmed salvage-free (Track C) — Bean can close
  at leisure. No new PRs opened this session (D983: commit straight to `main`).
- **Uncommitted (NOT this session's, left untouched):** ~55 files under `plugins/sgs-blocks/`
  (a border-radius-legacy-args codemod in progress on another track) + `.claude/handovers/
  2026-08-26-product-card-media-panel.md` (shown deleted) + root `CLAUDE.md`. Re-check
  `git status` yourself before assuming any of this is safe to touch.

## Pointers

| For | Read |
|---|---|
| **Colour conformance TEXT surface (Track A)** | `.claude/prompts/2026-09-06-colour-conformance-text-surface-next.md` |
| **Tier-object migration Phase 3 (Track B)** | `.claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md` |
| **Typography Task 3 status (PARTIAL — re-verify before trusting)** | `.claude/prompts/2026-09-06-typography-task3-close-plus-converter-bug.md` |
| **This session's box-shape hover work** | D985 in `decisions.md`; `reports/visual-diff/{media,hero}-2026-09-07.md` |
| **Known gap: media-atom `:hover` rules unguarded against touch-hover-stuck** | This file's "Open" section above; `scripts/hover-guard/check.js` (scope) |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Border controls standard (`SgsBorderControl`, colour helper registry) | `plugins/sgs-blocks/CLAUDE.md` "Border controls" + "Colour EMISSION helpers" |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
