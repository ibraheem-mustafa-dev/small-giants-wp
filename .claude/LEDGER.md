---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-06 (Spec 32/35 gates track closed; typography full-replacement track opened — D970/D971/D972)
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Multiple sessions share one `main`
concurrently, every session — treat this as the norm, not the exception (this session ran
alongside 150+ peer sessions on the same tree, coordinated via re-verification not trust).

**2026-09-06 (this session, `small-giants-wp-90` continuation) — closed the Spec 32/35 gates
track; caught + reverted a real shared-mechanism mistake same night; opened a new typography
full-replacement track with its foundation shipped.** Deployed + live-verified the 3 D812
control-shape fixes (hero/modal/trustpilot-reviews), unblocked by a genuine cross-session
database-write collision that 3 peer sessions helped diagnose live (no bypass needed in the
end — the actual owner landed their fix first). A mechanical rule-41 batch then built an
unauthorised colour-panel placement mechanism across 10 blocks, contradicting an architecture
rule already documented ~6 days earlier that nobody checked first — caught by a proactive audit,
reverted, and the detector itself taught the real rule instead (D970, [INCIDENT]). Rule 41:
45 -> 26 (10 real scattering left, 16 unrelated pre-existing `dom-order` debt). Rule 43: a real
accessibility bug found and fixed (table-of-contents' active-page underline was losing to a
generic site-wide hover animation on specificity), committed not yet deployed. **New track
opened at Bean's direction: fully replace native WordPress typography with the framework's
shared component everywhere** — a claimed blocker (CSS inheritance) was checked and disproven
(D971); a real 84-block census, a new detector (rule 45, 29 findings), and a backward-compatible
multi-target switcher component all shipped and verified same night (D972); a suspected helper
bug was investigated and DISPROVED rather than "fixed" (nothing was broken). Full orchestration
for what's left: TYPOGRAPHY FULL-REPLACEMENT TRACK below.

**Prior sessions, all historical and fully closed — narrative moved to their D-numbers, not
repeated here:** `is_responsive` tidy-up (D968, `148e83bfd`); colour-conformance "remaining 8
hard rows" + reseed-conflict fix (D964); a token-limit-truncated session's hand-wiring verified +
committed (D963); Spec 32/35 gates closure by the session this one continues, prior to tonight's
final closure above (superseded — see SPEC 32/35 GATES TRACK below); CHECK A editor-canvas
210->0 across 2 concurrent sessions (D965/D967); 4 dead-attribute bugs + nav-drawer variant fix
via a new composition-detection signal (D969, PR #38). Full per-session detail:
`memory/session-2026-09-04*.md`, `memory/session-2026-09-05*.md`.

**Canary:** sandybrown-nightingale-600381.hostingersite.com; no live client sites yet.

## State Snapshot

- **Prior sessions' commits (`main`), all closed, full detail in their D-numbers, recoverable via
  `git log`:** `148e83bfd` (is_responsive, D968); `daddbbb1b`/`bd4076235`/`358584e79`/`2fb58e412`
  + PR #38 (`9c40ab746`)/`85f6e313f` (CHECK A + nav-drawer variant fix, D965/D967/D969,
  task-ledger `.claude/memory/sdd-progress.md`); `ed9e9ccda`/`aa8e6f5c3`/`9e82fa272`/`533634eb6`
  (colour-conformance 7-row fix + reseed-survival, D964).
- **Branch:** `main`. This session ran alongside 150+ peer sessions (`ListAgents`) committing
  concurrently — path-scope every commit, re-check `git status`/branch immediately before each
  one. The shared `sgs-framework.db` is a live-write target too, not just the git tree — a
  concurrent session's own write can silently wipe a fresh insert with no error (D964). Re-verify
  DB row counts after any write, don't assume they hold.
- **Build:** green — `npm run gate:fast` passing on every commit this session (pre-existing,
  unrelated findings bypassed via `SGS_F5_SKIP`, D964).
