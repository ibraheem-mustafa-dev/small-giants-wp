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

Right now: the cloning pipeline and the motion system are both stable. Client controls, uniformity
sweep (bar one detector), consolidation, and editor-errors are all closed — see their one-line
entries below. **Session 7 (2026-09-04) closed both fronts session 6 left open**: the hover-guard's
24 confirmed findings are ALL fixed (0 remaining, 11 unrelated pre-existing unresolved cases
tracked separately), and the WCAG contrast guard was built from scratch and wired into all 7
determinable text-colour callers, WARN-only per Bean's ruling. Along the way, a dispatched
subagent's unscoped `git stash` wiped 16 files' worth of already-done work on this shared tree —
caught and fully recovered, not silently lost (D948). Canary: sandybrown-nightingale-600381
.hostingersite.com; no live client sites yet, so breakage there costs time, not money. **Nothing
this session was deployed or live-verified** — build/lint verified only.

## State Snapshot

- **Branch:** `main`. Concurrent occupancy is the norm on this project — a second session (the
  generative-background/WebGL motion track) was active throughout this session too. Commit with
  explicit paths (a hook enforces it), re-verify ownership before each commit, never `git stash` /
  `git checkout --` a shared file — see D948 for why that's not theoretical.
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
  **Not deployed this session** — hover-guard/contrast-guard changes are build-verified
  (`npx webpack`, `php -l`) but not exercised live.
- **Verification:** `scripts/qa/assert-css-effect.js` runs a block's real render.php standalone and
  asserts the CSS it emits — no deploy, seconds to run. `scripts/toolindex/query.py "<what you
  need>"` finds a script by description when you do not know its filename.
- **Build:** green on `main`, NOT deployed this session. `node scripts/hover-guard/check.js` now
  reports **0 confirmed findings** (was 24) — 11 pre-existing UNRESOLVED cross-file cases remain,
  ADVISORY in `postbuild` (search "D943"/"D948") until each is read by hand.
