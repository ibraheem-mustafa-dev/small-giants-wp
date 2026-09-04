---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-04 (session 7)
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Multiple sessions have shared one `main`
concurrently, repeatedly — treat this as the norm, not the exception, every session.

Right now: the cloning pipeline and the motion system are both stable. Client controls closed out
2026-09-02. The uniformity sweep closed two of three detectors to zero in session 4; only
`31-golden-colour-control` (253 open) remains, untouched since. **Session 7 (2026-09-04) closed
both fronts session 6 left open**: the hover-guard's 24 confirmed findings are ALL fixed (0
remaining, 11 unrelated pre-existing unresolved cases tracked separately), and the WCAG contrast
guard was built from scratch and wired into all 7 determinable text-colour callers, WARN-only per
Bean's ruling. Along the way, a dispatched subagent's unscoped `git stash` wiped 16 files' worth
of already-done work on this shared tree — caught and fully recovered, not silently lost (D948).
Canary: sandybrown-nightingale-600381.hostingersite.com; no live client sites yet, so breakage
there costs time, not money. **Nothing this session was deployed or live-verified** — build/lint
verified only.

## State Snapshot

- **Branch:** `main`. Concurrent occupancy is the norm on this project — a second session (the
  generative-background/WebGL motion track) was active throughout this session too, landing
  D946/D947. Commit with explicit paths (a hook enforces it), re-verify ownership before each
  commit, never `git stash` / `git checkout --` a shared file — see D948 for why that's not
  theoretical.
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
  **Not deployed this session** — hover-guard/contrast-guard changes are build-verified
  (`npx webpack`, `php -l`) but not exercised live.
- **Verification:** `scripts/qa/assert-css-effect.js` runs a block's real render.php standalone and
  asserts the CSS it emits — no deploy, seconds to run. `scripts/toolindex/query.py "<what you
  need>"` finds a script by description when you do not know its filename.
- **Build:** green on `main`, NOT deployed this session. `node scripts/hover-guard/check.js` now
  reports **0 confirmed findings** (was 24) — 11 pre-existing UNRESOLVED cross-file cases remain,
  ADVISORY in `postbuild` (search "D943"/"D948") until each is read by hand.