- **Spec 32/35 gates track — CLOSED this session.** The 3 D812 control-shape fixes
  (`ba5dc407f`/`fee0631b8`/`c7f25aa75`) are now deployed + live-verified. Rule-41 colour-panel
  correction: `5f0c2e2d0` (revert), `c330f2a6b` (detector taught the real exemption),
  `ed41a61c9` (real independent bug, `responsive-logo` attrMap gap). Rule-43 accessibility fix
  (table-of-contents underline): `93dacf0d4`, committed not yet deployed. See D970 for the
  incident narrative.
- **Typography full-replacement track commits (this session):** `2750f1a1e` (detector rule 45),
  `2e61e9803` (switcher API on `TypographyControls.js`), `90b50989a` (switcher wired on
  `card-grid`). See TYPOGRAPHY FULL-REPLACEMENT TRACK below + D971/D972.
- **Live fronts:** `31-golden-colour-control` — down to the 8 rows named above (from 241 at
  session 8). `45-typography-full-replacement` — new, 29 findings (25 native + 4 partial
  adoption). Everything else in this track's original scope unchanged from session 10.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.
  Closed-track narrative lives in `memory/session-2026-09-04-tracks-history-sweep.md`, not here.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

The Spec 32/35 gates track is now FULLY CLOSED this session — see D970 + the section below. The
live open thread is the NEW typography full-replacement track (D971/D972): foundation (census,
detector, switcher component) is shipped and verified; the actual migration work is what's left.
Check `ListAgents` first, this tree runs many concurrent sessions — the shared DB and shared git
tree both got hit by cross-session collisions multiple times tonight, resolved by asking rather
than forcing through.

## Task 1 — Migrate the 19 native-only blocks to the shared typography component

**What:** for each of `accordion`, `breadcrumbs`, `business-info`, `container`,
`countdown-timer`, `cta-section`, `form`, `hero`, `info-box`, `notice-banner`, `post-grid`,
`pricing-table`, `process-steps`, `product-faq`, `social-icons`, `table-of-contents`,
`team-member`, `testimonial-slider`, `timeline` — remove `supports.typography` from
`block.json`, wire `TypographyControls` into `edit.js` at native's current selector (18 of 19
already resolved by rule 33's live output; only `form` needs a manual selector read), swap
`render.php`'s style-read for `sgs_typography_css_rule()`. Transform all three files atomically —
every one of these 19 sets `__experimentalSkipSerialization: true`, so a block.json-only edit
breaks rendering silently.
**Why:** the primary migration gap — zero work started on these 19.
**Estimated time:** ~10-15 min per block, mechanical once proven on one.

**Orchestration:**
- Execution: delegated parallel subagents per disjoint block, but do ONE solo first to prove the
  3-file transform pattern before fanning out
- Model: sonnet via `/delegate`
- Brief: rule 45's live output names the block; rule 33's live output (0 findings) names the
  selector/target for 18 of the 19
- Depends on: none — single-target blocks need zero switcher API changes
- Parallel with: Task 3 (disjoint files)
- /qc gate after: rule 45 count drops by exactly the blocks migrated + live render check per
  block at 3 breakpoints, before commit

**Acceptance:** rule 45's "native declaration" finding count drops from 25 to 6 (the double-writer
blocket in Task 3, handled separately) or 0 if Task 3 also completes; live-verified no rendering
regression on at least 3 sampled blocks across the 19.

## Task 2 — Tidy the 4 duplicate-logic blocks (button/heading/label/text)

**What:** these 4 already use `TypographyControls` correctly in `edit.js` but hand-roll their OWN
render-side logic instead of calling `sgs_typography_css_rule()` — a real architecture gap, NOT
a live bug (D972 disproved the suspected defect; verified live at 3 breakpoints). Behaviour-
preserving refactor only: swap each hand-rolled CSS emission for the shared helper call, same
selector.
**Why:** closes rule 45's remaining 4 findings; removes drift-prone duplicate logic.
**Estimated time:** ~15-20 min per block — verify render output is byte-identical, not "looks
the same".

