---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-06 (nav-drawer discriminator actually closed + Check #12 fully cleared — D974)
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

**2026-09-06 (separate parallel session) — colour-conformance: `svg-paint-gradient` end-shape
CLOSED, `fill-custom-property-gradient` codemod hardened, a real `business-info` control bug
fixed by eye.** The session's opening prompt undercounted scope (named ~7 rows across 3 blocks);
re-running the real census (`classify-end-shape.js`) found 136 rows across 7 end-shapes. Closed
`svg-paint-gradient` in full (`before-after.handleIconColour`, converted to the shared icon
mechanism 11 other blocks already use) after discovering its apparent 2nd row was a
misclassification from a stale block.json manifest entry. Hardened the
`fill-custom-property-gradient` codemod (2 real detector bugs fixed as universal widenings, not
per-row patches) and ran it on 2 rows. Separately fixed a real `business-info` design flaw Bean
found by reading the controls (dead hover-colour pickers, pointless clickable toggles, a
silently-wrong dropdown) — never a codemod row. All merged to `main` via PR #43, live-verified.
Full detail: COLOUR TRACK below + `.claude/plans/2026-09-05-colour-conformance-shape-batch-triad.md`.

**2026-09-06 (`small-giants-wp-26` continuation) — nav-drawer's `two-column-editorial` variant
is genuinely detectable now (D969 alone hadn't closed it); Check #12 fully cleared, not
baselined; a real schema-drift gap caught unprompted and fixed.** D969's composition tiebreaker
(below) left this variant still returning `None` — its two candidate discriminators
(`itemFontSize` seeded flat against a tiered schema; `listColumns` with zero CSS routing) were
both unusable from a real clone. Fixed for real + confirmed live via `detect_variant()`
(`3e8006dea`, merged `68378ab86`). Separately closed all 15 baselined Check #12
(order-dependent role-resolution guard) findings — `db-consistency-baseline.json` back to `[]`
— via 9 direct declarations, a widened `canonical_slot_aliases` mechanism, and a new
container-marker resolver rule. Caught + fixed a `schema.sql` drift (2 tables from earlier
work, 2 new columns from this session, `81852feaa`) via `check_schema_drift.py`, run
unprompted. Full detail: D974.

**Prior sessions, all historical and fully closed — narrative moved to their D-numbers, not
repeated here:** `is_responsive` tidy-up (D968, `148e83bfd`); colour-conformance "remaining 8
hard rows" + reseed-conflict fix (D964); a token-limit-truncated session's hand-wiring verified +
committed (D963); Spec 32/35 gates closure by the session this one continues, prior to tonight's
final closure above (superseded — see SPEC 32/35 GATES TRACK below); CHECK A editor-canvas
210->0 across 2 concurrent sessions (D965/D967); 4 dead-attribute bugs + a composition-detection
signal that turned out only PARTIALLY to fix nav-drawer's variant detection (D969, PR #38 —
actually closed by D974 above, correcting this line). Full per-session detail:
`memory/session-2026-09-04*.md`, `memory/session-2026-09-05*.md`.

**Canary:** sandybrown-nightingale-600381.hostingersite.com; no live client sites yet.

## State Snapshot

- **Prior sessions' commits (`main`), all closed, full detail in their D-numbers, recoverable via
  `git log`:** `148e83bfd` (is_responsive, D968); `daddbbb1b`/`bd4076235`/`358584e79`/`2fb58e412`
  + PR #38 (`9c40ab746`)/`85f6e313f` (CHECK A + nav-drawer composition-tiebreaker, D965/D967/D969,
  task-ledger `.claude/memory/sdd-progress.md`); `ed9e9ccda`/`aa8e6f5c3`/`9e82fa272`/`533634eb6`
  (colour-conformance 7-row fix + reseed-survival, D964); `f351464db`/`3e8006dea` merged
  `68378ab86` (nav-drawer discriminator actually closed + Check #12, D974) + `81852feaa`
  (schema.sql drift fix, D974).
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

## ▶ TIER-OBJECT PHASE 3 (padding/margin/borderRadius) — Groups 0-1 CLOSED + build-verified 2026-09-06. Full detail: `.claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md`.

Groups 0-1 migrated + verified via a full `npm run build` (node_modules had been broken; fixed
this session via `npm install` + `composer install`). **Lesson: a schema-fold codemod's own
`--check` passing is NOT the definition of done** — only the real build/gate chain caught what it
missed: ~150 dead-destructure findings (`check-undeclared-attrs.py`), a duplicate-shaped control
the exact-shape matcher didn't recognise (`check-undefined-refs.js`), a var-used-before-assignment
in 4 `render.php` files (PHPStan via `check-render-undefined-vars.py`), and a hand-reformat pass
that briefly corrupted 2 files (caught by reading the diff, not the tool's own success report). All
fixed live this session; gate chain now clean for the padding/margin/borderRadius work touched.
**Still open:** `check-undeclared-attrs.py` still flags a dead `style` destructure across ~22
blocks — traced to a DIFFERENT, concurrent migration (native `supports.color`/`supports.typography`
removal), deliberately left for that migration's owner rather than guessed at.

## ▶ CHECK A EDITOR-CANVAS TRACK — CLOSED. 210 -> 0. Detail: D965 (phase 1 + standards) + D967 (positive-control fix).

Phase 1 (35 findings, shared `svgBackgroundPreview()`) + phases 2-4 (remaining 128, a concurrent
session, `daddbbb1b`/`bd4076235`/`358584e79`/`2fb58e412`) closed 2026-09-05. Durable output: Spec
02 item 0 (a shared mechanism is mirrorable once only if it OWNS ITS SELECTOR); DONE-checklist
7b; `plugins/sgs-blocks/CLAUDE.md` "Editor-canvas mirrors" + four traps.

## ▶ COLOUR TRACK — end-shape census now the live front; svg-paint-gradient CLOSED 2026-09-06. Full plan + method learnings: `.claude/plans/2026-09-05-colour-conformance-shape-batch-triad.md`.

**The `survey.js`/`fix.js` unification this doc previously pointed at was superseded, not
finished as originally scoped** — a concurrent session between 2026-09-05 and 2026-09-06 replaced
that approach with `classify-end-shape.js`, a DB-driven classifier (reads real
`block_attributes.css_property`, not a hand-maintained bucket list) against 12 named end-shapes
(canonical definitions: `plugins/sgs-blocks/CLAUDE.md` "Colour EMISSION helpers"/"Known
precedent-function registry"). **Full current census: 136 rows across 7 populated end-shapes** —
`text-gradient` 38, `fill-custom-property-gradient` 35 open (2 fixed), `text-gradient-needs-bg-
layer` 25, `fill-base-hover-flat` 17, `border-base-hover` 15, `per-item-loop` 2,
`svg-paint-gradient` **0 open (CLOSED)**.

**2026-09-06 — `svg-paint-gradient` closed in full + `fill-custom-property-gradient` codemod
hardened:** `before-after.handleIconColour` converted to the shared IconPicker/Lucide +
`sgs_svg_stroke_gradient()` mechanism (commit `e8d296bf9`) — the category's only real row once a
stale `timeline/block.json` manifest entry (wrongly claimed `css:stroke`, zero real stroke
consumers) was fixed and the row correctly reclassified into `fill-custom-property-gradient`.
`migrate-fill-custom-property-gradient.js` widened (missing-fallback-default CSS regex + a new
`DesignTokenPicker` row-detection path, plus a pre-existing bug fixed in the already-working
detection path) and run for real on `before-after.dividerColour` + `timeline.connectorFillColour`
(commit `0fd0f8f66`) — deliberately not the other 35 `fill-custom-property-gradient` rows, per
Bean's one-category-per-session direction. Separately, `business-info`'s link/hover/attribution
controls had a real design flaw (Bean caught it by reading the actual controls, not from the
census) — `linkHoverBackgroundImage`/`linkHoverTextColour` painted nothing for the phone/email
links they appeared under, `linkPhone`/`linkEmail` had no real use case, and the "What to
display" dropdown silently misreported "Phone Number" for attribution instances — all fixed by
hand (commit `15237d85a`), never a codemod row. All 4 commits (+ DB reseed, `0e511be6d`) merged
`main` via PR #43 (`1eb344ad0`), live-verified on sandybrown.

**Next (Bean's directed cadence: one category per session):** `text-gradient` (38 rows) is next,
no fixed order beyond that.

**Still open, historical rows not yet re-verified against the new census** (carried forward,
unconfirmed current status): `mega-panel`'s slug-derivation-shape rows,
`social-icons`/`form.progressBarColour`/`product-card`'s title/desc/price rows/`tabs`' other rows
— likely now inside `text-gradient`/`fill-base-hover-flat`, re-classify rather than assuming;
`cta-section.backgroundColour` (WP-native mechanism, not SGS helpers, out of scope by design).

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