- **Live fronts:** hover-guard's 11 UNRESOLVED cross-file cases (optional). `31-golden-colour-
  control` (253 open, own plan) is the largest untouched backlog on the project.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.
  Closed-track narrative lives in `memory/session-2026-09-04-tracks-history-sweep.md`, not here.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

Both fronts session 6 opened (contrast guard, hover-guard's 24 findings) are CLOSED this session —
there is no dedicated next-session prompt file; read the COLOUR TRACK section below for what's
genuinely still open (11 unresolved hover cases; `SgsBorderControl`'s 44-caller wiring, explicitly
NOT parked, Bean's call to close it here). If picking up general framework work, start with
`31-golden-colour-control` (253 open, its own ~5.4h build task, D754's plan) — the largest
untouched backlog on the project — or deploy + live-verify this session's hover-guard/contrast-
guard changes, which were never exercised against the real canary.

⚠ **Concurrent occupancy on `main` is the norm on this project, not the exception** — path-scope
every commit and re-check the decisions.md D-ceiling immediately before writing a new entry.

## ▶ UNIFORMITY SWEEP TRACK — CLOSED bar one detector. Detail: D918/D919/D922/D924/D930/D933.

`01-tab-group` (32→0) and `21-render-without-control` (54→0) both closed to zero, session 4
(D933) — full recipe swept to `memory/session-2026-09-04-tracks-history-sweep.md`. Gap-candidates
retirement DONE (PR #37, `61c2e813b`).

**What's left:** `31-golden-colour-control` — 253 open, its own dedicated ~5.4h build task
(D754's plan, `.claude/plans/2026-09-03-golden-colour-staged-rollout.md`, corrected this session —
see COLOUR TRACK note below). Nothing else open in this track.

## ▶ COLOUR TRACK — session 7 (2026-09-04): hover-guard's 24 findings CLOSED (0 remaining); WCAG contrast guard BUILT + wired. Detail: D948. Session 6 history (D936-D945) swept to memory.

⭐ **Both fronts session 6 left open are closed.** What's left: hover-guard's 11 pre-existing
UNRESOLVED cross-file cases (optional, never part of the confirmed 24), and `SgsBorderControl`'s
44-caller contrast wiring — explicitly NOT pursued or parked this session (Bean's call).

**Shipped this session — full account in D948, not duplicated here:**
- **Hover-guard: 24 → 0 confirmed findings**, all routed through `sgs_hover_state_rules()`/
  `sgs_hover_guarded_rule()`. 11 pre-existing UNRESOLVED cross-file cases remain (never part of
  the confirmed 24), tracked via the `postbuild` advisory wrapper (search "D943"/"D948").
- **Contrast guard built end-to-end, WARN-only**: shared `src/utils/wcag-contrast.js`;
  `GradientCapableColourControl.js` gained opt-in `contrastAgainst`/`contrastLabel`/
  `contrastLargeText` (3.0:1 UI-component vs 4.5:1 text threshold); wired into all 7 text-colour
  callers with a determinable background; `SgsBorderControl.js` got the pass-through props but no
  callers wired (its 44 mounts, explicitly not pursued).
- **A caught-before-commit bug, reintroduced twice independently**: `contrastAgainst` only
  accepts a FLAT colour — three sites (two dispatched agents, one inline) each passed "flat OR
  gradient string", producing an always-false-positive warning. Fixed uniformly.
- **A dispatched subagent's `git stash`/`git stash pop` wiped 16 files of a sibling task's
  already-done work** (worktree isolation broken repo-wide — `core.worktree` redirect). Caught by
  a hover-guard re-check, not the agent's report; recovered, redone, committed in small
  path-scoped batches. Standing dispatch rule it produced: controller runs all git ops, subagents
  only edit. Full incident: D948.
- **Doc reconciliation**: `package.json` postbuild message, the golden-colour plan's stale
  "no contrast guard" note, and the completed cleanup prompt file — all corrected/removed.

⛔ **ELIGIBILITY IS NOT "the colour is painted directly"** — still governing
(`background-clip:text` clips the WHOLE background paint area).

**Open, carried forward:**
- **Hover-guard's 11 UNRESOLVED cross-file cases** — optional, scanner can't prove either way.
- **`SgsBorderControl`'s 44-caller wiring** — plumbing built (D948), no callers wired, not parked.
- **`nav-menu.burgerColour`** — needs `sgs_svg_stroke_gradient()` + a new attr (session 6, D945).
- Text-gradient attrMap split (24 `css:background-image` vs 14 `css:color-gradient` attrs) and
  `fix.js` (0 fixable) — both unchanged since session 5.

### Guardrails carried from this session

- **Never let a dispatched agent run git commands on a non-worktree-isolated shared tree** — the
  controller runs all git operations; subagents only edit + report back (D948's stash incident).
- **A dispatched agent's own report is a claim, not proof** — 2 of 5 parallel branches shipped the
  identical bug independently; read every diff before committing.
- **Re-check the D-ceiling immediately before every write, not once per session.**

## ▶ MOTION TRACK (A closed+live; B Phase 3 — CLOSED, Bean's visual sign-off given 2026-09-04)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** No phase number is shared.

**Wave-D register CLOSED 2026-09-04, session 7 (part of Track A).** The last four open items
(Step 12/FR-38-22 cloning lift, Step 20, Step R-residual, Step 21) all closed same session —
decisions.md D949-D955. Plan archived: `plans/archive/2026-07-31-motion-wave-D-client-readiness.md`.
Headline: the cloning pipeline genuinely drops no motion attributes now (verified against the real
`convert_section()`, not a unit test), a second-round adversarial council caught and fixed a bug
that would have self-reverted the whole fix on the next `/sgs-update`, and a pre-existing stored-XSS
defect in the converter's block-comment serialiser was found and fixed along the way (D953).
⚠ Still owed: a live-canary Playwright/DOM check (R-31-13) — everything closed tonight is
pipeline-level proof, not yet confirmed live.

**B (Generative Background Engine):** fidelity, speed and colour vibrancy all measured
fixed/passing (3/3 phases, ceiling 5%) — full build history (D886-D944) swept to
`memory/session-2026-09-04-tracks-history-sweep.md`. Session 7 added two INCIDENT entries from a
concurrent session — **D946** (a blob-density regression shipped without checking its own
measurement first — process gate added) and **D947** (a subagent's report claimed shader fixes
that were never actually committed — caught by `git show` + a runtime test, not the report). Plan:
`.claude/plans/2026-08-27-generative-background-engine.md`. Read D886-D888, D939-D948 first.

⛔ Two withdrawn claims, do not resurrect (D888): an 89.3% silhouette IoU (no script/inputs), and
"a systematic colour cast" (over-read `bias_over_abs`). ⛔ D880 authorised porting the reference's
VERTEX SHADER only — palette PNG stays off-limits as a shipped asset; Three.js can never ship.
⭐ Gate E stays held — `.claude/scratch/stripe-hero-poc/` is in ZERO git files; `fidelity-
baseline.json` + `reference-matrices.json` are what survive a `git clean -xdf`.

**CLOSED 2026-09-04.** An `/adversarial-council` review surfaced six real gaps in the colour
engine (dark-ground opaque-alpha bug, light-theme-only grading applied unconditionally under dark
ground, a striation-killing midline blackout, no regression fixture, no narrow-hue-palette
warning, a stale help string) — all six fixed and verified. Two process incidents along the way,
both recorded: **D947** (an implementer subagent's report claimed three fixes that were never
actually committed — caught by `git show` + a real runtime test, not by trusting the report) and
**D948-adjacent** (a literal `(D948)` inside an unquoted `postbuild` echo string, from an unrelated
concurrent commit, broke every Windows build — fixed, since it blocked everyone not just this
track). Bean viewed the live canary after all fixes shipped and confirmed: **"Looks good."** Full
account: D939-D948 (read together). Canary fixtures `[GATE — DO NOT DELETE]`: 3135, 3141, 3079,
3072. Timeline sub-feature: nothing outstanding (full defect/addenda history swept to memory).

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (D725/D726, D731-D733)

One item survives, PARKED, owned by nobody: sticky sidebar + band-replacement model
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL) — RE-MEASURE first, the accordion
may already have solved it.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-09-02, deployed + live-verified (D904-D913, D915/D916, PR #36)

All 16 media atoms adopted by all six in-scope blocks. Narrative:
`memory/session-2026-09-02-client-controls-track.md`. Deferred + named there: `hero`'s motion
CSS-emission, `container`'s Image tab, `product-card`'s `box-shape` adoption. `trust-bar`/
`brand-strip` nested media — DONE 2026-09-04, see the SPEC-35 CAPABILITY-ROUTING TRACK below.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative: `memory/session-2026-08-22-editor-errors-track.md`. Nothing pending.

## ▶ SPEC-35 CAPABILITY-ROUTING TRACK — CLOSED 2026-09-04, all four items, deployed + live-verified

Plan archived: `.claude/plans/archive/spec-35-capability-routing-doctrine.md` (its own status
line carries the full closure record — read that, not a summary here). All four items the doc
called open are closed, three needed no build at all:
- **Part 6 gate** — already a real hard gate since the 2026-08-24 `gates.json` refactor; the
  doc's own `||`-advisory description was stale. Verified live, 0 violations.
- **`testimonial`/`image-sequence` crop decision** — both already resolved before this session
  (`image-sequence`'s dead declaration self-documents its own removal; `testimonial`'s three
  media slots were already correctly handled, `orgLogo` deliberately fixed/non-overridable).
- **Part 7 native-supports census** — script existed, never run; ran + committed
  `reports/migrations/native-supports-census-2026-09-04.json`, 0 findings.
- **Part 4 multi-image item-schema extension — the only real build.** `gallery`/`card-grid`/
  `trust-bar`/`brand-strip` each gained a stable per-item `_key`
  (`src/utils/generateItemKey.js`) and a per-item crop control, deployed and live-verified via
  the generated collected-CSS stylesheet on each of 4 probe pages (created + verified + deleted).
  `card-grid`/`gallery` get full object-fit + focal-point; `trust-bar` (image-badge variant
  only)/`brand-strip` get object-fit only, matching the established logo-content convention (no
  crosshair on non-photographic media). Two parallel Sonnet subagents built `trust-bar`/
  `brand-strip` from the `card-grid` reference commit — one real regression surfaced and fixed
  (`badgeImageObjectFit` lost its only in-file reference when the canvas preview switched to
  per-item values; fixed by falling back to the block-wide default instead of a literal).
  Commits: `a314fdc47`/`335a0885a` (card-grid+gallery), `ef051e39c` (unrelated `icon-list` gate
  fix that was blocking the whole project's build), `0fbfb51d2`/`94485dad5` (trust-bar/
  brand-strip). Reports: `reports/visual-diff/{card-grid,gallery,trust-bar,brand-strip}-
  2026-09-04.md`.

⚠ **Two shared-resource incidents this session, both resolved, neither mine to have caused:**
a `check-box-family-guard` finding on `converter/resolvers/content_band.py` (a concurrent
session's file, fixed by them) and a `db-consistency` gate finding on `sgs/nav-drawer`/
`notice-banner`/`post-grid` (also fixed by a concurrent session before I re-attempted the
commit) both briefly blocked this track's commits. Neither was baselined blind — both were
confirmed unrelated to this track's payload before waiting on the other session, per this
project's own "don't touch a shared/high-blast-radius file without coordination" rule.