**Orchestration:**
- Execution: delegated, parallel subagents (4 disjoint files)
- Model: sonnet via `/delegate`
- Brief: read each block's current hand-rolled logic first, confirm what CSS it currently
  emits, then swap to the shared helper call and confirm identical output — this is a
  behaviour-preserving refactor, treat any output diff as a bug to fix, not an acceptable change
- Depends on: none · Parallel with: Task 1, Task 3
- /qc gate after: live Playwright check confirming computed CSS is unchanged pre/post refactor
  on all 4 blocks at 3 breakpoints

**Acceptance:** rule 45 finding count for these 4 drops to 0; live-verified zero visual/CSS
change on all 4 blocks.

## Task 3 — Resolve the 4 real double-writer conflicts

**What:** `testimonial` (highest-risk — 3 elements, native and the shared component's
`quoteFontSize` target the SAME selector), `card-grid`+`icon-list` (one element clean, one
genuinely conflicting), `collapsible-text` (1 element, direct collision). Read `render.php` per
block to prove which mechanism currently wins before choosing — whichever renders today is what
live content depends on, not whichever is "correct" long-term. `testimonial`'s `quote`/`summary`
also need a flat-string → tiered-object attribute migration; use `card-grid`'s clean 2-target
wiring (`90b50989a`) as the reference shape.
**Why:** the only blocks where two mechanisms could silently disagree on what a client sees.
**Estimated time:** ~30-45 min per block, genuine investigation, not mechanical.

**Orchestration:**
- Execution: delegated, one subagent per block (NOT parallelised within `testimonial` — its 3
  elements share one file)
- Model: opus via `/delegate` (judgement-heavy, not mechanical)
- Brief: D972 has the exact collision per block (which selector, which attr); read
  `render.php`'s actual CSS-emission order to prove which mechanism currently wins before
  changing anything
- Depends on: none · Parallel with: Task 1, Task 2 (disjoint blocks — but do NOT run a
  Task-1-style parallel fan-out on `testimonial`/`card-grid`/`icon-list` since Tasks 1 and 3
  would otherwise both touch the same files if scoping drifts — confirm no overlap before
  dispatching)
- /qc gate after: live Playwright check per block confirming the RIGHT value (the one client
  content currently shows) survives the migration, not just "a value renders"

**Acceptance:** rule 45's "both mechanisms" finding count drops to 0 for these 4; live-verified
no visible change to existing client-facing typography.

## Task 4 — Live-verify the switcher on `card-grid`

**What:** the switcher is built and wired on `card-grid` (`90b50989a`) but live verification
never completed — blocked all night by another session's dirty files in the shared deploy
directory. Deploy (scoped `--payload` if not clean) and verify: renders, switching shows right
values, edit-then-switch-back preserves the value, modified-indicator appears only when
customised.
**Why:** every Task 3 block depends on this being proven correct first.
**Estimated time:** ~10 min once the tree allows a scoped deploy.

