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

**2026-09-06 (same-day continuation, `small-giants-wp-30`) — Tasks 1+2 of the typography track
shipped, 23 blocks, 2 merged PRs; a codemod was ruled out by evidence; the shared helper gained a
real capability.** Resolved the 3+ day orphaned stash (checked every file against `main`, all 26
superseded — dropped). Migrated all 19 native-only blocks + tidied all 4 duplicate-logic blocks
onto the shared `TypographyControls`/`sgs_typography_css_rule()` mechanism — PR #40 (`0e3a1447f`)
+ PR #41 (`ddf04a5ea`), both merged. Bean asked mid-session whether a `--fix` codemod could
replace the per-block agent dispatch; investigation found the "one shape" premise false (prefix
varies by target element, detected only by reading each block's own `selectors.typography`) —
proven concretely when 3 of 19 candidates (`heading`/`label`/`text`) independently stopped on the
same real gap a codemod would have silently mismigrated. That gap (a theme font-size PRESET slug
inside a tiered object — live-reachable, not theoretical) was root-caused and fixed in the shared
helper itself via its pre-existing `transform` extension point, verified by 11 EXECUTED
assertions against the real helper, not just read-through (D973). rule 45 findings: 29 → 6 (the
remainder is Task 3's genuine conflicts + 2 known false alarms). **Deploy still pending** — full
detail + next steps: TYPOGRAPHY FULL-REPLACEMENT TRACK below + D973.

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
- **Typography full-replacement track commits:** `2750f1a1e` (detector rule 45), `2e61e9803`
  (switcher API on `TypographyControls.js`), `90b50989a` (switcher wired on `card-grid`) — all
  foundation, D972. Migration: PR #40 `0e3a1447f` (19 blocks + button), PR #41 `ddf04a5ea` (shared
  helper widened + heading/label/text) — D973. See TYPOGRAPHY FULL-REPLACEMENT TRACK below.
- **Live fronts:** `31-golden-colour-control` — down to the 8 rows named above (from 241 at
  session 8). `45-typography-full-replacement` — 6 findings (down from 29; the remainder is
  Task 3's 4 genuine conflicts + 2 known false alarms). Everything else in this track's original
  scope unchanged from session 10.
- **Orphaned stash — RESOLVED 2026-09-06.** `stash@{0}` (26 files, base `7a2c68b05`) checked
  file-by-file against `main`: every change was superseded (hover-safety codemod shipped
  separately, WCAG contrast rollout resolved+archived, a dedup landed, the webgl file moved on via
  its own commits). Dropped. Not open work any more — do not re-flag it.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.
  Closed-track narrative lives in `memory/session-2026-09-04-tracks-history-sweep.md`, not here.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

Two live prompt docs, pick either (independent, no ordering requirement between them):

- **Typography full-replacement** (D971/D972/D973) — Tasks 1+2 shipped + merged, deploy +
  Tasks 3/4/5 remain. Full plan: `.claude/prompts/2026-09-06-typography-full-replacement-next-session.md`.
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

✅ **`git stash@{0}` (26 files, base `7a2c68b05`) RESOLVED 2026-09-06** — checked file-by-file
against `main`, every change was superseded elsewhere, dropped. Detail: LEDGER State Snapshot
above.

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

## ▶ TYPOGRAPHY FULL-REPLACEMENT TRACK — OPENED 2026-09-06, Tasks 1+2 CLOSED same day. Detail: D970 (why)/D971 (architecture)/D972 (foundation)/D973 (Tasks 1+2). Next-session orchestration: `.claude/prompts/2026-09-06-typography-full-replacement-next-session.md`.

**Decision (D971):** fully replace native `supports.typography` with shared `TypographyControls`
everywhere, including root-inheritance cases — a claimed CSS-inheritance blocker was checked and
disproven; WP Global Styles per-block-type overrides confirmed unused by any `sgs/*` block, so
nothing lost.

**Foundation (D972):** real 84-block census; detector `45-typography-full-replacement.js`;
switcher component on `TypographyControls.js` (`targets=[]` prop, wired on `card-grid`); a
suspected helper bug investigated and DISPROVED (nothing was broken).

**Tasks 1+2 CLOSED (D973), merged to `main`:** all 19 native-only blocks migrated (PR #40,
`0e3a1447f`) + all 4 duplicate-logic blocks tidied (PR #41, `ddf04a5ea`, which also widened the
shared helper — a real preset-slug font-size gap, found independently by 3 blocks that correctly
refused a lossy swap, fixed at the mechanism level via the helper's own `transform` extension
point, not worked around per-block). rule 45: 29 → 6. A mid-session codemod question was answered
by evidence (the per-block prefix/gap variance is real, not uniform — see D973) rather than
assumption.

**Still open — full task list in the prompt doc:** deploy + live spot-check both merged PRs
(nothing has reached the canary yet); Task 3 (resolve 4 genuine double-writer conflicts —
judgement-heavy); Task 4 (live-verify the card-grid switcher); Task 5 (deploy the already-committed
TOC underline fix, `93dacf0d4`). No collision with the separate tier-object migration (disjoint
attribute namespaces, checked directly). Task 6 (orphaned stash) is CLOSED — see State Snapshot.

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
