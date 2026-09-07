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

**Update, later the same day:** the whole typography track is now deployed to the sandybrown
canary and live-verified (font-size, decoration, transform, letter-spacing, and the two-state
link colour all confirmed working on the real rendered page, not just the editor). One real
mishap along the way: the deploy script's `--dry-run` flag isn't actually dry — it still ships
for real, it just skips the safety checks — so it deployed another session's unrelated
in-progress work bundled in with mine, without going through the gate that would normally have
caught that. Told you immediately; the other session had already finished and redeployed
cleanly by the time we talked, so nothing needed rolling back. Full detail: D991 in
`decisions.md`.

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
| **Typography track deployed to canary + live-verified** (Tasks 6-7 close the track); `build-deploy.py --dry-run` incident found + disclosed (not a dry run — ships for real, skips gates only) | D991 · `780be1a91`/`2568ce0f1` (doc fixes; the deploy itself is not a git commit) |
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

**Three live tracks remain (A, B, E) — Track D is CLOSED, Track C is closed-out salvage.**
A, B, E were rewritten from measurement on 2026-09-07. Every superseded prompt cited stale
counts, orphaned commit SHAs, or work another session had already finished — so read the
prompt, never a remembered summary. The recurring finding across all of them: detectors and
censuses flag correct framework usage, so a headline count is an upper bound, not a workload.

### Track D — typography surface-taxonomy — CLOSED 2026-09-07, all 7 tasks done
**No open work. No prompt file — it was deleted once consumed; do not resurrect it from git
history looking for open items.** Full record: D990 (design + build, Tasks 1-5) and D991
(deploy + live-verify + doc fixes, Tasks 6-7) in `decisions.md`.
Settled architecture: every text surface gets the FULL `TypographyControls` set by default, no
per-element curation. Two-state link colour shipped on 7 blocks. A 513-attribute
undeclared-in-block.json regression this rollout exposed was found and fixed with a new
detector (`audit-typography-attr-declarations.js`). Deployed to the sandybrown canary and
live-verified (font-size/decoration/transform/letter-spacing/link-colour all confirmed on the
real rendered page). One incident along the way: `build-deploy.py --dry-run` is not actually
dry — it ships for real, only skipping the safety gates — and shipped a peer session's
unrelated in-progress work bundled in; disclosed immediately, no rollback needed since that
session had already finished and redeployed cleanly. **Not fixed, flagged for whoever next
touches `build-deploy.py`:** the `--dry-run` flag's name doesn't match its behaviour.
`counter`/`quote` remain native-typography holdouts by design (D972 ruled them false alarms —
each governs a genuinely different element than the shared component would).

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
- **NEW (2026-09-07, D991): `build-deploy.py --dry-run` is NOT a safe preview** — it still
  builds, packages, SCPs and installs for real; it only skips the pre-deploy gate, ownership
  marker, cache purge and final verify. On a shared tree, that means it can ship another
  session's uncommitted dirty files with no `--payload` declared and no gate to catch it. Never
  reach for `--dry-run` expecting a no-op; if genuinely just previewing, read the script's plan
  output style instead of running it.
- **NEW (2026-09-07, D991): a Playwright MCP browser profile is SHARED across concurrent
  sessions** — a dispatched verification agent can find it locked (`Browser is already in use`)
  with no clean way to force it without risking another session's in-progress work. Correct
  response is to report COULDN'T-TEST and retry later, or use a distinct browser tool
  (`chrome-devtools-mcp`) that holds its own profile — never kill the lock-holding process.

## State Snapshot

- **Branch:** `main`. `origin/main` at `32815ab12` (confirmed pushed, this session). Re-check
  `git status`/`git log` yourself before trusting this — 150+ concurrent sessions share this
  tree and it moves fast.
- **D-ceiling:** **D991** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npm run build` (sgs-blocks) — full 93-gate chain passes clean as of this session's
  last commit (`f7cb3ba36`), including the two new detectors this session added
  (`migrate-typography-full-controls.js --check`, `audit-typography-attr-declarations.js
  --check`).
- **Canary:** ✅ **Typography track deployed and live-verified 2026-09-07** (D991). The
  pre-commit visual-diff gate's earlier disclosed-bypasses (`reports/visual-diff/manual-skips.log`)
  are now closed out by this live check.
- **Open PRs:** **NONE** (D983 bans them; unchanged from earlier today).
- **This session's doc work (Track D close-out) is committed and pushed:** `decisions.md` (D991
  added), `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Part I typography row updated), and this
  file. Commits `780be1a91`/`2568ce0f1`, `origin/main` confirmed up to date at push time — check
  `git status`/`git log` fresh regardless, this tree moves fast.

## Pointers

| For | Read |
|---|---|
| **Colour conformance TEXT surface (Track A)** | `.claude/prompts/2026-09-07-colour-conformance-text-next.md` |
| **Tier-object migration Phase 3 (Track B)** | `.claude/prompts/2026-09-07-tier-object-phase-3-next.md` |
| **Inspector gates, rule 41/43 (Track E)** | `.claude/prompts/2026-09-07-inspector-gates-rule41-43-next.md` |
| **Typography track (Track D) — CLOSED, all 7 tasks done** | D990 + D991 in `decisions.md`; commits `0e2f58cc2`/`8b67f5651`/`96bc9e734`/`f7cb3ba36` (build), `780be1a91`/`2568ce0f1` (doc close-out). No prompt file — deleted once consumed. |
| **Earlier session's box-shape hover work** | D985 in `decisions.md`; `reports/visual-diff/{media,hero}-2026-09-07.md` |
| **Known gap: media-atom `:hover` rules unguarded against touch-hover-stuck** | This file's "Open" section above; `scripts/hover-guard/check.js` (scope) |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Border controls standard (`SgsBorderControl`, colour helper registry) | `plugins/sgs-blocks/CLAUDE.md` "Border controls" + "Colour EMISSION helpers" |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