**Orchestration:**
- Execution: inline or delegated, single agent
- Model: sonnet via `/delegate`
- Brief: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only
  --payload <scoped-to-TypographyControls.js+card-grid>` if the tree isn't clean; never
  `--allow-dirty`, never stash another session's files
- Depends on: none · Parallel with: Tasks 1-3
- /qc gate after: this IS the qc gate for Task 3's dependents — do not consider the switcher
  production-ready until this passes

**Acceptance:** all 4 checks (render/switch/preserve/indicator) confirmed live on the canary,
not just in local source.

## Task 5 — Deploy + live-verify the rule-43 table-of-contents fix

**What:** `93dacf0d4` (the active-link underline fix) is committed, not deployed.
**Why:** small, low-risk, already isolated — no reason to leave it queued once the tree clears.
**Estimated time:** ~5 min.

**Orchestration:**
- Execution: inline, single agent · Model: sonnet · Depends on: none · Parallel with: anything

**Acceptance:** live-verified the active TOC link shows an underline, not just a colour change.

## Task 6 — Reconcile the 24h+ orphaned stash

**What:** `git stash@{0}` (26 files, base `7a2c68b05`) is still unresolved, now 3+ days old
(flagged at every SessionStart hook since). Contains real uncommitted work across ~18 blocks
(list in the `▶ ROAD-TO-UNIFORM RECONCILIATION` section below).
**Why:** it's dead weight nobody has claimed, and blocks a clean `git stash list`.
**Estimated time:** ~15-20 min (read + reconcile file-by-file, several blocks have moved on).

**Orchestration:**
- Execution: inline main thread (needs judgement per file, not mechanical)
- Model: opus (main agent)
- Brief: `git stash show -p stash@{0} > backup.patch` first, then apply file-by-file, checking
  each against what's since landed on `main`
- Depends on: none · Parallel with: Task 1

**Acceptance:** stash reconciled and dropped, or explicitly re-flagged with a reason it can't be
yet (never left silently unresolved another session).

## Dependency graph

```
Task 1 (parallel, 19 native-only blocks)   Task 2 (parallel, 4 tidy-ups)   Task 3 (opus, 4 conflicts)
  ↓ rule-45 count + live render check         ↓ CSS byte-identical check      ↓ live "right value" check
  commit per block                            commit per block                commit per block
        \_______________________________________|_______________________________/
                                    ↓
                    Task 4 (switcher live-verify — unblocks once tree clears)
                                    ↓
                          all feed rule 45 -> 0
