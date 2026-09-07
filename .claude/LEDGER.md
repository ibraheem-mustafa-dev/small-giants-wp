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

**Separately (second track, same day): the gates got honest.** Several checks were either
crying wolf or quietly protecting nothing. The pre-merge gate had printed a red FAIL on every
single commit for months — 220 of its 228 "failures" came from a vendored copy of a competitor
plugin that never ships. A gate that always fails is a gate nobody reads, so it was fixed at
the root. The RTL check (does the nav still work in Arabic/Hebrew?) was real, tested, and wired
to nothing — now it runs on every build. And ~480 findings sitting in "known debt" lists turned
out to be mostly resolved years-of-the-week ago; those lists are now accurate or gone.

**The 8 draft PRs and 30 branches are gone.** Every one was checked properly first: all
superseded, nothing lost. Several would have *broken* main if merged.

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
| **Git hygiene locked: no PRs, no stashes, integrate after every task** (project + GLOBAL `~/.claude`) | D983 · `75dfd3058` |
| **8 draft PRs closed + all 30 remote branches deleted** — every one verified superseded, zero salvage | D983 · `045af1ba8` |
| **Dead border-radius tier code purged** — 5 duplicate stanzas + 49 always-null arg pairs + the 3 GENERATORS that re-emit them | `e002bd8b1` |
| **wp-pre-merge-gate stopped failing on every commit** (3 bugs: wrong list, vendored scope, WP dynamic hooks) | D987 · `b166bd164` |
| **gallery `!important` → specificity**; cheat-gate 1 violation → 0, baseline emptied | `b166bd164` |
| **Canary oldshape debt cleared**: dead domain removed, 8 spent probe pages trashed, baseline 197 → 0 | `1e9721cb3` |
| **Enum control-shape band 2-5 → 2-4, five is NEUTRAL** (Bean ruling); 46 → 29 violations | D986 · `1b1ad4712` |
| **`logical-props` RTL gate WIRED IN** + 3 nav conversions (2 kept physical, one JS-coupled) | D987 · `559d05e16` |
| **`multi-button.childBtnBorderRadius` → standard responsive tier object** (+ its check's stale advice fixed) | `0e338b28e` |
| **db-consistency baseline DELETED** — gate now fails on ANY violation (strictest setting) | D988 · `a4e83e46c` |

## Blockers

**None.**

## THE FRONT — five live tracks, pick one

**All four live tracks were rewritten from measurement on 2026-09-07** (A, B, E replaced their
prompts; D is new). Every superseded prompt cited stale counts, orphaned commit SHAs, or work
another session had already finished — so read the prompt, never a remembered summary. The
recurring finding across all four: detectors and censuses flag correct framework usage, so a
headline count is an upper bound, not a workload. Track C is closed-out salvage.

### Track D — typography: surface-type taxonomy + helper extension (NEWEST, has a design gate)
**Read first (full, not skim):** `.claude/prompts/2026-09-07-typography-surface-taxonomy-next.md`.
Supersedes the deleted `2026-09-06-typography-task3-close-plus-converter-bug.md`.
**Ground truth established 2026-09-07 by running the commands:** `bf2c903ba` rebuilt the SHARED
`TypographyControls` component (+1033 lines) on WP core's real widgets — it is not two block
POCs. 39 blocks import it; only **6** still declare native `supports.typography`. Context-variance
already has a mechanism (15 opt-in `show*` props); `heading` and `text` differ by exactly two
(`showTextColumns`/`showTextIndent`).
**Bean-settled:** ONE helper with block/context variance, not multiple variant helpers.
**Task 1 is a DESIGN GATE (Rule 7)** — the surface-type → control-set taxonomy is Bean's call,
because 37 of the 39 adopters have never had their control set deliberately chosen, so inferring
it from current usage would launder an accident into a standard.
**Carried, still open:** PRs #40/#41 (23 blocks) have **never been deployed to the canary** —
D973's own next-session first item, never done.

### Track A — colour conformance, TEXT surface
**Read first (full, not skim):** `.claude/prompts/2026-09-07-colour-conformance-text-next.md`.
Supersedes the deleted `2026-09-06-colour-conformance-text-surface-next.md`.
**TEXT is 68 rows, but only 29 are real work** (measured 2026-09-07): 39 are already correctly
wired and flagged solely for a missing hover state.
**Bean-ruled 2026-09-07:** every text row gets a base + hover pair — the uniform contract, not
hover-restricted-to-interactive. 36 rows take the hover; 3 (`brand-strip.itemTextColourHover`,
`post-grid.textColourHover`, `quote.textColourHover`) are hover-only by design with no base
partner and need a `colourExemptions` entry, not a fix. Triage the 29 before migrating.
⚠ FILL is NOT fully closed — 15 rows remain, and the old prompt's closure figures don't
reconcile with commit `b30c6bfc4`'s own message.
⚠ `.claude/plans/phase-colour-conformance.md` is stale — it points at a prompt file that no
longer exists.

### Track B — tier-object migration, Phase 3 remainder
**Read first:** `.claude/prompts/2026-09-07-tier-object-phase-3-next.md` (full read).
Supersedes the deleted `2026-09-06-tier-object-phase-3-remaining-work.md`, which cited two
orphaned commit SHAs, a stale pytest baseline, and work another session had already started.
**Groups 0+1 done, merged, and now live-verified** — canary page 3355 proves a padding-only
container emits padding (the exact Group 0 bug shape). Remaining: finish Priority 1's other
3 checks (accordion + button three-tier, table-of-contents editor canvas), the mediaPadding
atom, one border-radius block (`whatsapp-cta`), and the media-atom pilot.
⚠ **Box-shape radius work is deliberately OUT** — another session owns those files and
committed `e76586a9e` to them 2026-09-07. Ask before scheduling.
⚠ `migrate-border-radius-render.py --survey` returns UNCLEAR for 46 of 51 blocks including
already-fixed ones — it does not discriminate. Read `block.json`, not the survey.
Independent of Tracks A/C/D.

### Track E — inspector gates, rule 41 grouping/order debt
**Read first:** `.claude/prompts/2026-09-07-inspector-gates-rule41-43-next.md` (full read).
Supersedes the deleted `2026-09-04-spec32-35-gates-next-session.md`. **This track had no LEDGER
entry until 2026-09-07** — that prompt file was the only record it existed.
Open: rule 41's 11 `co2-scattered-element` + 17 `dom-order-vs-declared-order`, and rule 43's 5
real `colour-only-state-indicator` findings.
**Closed 2026-09-07 (`eebb06187`):** rule 43's 8 `ambiguous-state-property` findings, all false
positives — the detector was flagging `SgsBorderControl`'s own sanctioned 2-state border colour
mechanism (base `border-left: 3px solid transparent` → coloured), plus `box-shadow:none`
suppression rules and `::backdrop`. Fixed with 4 fixtures that each fail without their branch.
⚠ The old prompt's "23 of 45 files / ~555 entries" baseline-debt figure does not reproduce under
any reading — dropped, not carried forward.

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
- **D-ceiling:** **D988** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npm run build` (sgs-blocks) — full gate chain including `hover-guard`,
  `check-dead-controls`, `check-hardcoded-render-defaults`, payload-verify (83/83) all pass.
  `npm run gate:full` (the exact pre-deploy pytest scope) — clean, 1055 passed / 0 failed.
- **Canary:** deployed + live-verified via Playwright this session (box-shape hover, both
  `sgs/media` and `sgs/hero`). Probe page (3350) created and deleted after verification —
  nothing left on the canary from this session. `push-theme-snapshot.py` status from
  2026-08-18 NOT re-checked.
- **Open PRs:** **NONE.** #53-#60 are all CLOSED, each with a per-PR reason naming the specific
  evidence that superseded it, and all 30 remote branches are DELETED (D983). `git branch -r` is
  `origin/main` only, plus whatever a live track has opened since. No new PRs will be opened —
  D983 bans them.
- **Uncommitted:** ⚠ the ~55-file border-radius codemod a previous LEDGER entry attributed to
  "another track" was in fact THIS track's, and it LANDED (`e002bd8b1`). This session's own doc
  work (`LEDGER.md`, `STOP-CATALOGUE.md`, `mistakes.md`, `memory/mistakes-archive.md`) commits
  with the handoff itself — if you are reading a dirty tree containing those four, that is this
  handoff mid-flight, not someone else's work. `decisions.md` is NOT among them: D983/D986/D987/
  D988 each landed inside their own code commit (`75dfd3058`, `1b1ad4712`, `559d05e16`,
  `a4e83e46c`), which is the intended shape — a decision ships with the change it describes. Genuinely NOT ours: a
  concurrent session's `linkColour` work across collapsible-text, heading, product-card, quote,
  testimonial, text and timeline + `.claude/handovers/
  2026-08-26-product-card-media-panel.md` (shown deleted) + root `CLAUDE.md`. Re-check
  `git status` yourself before assuming any of this is safe to touch.

## Pointers

| For | Read |
|---|---|
| **Colour conformance TEXT surface (Track A)** | `.claude/prompts/2026-09-06-colour-conformance-text-surface-next.md` |
| **Tier-object migration Phase 3 (Track B)** | `.claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md` |
| **Typography — surface taxonomy + helper extension (Track D)** | `.claude/prompts/2026-09-07-typography-surface-taxonomy-next.md` |
| **Stale doc, fix when Track D runs** | `plugins/sgs-blocks/CLAUDE.md:814` still mandates the hand-rolled controls `bf2c903ba` deleted; `decisions.md:435` is a dead link |
| **This session's box-shape hover work** | D985 in `decisions.md`; `reports/visual-diff/{media,hero}-2026-09-07.md` |
| **Known gap: media-atom `:hover` rules unguarded against touch-hover-stuck** | This file's "Open" section above; `scripts/hover-guard/check.js` (scope) |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Border controls standard (`SgsBorderControl`, colour helper registry) | `plugins/sgs-blocks/CLAUDE.md` "Border controls" + "Colour EMISSION helpers" |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
