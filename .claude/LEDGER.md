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

Two live prompt docs, pick either (independent, no ordering requirement between them):

- **Typography full-replacement** (D971/D972) — foundation shipped, migration work remains.
  Full plan: `.claude/prompts/2026-09-06-typography-full-replacement-next-session.md`.
- **Spec 32/35 residual debt** (D970) — the core track is closed; rule-41/43 framework debt it
  surfaced is not. Full plan: `.claude/prompts/2026-09-04-spec32-35-gates-next-session.md`
  (updated 2026-09-06, still live — despite the filename's date).

Read whichever you pick in full before starting; do not re-derive the plan from this file. Check
`ListAgents` first, this tree runs many concurrent sessions.

## ▶ ROAD-TO-UNIFORM RECONCILIATION — FULLY CLOSED, all 9 items, qc-council-audited.

All 9 items closed (2026-08-25). Full detail: `.claude/plans/archive/2026-08-25-road-to-uniform-then-spec-39.md`.
2 residual gaps NOT part of the 9, full detail `memory/session-2026-08-25*.md`: Spec 32 §5
CSS-injection sanitisation has no gate for `borderStyle`/`textTransform` free-text attrs (9
unaudited `render.php` files); `text/edit.js`'s "Font" reset is a no-op.

⚠ **`git stash@{0}` (26 files, base `7a2c68b05`) STILL UNRESOLVED**, 3+ days old — see Task 6 in
`.claude/prompts/2026-09-06-typography-full-replacement-next-session.md`. Files: `hero`/`button`/`before-after`/`brand-strip`/`buybox`/`cta-section`/`heading`/
`icon-list`/`icon`/`info-box`/`mega-panel`/`nav-drawer`/`quote`/`site-footer(-row)`/
`site-header(-row)`/`testimonial(-slider)`/`trust-bar`/`GradientCapableColourControl.js`/
generative-background shader files/`utils/index.js`/`parking.md`. Do NOT `git stash drop`/`clear`
until reconciled.

## ▶ UNIFORMITY SWEEP TRACK — CLOSED bar one detector. Detail: D918/D919/D922/D924/D930/D933.

`01-tab-group` and `21-render-without-control` both closed to zero. Nothing else open — see
COLOUR TRACK for `31-golden-colour-control`.

## ▶ SPEC 32/35 GATES TRACK — core track CLOSED 2026-09-06; residual rule-41/43 debt still open. Full task list: `.claude/prompts/2026-09-04-spec32-35-gates-next-session.md` (updated 2026-09-06, still live — do not treat as historical). Detail: D970.

Opened 2026-09-04: Spec 32 §5 blob-sanitisation gate, rules 42/43/44, rule-41 61→42, 2 live
`sgs/post-grid` bugs fixed, 3 D812 control-shape findings root-caused. Closed 2026-09-06 (this
session): the 3 D812 fixes deployed + live-verified; rule 43's pending recheck found + fixed a
real bug (`93dacf0d4`, TOC underline losing to a hover-animation on specificity, not yet
deployed); rule-41 batches (`3548f7c85`/`689c3f2b5`) built an unauthorised colour-panel
mechanism on 10 of 11 blocks, reverted + detector corrected (D970, `5f0c2e2d0`/`c330f2a6b`); one
independent bug fixed (`responsive-logo` attrMap gap, `ed41a61c9`). **Still open, full detail in
the prompt doc:** rule 41 at 26 (10 real scattering + 16 `dom-order` debt); rule 43 at 13 across
9 blocks, including 8 findings of a new, unexamined kind (`ambiguous-state-property`).

## ▶ TYPOGRAPHY FULL-REPLACEMENT TRACK — OPENED 2026-09-06. Detail: D970 (why)/D971 (architecture)/D972 (foundation shipped). Next-session orchestration: `.claude/prompts/2026-09-06-typography-full-replacement-next-session.md`.

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
blocked by a concurrent session's dirty tree — see the prompt doc); a suspected helper bug was investigated
and DISPROVED, not fixed (already handles both attribute shapes correctly; the 4 "partial
adoption" blocks just hand-roll a duplicate, non-broken path).

**Still open — full task list in the prompt doc:** migrate 19 native-only blocks; tidy 4 duplicate-logic blocks;
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
