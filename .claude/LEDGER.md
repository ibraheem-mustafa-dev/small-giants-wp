---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-07
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Typography controls (fonts, spacing, alignment) now work fully on every text element in the
framework — and a serious silent bug in that rollout was caught and fixed the same session,
before it ever reached a client.**

You settled the big design question yourself, live: instead of me curating which font controls
each type of text gets (a title gets these five, a price gets those three, etc.), you pushed
back that most of those exclusions did not hold up — so now every text element on every block
just gets the full set. Simpler for you, and less work for me to maintain.

While rolling that out, I found that turning those controls on had exposed a real problem:
WordPress only remembers a setting if it is on an approved list, and 513 of the new settings
across 84 blocks were missing from that list — so a client could type into a control and have
it silently do nothing. I built a checker, found every instance, and fixed all of them, along
with two smaller knock-on issues it surfaced. Separately, fixed a genuine bug on the card-grid
block where the built-in WordPress font control was silently overriding your own custom one.

One thing to flag: a task I dispatched to a helper committed a change directly to the shared
codebase without being told to. The change itself was fine, but it should not have done that
on its own — noted for how I brief that kind of task going forward.

**What's left:** none of today's typography work has been deployed to the test site yet, so
none of it has been checked live in a real browser — that is the very next thing. Full detail:
`.claude/prompts/2026-09-07-typography-deploy-and-doc-fixes-next.md`.

**Earlier the same day (separate session, unrelated track):** media/hero border hover, a
cheat-gate false alarm cleared, the pre-merge gate fixed after it had been failing on every
commit for months, and all 8 draft PRs + 30 stale branches closed out (verified superseded,
zero salvage). Full detail in "Shipped today" below and D983/D985-D988.

## Shipped today (2026-09-07)

| What | Detail lives at |
|---|---|
| **Typography: two-state link colour on 7 blocks** (base + hover, gated on a RichText field permitting `core/link`) | D990 · `0e2f58cc2` |
| **Typography: full control set turned on across 29 blocks** (mechanical codemod, new detector `migrate-typography-full-controls.js`) | D990 · `8b67f5651` |
| **Typography: 8 harder blocks** — target-switcher conversions, 2 render-side rewiring bugs fixed (`media`/`before-after` had a dead editor control), new-coverage extension | D990 · `96bc9e734` |
| **Critical fix: 513 missing attribute declarations** across 84 blocks, found + fixed with a new detector (`audit-typography-attr-declarations.js`); plus card-grid/collapsible-text/icon-list native-typography holdouts closed | D990 · `f7cb3ba36` |
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
prompts earlier the same day; D's Tasks 1-5 closed and its prompt was rewritten a second time,
this session, to cover only what's left). Every superseded prompt cited stale counts, orphaned
commit SHAs, or work another session had already finished — so read the prompt, never a
remembered summary. The recurring finding across all four: detectors and censuses flag correct
framework usage, so a headline count is an upper bound, not a workload. Track C is closed-out
salvage.

### Track D — typography: deploy + verify, then one doc fix (Tasks 1-5 CLOSED this session)
**Read first (full, not skim):** `.claude/prompts/2026-09-07-typography-deploy-and-doc-fixes-next.md`.
Supersedes the deleted `2026-09-07-typography-surface-taxonomy-next.md` — Tasks 1-5 are done
(D990, commits `0e2f58cc2`/`8b67f5651`/`96bc9e734`/`f7cb3ba36`), not open for re-litigation.
**Settled, not designed:** Task 1's curated 6-way taxonomy was rejected live — every text
surface gets the full `TypographyControls` set by default, no curation. Link colour shipped on
7 blocks. Full control set is live on all in-scope adopters. 3 more native-typography holdouts
closed (`card-grid` real bug, `collapsible-text`/`icon-list` policy cleanup) — `counter`/`quote`
remain, D972 already ruled them false alarms.
**The one thing that mattered most:** turning the controls on exposed 513 undeclared attributes
across 84 blocks (client sets a value, WordPress silently discards it) — found and fixed with a
new detector, `scripts/audit-typography-attr-declarations.js`.
**Open:** the WHOLE track has never been deployed to the canary or checked live in a browser —
Task 6, first item in the new prompt. Task 7 is now just one dead-link fix in `decisions.md`.

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

- **Branch:** `main`. `origin/main` at `32815ab12` (confirmed pushed, this session). Re-check
  `git status`/`git log` yourself before trusting this — 150+ concurrent sessions share this
  tree and it moves fast.
- **D-ceiling:** **D990** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npm run build` (sgs-blocks) — full 93-gate chain passes clean as of this session's
  last commit (`f7cb3ba36`), including the two new detectors this session added
  (`migrate-typography-full-controls.js --check`, `audit-typography-attr-declarations.js
  --check`).
- **Canary:** ⚠ **NOT deployed this session.** Every typography commit above shipped with the
  pre-commit visual-diff gate disclosed-bypassed (`reports/visual-diff/manual-skips.log`) — no
  live WP environment was attached to this session. Task 6 of the new Track D prompt is
  entirely this: deploy + live-verify. Do not assume any of today's typography work is live on
  sandybrown until that runs.
- **Open PRs:** **NONE** (D983 bans them; unchanged from earlier today).
- **Uncommitted (this session's own doc work):** `LEDGER.md` (this file), `decisions.md` (D990
  added), the new prompt `2026-09-07-typography-deploy-and-doc-fixes-next.md`, and the deleted
  `2026-09-07-typography-surface-taxonomy-next.md` — all part of this same handoff, commit
  together. Genuinely not this session's: check `git status` fresh, this tree changes fast.

## Pointers

| For | Read |
|---|---|
| **Colour conformance TEXT surface (Track A)** | `.claude/prompts/2026-09-07-colour-conformance-text-next.md` |
| **Tier-object migration Phase 3 (Track B)** | `.claude/prompts/2026-09-07-tier-object-phase-3-next.md` |
| **Inspector gates, rule 41/43 (Track E)** | `.claude/prompts/2026-09-07-inspector-gates-rule41-43-next.md` |
| **Typography — deploy + verify, one doc fix (Track D)** | `.claude/prompts/2026-09-07-typography-deploy-and-doc-fixes-next.md` |
| **Remaining doc fix (Track D Task 7)** | `decisions.md`'s existing pointer to the deleted `2026-09-06-typography-full-replacement-next-session.md` needs redirecting — `plugins/sgs-blocks/CLAUDE.md:814` was checked and found NOT stale, do not touch it |
| **This session's typography work** | D990 in `decisions.md`; commits `0e2f58cc2`/`8b67f5651`/`96bc9e734`/`f7cb3ba36` |
| **Earlier session's box-shape hover work** | D985 in `decisions.md`; `reports/visual-diff/{media,hero}-2026-09-07.md` |
| **Known gap: media-atom `:hover` rules unguarded against touch-hover-stuck** | This file's "Open" section above; `scripts/hover-guard/check.js` (scope) |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Border controls standard (`SgsBorderControl`, colour helper registry) | `plugins/sgs-blocks/CLAUDE.md` "Border controls" + "Colour EMISSION helpers" |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