- **Live fronts:** hover-guard's 11 UNRESOLVED cross-file cases (never part of the confirmed 24,
  optional). `31-golden-colour-control` (253 open) untouched since session 4 — its own plan
  (`.claude/plans/2026-09-03-golden-colour-staged-rollout.md`) was corrected this session (its
  "no contrast guard" gap note was stale; Phase 1's touch-hover-guard shipped D943). Client
  controls, cloning, consolidation closed; motion stable (own section).
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

Both fronts session 6 opened (contrast guard, hover-guard's 24 findings) are CLOSED this session
— there is no dedicated next-session prompt file; read the COLOUR TRACK section below for what's
genuinely still open (11 unresolved hover cases; `SgsBorderControl`'s 44-caller wiring, explicitly
NOT parked, Bean's call to close it here). If picking up general framework work, start with
`31-golden-colour-control` (253 open, its own ~5.4h build task, D754's plan) — the largest
untouched backlog on the project — or deploy + live-verify this session's hover-guard/contrast-
guard changes, which were never exercised against the real canary.

⚠ **Concurrent occupancy on `main` is the norm on this project, not the exception** — path-scope
every commit and re-check the decisions.md D-ceiling immediately before writing a new entry.

## ▶ UNIFORMITY SWEEP TRACK — `01-tab-group` + `21-render-without-control` BOTH CLOSED 2026-09-03 (session 4, D933)

⭐ **Read `.claude/reports/2026-09-02-findings-INDEX.md` for the still-open `31` detector.** The
`01`/`21` reports it indexed are now historical — both rules are at 0, re-verify via
`node scripts/inspector-scan/run.js --json` before trusting this line in a future session.

**Session 4 closed both remaining detectors in this track to zero, via `/dispatching-parallel-agents`
in several waves, each verified live after landing — full account: D933.**

- `01-tab-group` 32 → 0, `21-render-without-control` 54 → 0 — full recipe in `decisions.md` D933.
  Both rules are candidates for advisory → gate promotion now their backlog is genuinely zero —
  flagged, not promoted, a deliberate call for a future session.
- Two investigation-phase claims were checked and found WRONG before any fix was dispatched — see
  `feedback_map_to_shared_mechanism_before_building_controls.md`.

**Gap-candidates retirement is DONE** — merged via PR #37 (`61c2e813b`), confirmed in `git log
--all`.

**What's left in this track:** `31-golden-colour-control` (253 open, its own dedicated
~5.4h build task — D754's plan, corrected this session per the COLOUR TRACK note above). Nothing
else open here.

⛔ **Working shape carried forward, still true: dispatch each fix the MOMENT Bean decides it,
keep discussing while agents work.** Verify every agent's result yourself — `git diff --stat`,
re-run the detector, spot-check the diff. Session 4's dispatched agents used `git stash` on the
shared tree mid-task (self-correcting each time); session 7's contrast-guard agent did the same
and did NOT self-correct for a sibling's files — see D948. Several session-4 agents also
misattributed sibling agents' own uncommitted work as an unrelated "concurrent session" — see
`feedback_sibling_parallel_agents_misattribute_each_others_work.md`.

**Earlier history (D918/D919/D922/D924/D930/D933).** Full accounts in `decisions.md`, not
duplicated here.

## ▶ COLOUR TRACK — 2026-09-04 (session 7): hover-guard's 24 findings CLOSED (0 remaining); WCAG contrast guard BUILT + wired. Detail: D948 (session 7); D936-D945 (session 6, historical).

⭐ **Both fronts session 6 left open are closed.** What's left: hover-guard's 11 pre-existing
UNRESOLVED cross-file cases (optional, never part of the confirmed 24), and `SgsBorderControl`'s
44-caller contrast wiring — explicitly NOT pursued or parked this session (Bean's call).

**Shipped this session (D948 carries the full account):**
- **Hover-guard: 24 → 0 confirmed findings.** Tiered pass (motion → cross-file silent-bypass →
  shadow-only → colour-only), each tier verified via `node scripts/hover-guard/check.js` before
  the next. All raw `:hover` selectors now route through `sgs_hover_state_rules()` /
  `sgs_hover_guarded_rule()` / the split guarded-hover-plus-unguarded-focus pattern. 11
  pre-existing UNRESOLVED cross-file cases remain (brand-strip, button, filter-search,
  option-picker×2, social-icons, tabs×3, plus 2 in `helpers-tokens.php`) — never part of the
  confirmed 24, tracked via the `postbuild` advisory wrapper (search "D943"/"D948").
- **Contrast guard built end-to-end, WARN-only.** New shared `src/utils/wcag-contrast.js`;
  `GradientCapableColourControl.js` gained opt-in `contrastAgainst`/`contrastLabel`/
  `contrastLargeText` (3.0:1 UI-component vs 4.5:1 text threshold, reusing the existing
  `meetsWCAG_AA(ratio, isLargeText)` axis) — additive-only, advisory `Notice`, never blocks save.
  Wired into all 7 text-colour callers with a determinable background (`site-header-row`/
  `site-footer-row` pilot, `hero`/`text`/`card-grid`/`container`'s grid-item defaults, plus the
  shared `textRow.js`/`SgsColourPanel.js` plumbing); `table-of-contents` correctly left unwired
  (structural — no background attribute, no fixed parent). `SgsBorderControl.js` gained the
  pass-through props but wiring any of its 44 callers was explicitly NOT pursued.
- **Two real bugs caught before commit, independently reintroduced twice**: `contrastAgainst`
  only accepts a FLAT colour — `card-grid`, the first cut of `text/edit.js`, and
  `GridItemDefaultsPanel.js` each independently resolved it as "flat OR gradient string", which
  fails to parse and produces an unconditional false "fails contrast" warning. Fixed uniformly:
  pass the flat background only when no gradient sibling also wins the paint.
- **A dispatched subagent's `git stash`/`git stash pop` wiped 16 files' worth of already-done
  hover-guard work**, working directly in the main tree (worktree isolation is broken repo-wide —
  a `core.worktree` redirect, not fixed this session). Caught by a hover-guard re-check, not the
  agent's own report (which claimed success); recovered by redoing all 16 files from the exact
  diffs already produced in-session and committing in small path-scoped batches. Full incident +
  the standing dispatch rule it produced (controller runs all git ops, subagents only edit): D948.
- **Doc reconciliation**: `plugins/sgs-blocks/package.json`'s `postbuild` advisory message
  corrected (was still describing 24 open findings); `.claude/plans/2026-09-03-golden-colour-
  staged-rollout.md`'s "no contrast guard" gap note corrected + its Phase 1 marked done (shipped
  D943); the now-completed `.claude/prompts/2026-09-04-contrast-guard-and-hover-cleanup.md`
  deleted.

**Session 6 history (D936-D945), compressed — full detail in `decisions.md`:** closed 8 of 9 rows
in a background-collision batch (text-gradient blocked by an opaque background reaching the
selector three different invisible ways), live-verified on the deployed canary for the first time
this track; the 9th (`nav-menu.burgerColour`) was a miscategorisation needing an unbuilt
`sgs_svg_stroke_gradient()` mechanism, parked separately (not touched this session); fixed a real
cross-block bug in `sgs_block_background_layer_css()` (comma-joined selectors weren't split
before `::after`); fixed the hover-guard detector's actual blind spot (function bodies only —
`render.php` declares none), which is what surfaced this session's 24 findings in the first place.

⛔ **ELIGIBILITY IS NOT "the colour is painted directly"** — still governing
(`background-clip:text` clips the WHOLE background paint area). D936 has the three ways a
background reaches a selector invisibly to element-manifest scanning.

**Open, carried forward:**
- **Hover-guard's 11 UNRESOLVED cross-file cases** — optional, scanner can't prove either way.
- **`SgsBorderControl`'s 44-caller wiring** — plumbing built (D948), no callers wired, not parked.
- **`nav-menu.burgerColour`** — needs `sgs_svg_stroke_gradient()` + a new attr (session 6, D945).
- Text-gradient attrMap split (24 `css:background-image` vs 14 `css:color-gradient` attrs) and
  `fix.js` (0 fixable) — both unchanged since session 5.

### Guardrails carried from this session

- **Never let a dispatched agent run git commands on a non-worktree-isolated shared tree** — the
  controller runs all git operations, one file/batch at a time; subagents only edit + report
  back. D948's stash incident is why. Applied cleanly for the rest of this session's 5-branch
  `/dispatching-parallel-agents` batch with zero further incident.
- **A dispatched agent's own report of what it did is a claim, not proof** — two of five haiku
  branches shipped the identical `contrastAgainst`-accepts-a-gradient-string bug independently;
  read every diff before committing, don't trust the self-report.
- **A build/deploy failure may be pre-existing debt, not a regression** (session 6) — check
  `git log` first.
- **Re-check the D-ceiling immediately before every write, not once per session** — standing rule,
  concurrent occupancy makes this load-bearing every session, not just when collisions happen.

## ▶ MOTION TRACK (A closed+live; B Phase 2 closed, Phase 3 next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** No phase number is shared.

### ▶ B. GENERATIVE BACKGROUND ENGINE (Phase 3 — fidelity/speed/colour all FIXED; Bean's visual sign-off is the only open item)

⭐ **Plan: `.claude/plans/2026-08-27-generative-background-engine.md`. Read D886-D888, D939-D948
before touching this track.**

**Result as of session 6: 3/3 phases pass** (2.81/2.35/2.73%, ceiling 5%). Colour vibrancy fixed
(D939, corrected D941); the 1D-vs-2D texture gap closed (D944, alpha-composited procedural field).
Live playback speed fixed (D930/D932).

**Session 7 additions (D946-D948, a concurrent session, not this LEDGER's authoring session):**
D946 — blob-density white-coverage regression shipped without checking its own measurement against
the reference baseline before deploy (24-35% near-white vs reference 0.8%), fixed + a process gate
added. D947 — an implementer subagent's report claimed three shader/JS fixes that were never
actually committed (`git show` + a local runtime test caught it, not the report); fixed directly.

⛔ **TWO CLAIMS ASSERTED PREVIOUSLY ARE WITHDRAWN — do not resurrect either.** An 89.3% silhouette
IoU (no script, no committed inputs), and "a systematic colour cast" (over-read `bias_over_abs`).
See D888.

⛔ **D880: Bean authorised porting the reference's VERTEX SHADER mechanism** (that file only).
Palette PNG stays off-limits as a shipped asset. Three.js can never ship (page weight, not law).

⭐ **Gate E stays held** — `.claude/scratch/stripe-hero-poc/` is in ZERO git files. A
`git clean -xdf` destroys every reference number permanently. `fidelity-baseline.json` +
`reference-matrices.json` are what survive it.

### ▶ NEXT — Bean's named visual sign-off (the only open item)

Fidelity, speed and colour vibrancy all pass/fixed. "B-movie 3D VFX" is a look judgement no
measurement closes — Bean's eye is still the other half of done.

**Canary fixtures — `[GATE — DO NOT DELETE]`:** **3135** (tall + full-height marker probe, 1618px)
and **3141** (scrollEffect matrix, all four values). Both load-bearing for re-measuring; 3079 and
3072 remain the layout probes.

### ▶ NEXT for the timeline

Nothing outstanding. Three items NAMED as out of scope in the design doc §3.4:
`mediaParallax`/`mediaKenBurns` (deferred on the real D597 `@keyframes` collision), per-image crop
control under `object-fit: cover`, `milestoneMediaDecorative` being block-wide rather than
per-entry. Plus a pre-existing 1px node/rail offset on `single-column` (Addendum 21).

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22. Detail: D725/D726, D731-D733.

One item survives it, PARKED and owned by nobody: the **sticky sidebar + band-replacement model**
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL). RE-MEASURE before building — its own
evidence says the accordion already solved the sidebar.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-09-02, deployed + live-verified.

All 16 media atoms adopted by all six in-scope blocks. Full narrative swept verbatim to
`memory/session-2026-09-02-client-controls-track.md` (LEDGER byte cap). Detail: D904-D913,
D915, D916, PR #36. Three items deliberately DEFERRED and named there, not forgotten:
`hero`'s motion CSS-emission, `container`'s Image tab, `product-card`'s `box-shape` adoption.
`trust-bar` + `brand-strip` nested media remain LIMITED follow-on, not started.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.