Task 5 (deploy TOC fix) and Task 6 (stash reconciliation) — independent, no ordering requirement
with anything above.
```

## Methodology guardrails (do not skip)

- **An already-documented architecture rule still gets violated if nobody checks it** (NEW this
  session, D970/mistakes.md) — before building any GENERAL mechanism touching a shared
  component's placement/architecture (colour panel, typography panel, border control), read the
  relevant CLAUDE.md/spec section in full, don't rely on memory of it. A rule documented days
  ago is exactly as binding as one documented a year ago; the failure is never checking it.
- **Prove the cause before "fixing" a suspected bug** (this session, D972) — a suspected
  flat-vs-tiered attribute shape bug in the shared typography helper was investigated and
  DISPROVED by reading the actual code + live-verifying on the canary, not fixed on assumption.
  Committing an unneeded "fix" would have been a redundant second implementation of already-working
  logic. Always verify a bug is real (read the code, check live) before writing the fix.
- **A carried plan claim is a hypothesis, not ground truth** — re-verify against the live tree
  before building from ANY prompt doc or prior session's summary, including this one — a prior
  13-block typography census guessed wrong on every count this session (D972).
- **A live shared DB is also a write target, not just the git tree** — re-check row counts
  after any DB write; a concurrent session's own write can silently wipe a fresh insert with no
  error (D964). Fix the DETECTOR the write path trusts, never bolt a second write path on.
- **Deploy before measure** — any live-verified change needs a real deploy + cache purge first.
  Coordinate timing with whichever peer session is active (`ListAgents`) — a scoped `--payload`
  deploy is the sanctioned way through a dirty shared tree, never `--allow-dirty` or stashing
  another session's uncommitted files (this session hit this exact wall twice, refused both
  times, reported honestly rather than forcing through).
- **A gate's own scope is not the whole defect** — read the actual emitted output, not just
  whether a check passed.
- **A subagent's "verification only"/"no destructive commands" instruction is not enforcement**
  (recurred 4x this project, see `mistakes.md`) — give a scratch baseline instead of forbidding
  a tool, and independently re-verify shared-state safety after any agent reports done.
- Path-scoped commits only, re-check branch + `git status` immediately before every commit.
- `npm run gate:fast` after every change; read the full output. Use `SGS_F5_SKIP`/
  `SGS_F5_SKIP_REASON` (not `--no-verify`) when a gate finding is genuinely pre-existing and
  unrelated — logged to `reports/f5-manual-skips.log`.
- Never `phpcbf` — realign phpcs warnings by hand.

## ▶ ROAD-TO-UNIFORM RECONCILIATION — FULLY CLOSED, all 9 items, qc-council-audited.

All 9 items closed (2026-08-25). Full detail: `.claude/plans/archive/2026-08-25-road-to-uniform-then-spec-39.md`.
2 residual gaps NOT part of the 9, full detail `memory/session-2026-08-25*.md`: Spec 32 §5
CSS-injection sanitisation has no gate for `borderStyle`/`textTransform` free-text attrs (9
unaudited `render.php` files); `text/edit.js`'s "Font" reset is a no-op.

⚠ **`git stash@{0}` (26 files, base `7a2c68b05`) STILL UNRESOLVED**, 3+ days old — see Task 6
above. Files: `hero`/`button`/`before-after`/`brand-strip`/`buybox`/`cta-section`/`heading`/
`icon-list`/`icon`/`info-box`/`mega-panel`/`nav-drawer`/`quote`/`site-footer(-row)`/
`site-header(-row)`/`testimonial(-slider)`/`trust-bar`/`GradientCapableColourControl.js`/
generative-background shader files/`utils/index.js`/`parking.md`. Do NOT `git stash drop`/`clear`
until reconciled.

## ▶ UNIFORMITY SWEEP TRACK — CLOSED bar one detector. Detail: D918/D919/D922/D924/D930/D933.

`01-tab-group` and `21-render-without-control` both closed to zero. Nothing else open — see
COLOUR TRACK for `31-golden-colour-control`.

## ▶ SPEC 32/35 GATES TRACK — CLOSED 2026-09-06. Full history: `.claude/prompts/2026-09-04-spec32-35-gates-next-session.md` (consumed, historical). Detail: D970.

Opened 2026-09-04: Spec 32 §5 blob-sanitisation gate, rules 42/43/44, rule-41 61→42, 2 live
`sgs/post-grid` bugs fixed, 3 D812 control-shape findings root-caused. Closed 2026-09-06 (this
session): the 3 D812 fixes deployed + live-verified; rule 43's pending recheck found + fixed a
real bug (`93dacf0d4`, TOC underline losing to a hover-animation on specificity, not yet
deployed — Task 5); rule-41 batches (`3548f7c85`/`689c3f2b5`) built an unauthorised colour-panel
mechanism on 10 of 11 blocks, reverted + detector corrected (D970, `5f0c2e2d0`/`c330f2a6b`); one
independent bug fixed (`responsive-logo` attrMap gap, `ed41a61c9`). Residual: rule 41 at 26 (10
real scattering + 16 unrelated `dom-order` debt) — general framework debt, not re-opened here.

## ▶ TYPOGRAPHY FULL-REPLACEMENT TRACK — OPENED 2026-09-06. Detail: D970 (why)/D971 (architecture)/D972 (foundation shipped). Next-session orchestration: Tasks 1-4 above.

**Decision (D971):** fully replace native `supports.typography` with shared `TypographyControls`
everywhere, including root-inheritance cases — a claimed CSS-inheritance blocker was checked and
disproven; WP Global Styles per-block-type overrides confirmed unused by any `sgs/*` block, so
nothing lost.

**Foundation shipped (D972), all live-verified:** real 84-block census (14 done / 19 native-only,
18 machine-resolvable / 6 mixed, 4 real conflicts: `testimonial`+`card-grid`+`icon-list`+
`collapsible-text` / 44 neither, 18 textless + ~25 real gaps collapsing to a couple shared
fixes); new detector `45-typography-full-replacement.js` (advisory, 29 findings — caught + fixed
its own false-positive before shipping); switcher component on `TypographyControls.js`
(`targets=[]` prop, zero-diff for single-target blocks, wired on `card-grid`, live verification
blocked by a concurrent session's dirty tree — Task 4); a suspected helper bug was investigated
and DISPROVED, not fixed (already handles both attribute shapes correctly; the 4 "partial
adoption" blocks just hand-roll a duplicate, non-broken path).

**Still open — Tasks 1-4 above:** migrate 19 native-only blocks; tidy 4 duplicate-logic blocks;
resolve 4 double-writer conflicts; live-verify the switcher. No collision with the separate
tier-object migration (disjoint attribute namespaces, checked directly).

## ▶ CHECK A EDITOR-CANVAS TRACK — CLOSED. 210 -> 0. Detail: D965 (phase 1 + standards) + D967 (positive-control fix).

Phase 1 (35 findings, shared `svgBackgroundPreview()`) + phases 2-4 (remaining 128, a concurrent
session, `daddbbb1b`/`bd4076235`/`358584e79`/`2fb58e412`) closed 2026-09-05. Durable output: Spec
02 item 0 (a shared mechanism is mirrorable once only if it OWNS ITS SELECTOR); DONE-checklist
7b; `plugins/sgs-blocks/CLAUDE.md` "Editor-canvas mirrors" + four traps.

## ▶ COLOUR TRACK — the "remaining 8 hard rows" prompt CLOSED 2026-09-05 (D964). Detail: `.claude/plans/2026-09-03-golden-colour-staged-rollout.md` + D964.

**Live thread, owned by a different concurrent session, not this one:** building a UNIFIED
`survey.js` absorbing `fix.js`'s job (find + categorise + fix as one tool, shape-batched not
per-block). Full plan: `.claude/plans/2026-09-05-colour-conformance-shape-batch-triad.md`.
Sessions 7-11 + the 2026-09-05 close-out session closed the hover-guard, contrast guard, first
`--apply` run, and all 7 of the "remaining 8 hard rows" — full narrative D964/D963/D966/D969, not
duplicated here.

**Still open** (re-verified 2026-09-05): the old `quote.attributionColourHover` "needs a human
pick" note is RETIRED as stale — that attr never existed and `fix --check` is clean after a
peer's rule-41 restructure (`3548f7c85`). ⚠ NEW, unexamined: a `sgs/quote` row whose attr won't
resolve. `sgs_text_states_css()` (0 callers); the remaining genuinely-hard
custom-property-architecture rows this session's 7-row closure did NOT cover (`mega-panel`'s
OTHER rows besides `iconColour`, `social-icons`, `form.progressBarColour`, `product-card`'s 4
title/desc/price rows, `tabs`' OTHER 2 rows besides `tabTextColour`); `option-picker.pillBgColour`
/`.pillBgColourHover`'s OWN separately-deferred gradient note (block.json:107, 2026-09-03 —
distinct from `pillTextColour`, which this session closed; do not fold the two together without
asking Bean first); `cta-section.backgroundColour` (WP-native mechanism, not SGS helpers);
`post-grid`'s OTHER loop/dynamic-key rows (`.titleColour`/`.excerptColour`/`.metaColour`/
`.readMoreColour`).

## ▶ MOTION TRACK (A closed+live; B closed).

Two separate tracks, never re-merge. Full account: `memory/session-2026-09-04-tracks-history-sweep.md`.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (D725/D726, D731-D733)

One item survives, PARKED, owned by nobody: sticky sidebar + band-replacement model
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL) — RE-MEASURE first.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-09-02 (D904-D913, D915/D916, PR #36)

All 16 media atoms adopted by all six in-scope blocks. Narrative:
`memory/session-2026-09-02-client-controls-track.md`.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative: `memory/session-2026-08-22-editor-errors-track.md`. Nothing pending.

## ▶ IS_RESPONSIVE TIDY-UP — CLOSED 2026-09-06 (D968). Nothing pending.

3 deferred Minors from the original `is_responsive` fix (61f70ba08) closed with no behaviour
change — see Human Summary above + D968 for full detail. `.claude/prompts/2026-09-06-is-
responsive-closeout.md` consumed and deleted; do not re-dispatch from it.

## ▶ SPEC-35 CAPABILITY-ROUTING TRACK — CLOSED 2026-09-04 (prior session), all four items

Plan archived: `.claude/plans/archive/spec-35-capability-routing-doctrine.md`. All four items
closed, deployed, live-verified. Commits: `a314fdc47`/`335a0885a`/`ef051e39c`/`0fbfb51d2`/
`94485dad5`.
