---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-03 (session 3)
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Five tracks worked on it historically,
sharing one `main`; **only ONE is active now (Bean, 2026-08-30)** — the path-scoped commit hook
still applies, but 'another track holds this file' is no longer a live constraint.

Right now: the cloning pipeline and the motion system are both stable. Client controls closed out
2026-09-02 (Waves 6-7 committed, deployed, live-verified). The live front is the **uniformity
sweep** — running the framework's own detector/audit scripts, clearing real findings, and fixing
the detectors themselves where they're wrong, so the client's editor/canvas/live-page experience
has no clear blockers. This session closed most of `37-media-no-handroll` (71 → 44 findings) —
17 blocks got a real client-facing crop control, the overlay atom gained responsive tiering, and
a 4-persona `/qc-council` review caught two real bugs before they shipped. Deployed and
live-verified on the canary. `37`'s remaining 44 findings then closed to 0 the same day (D924):
the held design chat about `sgs/container`'s background settled that a whole-block background
panel is a separate, non-element-based system, never meant to be compared against the media-atom
layer — a detector fix, not a build. Two items remain fully open (`01`, `21`). One dedicated
build-session prompt stays separate (below). A second track ran in parallel on **colour** (D923, then D928/D929 in a follow-on session):
rule 31 fell 276 → 250 via a detector fix plus a gradient rollout across 16 blocks; the
`grant.js` codemod plan was abandoned after an adversarial council found the route untested
against cheaper alternatives. The follow-on session then closed the remaining hardcoded-hover
backlog (category B) on 5-6 blocks, found and fixed a real DB-writer bug via `/qc-council`, and
ran this codebase's one existing scripted colour-repair tool (`fix.js`) — which shipped 3 real
bugs past its own self-test and the full build gate chain, all caught only by live verification
and fixed. Next session opens in `/brainstorming explore` mode on whether more of these
recognised defect shapes should become scripted repairs, given that evidence. A third session
shipped `01-tab-group`'s mixed-panel exemption rule (48 → 32) + fixed modal's overlay colour/
opacity split, then found and started retiring an unwanted, unfinished feature
(`attribute_gap_candidates`) surfaced by a routine `/sgs-update` anomaly — drafted in an isolated
worktree, NOT YET merged; full detail in its own track section below. The canary test site is
sandybrown-nightingale-600381.hostingersite.com; there are no live client sites on this framework
yet, so breakage there costs time, not money.

## State Snapshot

- **Branch:** `main`, ONE active track there. Commit with explicit paths (a hook enforces it). A
  SEPARATE worktree also exists for gap-candidates work (below) — don't branch again in the shared
  main working directory while a concurrent session may be committing there.
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
- **Build:** green on `main`, 86/86 prebuild gates verified 2026-09-03 at `2ad141986`; colour-track
  blocks live-verified against the real lifted CSS. Session 3's detector/panel fixes verified via
  self-test + re-run scan (no deploy needed). Nothing uncommitted on `main`; the gap-candidates
  worktree branch is drafted + tested but NOT merged.
- **Live fronts:** the uniformity sweep + gap-candidates retirement (below). Client controls,
  cloning, consolidation are closed; motion is stable with named next steps in its own section.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **Multiple tracks have touched `main` historically; ONE is active now — the uniformity sweep
(section below). Sections below are per-track, read only the one you're continuing.**
The **motion** track owns `⛔ `sgs-framework.db` is ONE shared file — DB work sequentially, not parallel.

## ▶ UNIFORMITY SWEEP TRACK — 2026-09-03 (session 3): 01-tab-group 48→32 + modal overlay fixed; 21 + gap-candidates retirement still open

⭐ **Read `.claude/reports/2026-09-02-findings-INDEX.md` FIRST — it is the map.** Twelve reports,
one per detector reporting findings, each with a plain-English problem/effect, a ranked menu and a
"Your call" checklist. Plan: `.claude/plans/2026-08-30-uniformity-sweep-execution.md`.

**Session 3 shipped, both on `main`:**
- **`01-tab-group` mixed-panel exemption** (via `/subagent-driven-development`, cross-model
  reviewed): a panel with a structural/no-CSS anchor control keeps its CSS-styling siblings
  grouped with it in Settings, not split to Styles — Bean's ruling, reversing an earlier "split
  mixed panels" assumption. 48 → 32 findings. Verified against 5 named worked examples
  individually, not just the aggregate count.
- **Modal's overlay colour+opacity** now live together in one Styles-tab panel (were split:
  colour in the generic colour panel, opacity alone in Settings) — matches the existing 8-block
  `BackgroundPanel.js` precedent exactly (colour picker with alpha off + a plain opacity slider,
  same panel).

**NEW, mid-flight — attribute-gap-candidates retirement.** Never-finished, never-wanted promotion
workflow, retired at Bean's direction (found via a `/sgs-update` anomaly that traced to a real
test bug hitting the live DB). 16 files drafted + individually tested in an isolated worktree
(`c:\Users\Bean\Projects\small-giants-wp-gap-retirement`, branch
`fix/retire-attribute-gap-candidates`) — NOT yet merged; schema drop + full gate run + commit/PR
still needed. Full breakdown in the continuation prompt below.

**Two dedicated next-session prompts, split deliberately (see below for why):**
- **Remaining backlog + gap-candidates finish (01 fully closed to session-3 state, 21, gap-candidates
  merge):** `.claude/prompts/2026-09-03-gap-candidates-retirement-and-detector-backlog.md`
  (supersedes `2026-09-03-detector-backlog-post-bg-panel-fix.md`, which is now stale — the `01`
  count and scope described there is pre-session-3).
- **`31-golden-colour-control` category-B is LANDED (D928/D929) — its continuation prompt is
  DELETED.** New prompt, different question: **`.claude/prompts/2026-09-03-mechanical-repair-scripting.md`**
  — opens in `/brainstorming explore` mode (Bean's explicit instruction) on whether the defect
  shapes recognised this session (motion-hover-guard, gate-omission, missing-element-manifest,
  text-gradient-backlog) can become scripted, batchable repairs, given that this session's ONE
  existing scripted repair (`colour-codemod/fix.js`) still shipped 3 real bugs past its own
  self-test and the full 86-gate build chain. Full account: D929.

### This session's close — D922 has the full account, this is a pointer

Closed most of **37-media-no-handroll** (71 → 44 findings): 17 blocks migrated onto the shared
media-atom system for `object-fit`/`object-position`, giving clients real crop controls; the
overlay atom gained tablet/mobile tiering. Two real bugs caught by `/qc-council` before ship (a
child-block override, a dead duplicate control with a live double-emission risk) — full account
+ the detector blind-spot finding + why the full wrapper-overlay swap was refused: D922.
Deployed + live-verified on sandybrown; 16 visual-diff reports written (intent-capture, live CSS
+ a populated `product-card` instance checked). Border-migration (previous session) — D921.

`31-golden-colour-control`'s status, unchanged: D754's plan has 2 of 6 work units done, but
`grant.js` — the actual capability tool — doesn't exist yet. ~5.4h BUILD task with its own
feasibility spike, own dedicated prompt, never folded into a mixed backlog session.

**`37`'s remaining 44 findings — CLOSED same day (D924), not a build.** The held design chat
about `sgs/container`/`cta-section`/`nav-drawer`'s background-image sizing happened: a whole-block
background panel (size/position/repeat/attachment/overlay/video/SVG/Ken-Burns/parallax) is a
separate, non-element-based system — it was never supposed to be compared against
`supports.sgs.mediaElements` at all, reversing a 2026-09-02 decision that had deliberately kept
Ken-Burns/parallax firing as a "media" signal. On investigation, `multi-button`/`physics-canvas`/
`site-footer`/`site-header`'s "documented debt, needs the atom's marker-class gap solved first"
findings turned out to be the identical misclassification — not 4 separate gaps, one detector fix.
Fixed in `37-media-no-handroll.js` (bare `background`/`bg`-prefix discriminator, 3 new self-test
fixtures), not by building the atom's caller-supplied-selector capability. 44 → 0, full detail
D924. No wrapper/render code touched, no deploy needed.

**What's left — 3 open items:** `01` (32 after session 3's mixed-panel rework, coarse-proxy check
— verify by eye) · `21` (54, pre-existing backlog, not yet triaged block-by-block) ·
gap-candidates retirement (drafted, needs merge — see pointer above). `31` (277) stays fully out
of this prompt.

⛔ **Working shape carried forward from the prior session, unchanged: dispatch each fix the MOMENT
Bean decides it and keep discussing while the agent works — do NOT batch every fix to the end.**
Verify every agent's result yourself (`git diff --stat`, re-run the detector, read a sample of the
actual diff) — this session caught a broken import, a syntax error, curly-quote flattening, an
invalid-UTF-8 byte, and an undestructured-attribute `ReferenceError` this way, none of which a
trusting read of an agent's own "done, verified" self-report would have caught.

**Earlier history (D918: the scattered-controls prototype deletion + 9 CONTESTED attrMap gaps
resolved; D919: the decide-first batch closure + hero split-media bug).** Compressed to this
pointer — full accounts live in `decisions.md`, not duplicated here.

⭐ **OPEN QUESTION, still needs an early ruling — carried forward, not yet resolved.** 31 baseline
entries classified `detector-limitation` — per this project's own rule ("a false positive is a
detector bug, never baseline fodder") these are rule violations sitting in a baseline, not a
normal outcome. Full list + which detector each belongs to: the INDEX report's disposition
section (`.claude/reports/2026-09-02-findings-INDEX.md`).

## ▶ COLOUR TRACK — 2026-09-03 (session 2): category B LANDED, DB writer bug fixed, codemod autofix run (3 real bugs found + fixed). Detail: D928/D929.

⭐ **Next prompt is a DIFFERENT question, not a continuation of this task list:
`.claude/prompts/2026-09-03-mechanical-repair-scripting.md`, `/brainstorming explore` mode.**
The category-B work below (previously the live task list) is DONE — this section is now history,
read for context, not for a next action.

**Shipped this session (D928/D929 have the full account):**
- Category B closed: `google-reviews`/`modal`/`form`/`pricing-table`'s hardcoded hover colours
  (no backing attribute) + `option-picker`'s pill hover (FR-35-5 exception deliberately reversed,
  overriding the live gate's own `needsHover:false` too — Bean's explicit call). Fill/border
  gradient extension across the same blocks via `sgs_button_element_style_css()`.
- A genuine DB-writer bug (found via `/qc-council`, two independent raters): `css_state` missing
  from Stage 1's pre-reseed reset list, so a stale value survived every `/sgs-update` reseed
  indefinitely. Fixed `9f2851150`.
- Ran `scripts/colour-codemod/fix.js --fix --apply` (the one existing scripted repair in this
  codebase) on its 6 accepted rows. **3 of 6 shipped genuinely broken** — a selector collision, a
  gradient-only gate omission (found on 2 blocks), a mis-inserted block targeting the wrong
  element entirely — none caught by `php -l`, JSON validation, or the full 86-gate build chain.
  All 3 found via live deploy + reading the actual lifted CSS, all 3 fixed and re-verified live.
  Commit `2ad141986`.

⭐ **Measured, not assumed: the text-colour-gradient backlog is 43 elements across ~35 blocks**
(queried directly against `textSharesElementWithBackground()`,
`scripts/inspector-scan/rules/31-golden-colour-control.js:163` — an existing, already-adopted
detector, not hand-derived). Named as its own project — closing it means moving each element's
background paint to a `::after` layer via `sgs_block_background_layer_css()`, never automated,
never built more than once.

**Still open, untouched this session, carried forward as-is:**
- **Category C — motion-only hover guard.** 76 rules across 25 blocks (`transform` 54, `opacity`
  9, `opacity+transform` 6, `filter`-family 7), confirmed via direct grep, none currently wrapped
  in the touch-hover guard. No script exists for this yet.
- **The pre-existing colour-codemod backlog** — `survey.js` still reports 252 rows across 65
  blocks; `fix.js`'s real accepted scope (now proven, not assumed) is a small fraction of what
  `survey.js` calls AUTOFIXABLE, and 3 of its 6 real applications this session were wrong. Widening
  this tool's scope before improving its verification story is exactly the open question the next
  prompt explores.
- 35 custom-property rows (fail in `style.css`, no phase owns it) and 132 below-min-states (a
  hover sibling per row — different dimension, different storage).

⚠ **No contrast guard exists anywhere in the colour components.** A client can pick a pale gradient
on white and get unreadable text with no warning, against the framework's own WCAG 2.1 AA baseline.
Named, not fixed; deserves its own session.

### Guardrails carried from this session

- **A tool passing its own self-test + the full build gate chain is not proof it's correct** —
  `fix.js` proved this twice (this session, and its earlier string-literal-splice incident). Live
  deploy + reading the actual rendered CSS is the only thing that caught either.
- **A concurrent second session can run the whole time on this shared tree** — hit repeatedly
  this session (files appearing/disappearing from `git status`, a `git checkout --` that nearly
  destroyed another session's uncommitted line, caught and restored byte-for-byte). Re-verify
  file ownership before every commit, always with explicit path scoping.
- **Per-agent green is not evidence** — run `gate:fast` centrally once after batches land.
- **A moved survey verdict cannot see a superseded writer left behind** — read the diff's minus lines.
- **Removing a writer can leave provably-dead guards**; prune by proof, never heuristic.
- **Never quote a doc's count into a commit message**; paste the tool's output.
- **Never fabricate `verdict: PASS`** — use the scoped `SGS_VISUAL_GATE_SKIP` bypass, never `--no-verify`.

## ▶ MOTION TRACK (A closed+live; B Phase 2 closed, Phase 3 next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** They shared one plan file once and it cost a full
session (D838). No phase number is shared.

### ▶ B. GENERATIVE BACKGROUND ENGINE (Phase 3 — engine BUILT + LIVE; fidelity FIXED, PASSING 3/3 — Bean's visual sign-off still open)

⭐ **Plan: `.claude/plans/2026-08-27-generative-background-engine.md`. Read D886, D887, D888
before touching this track — they supersede the technique spec's Animation section and record
two withdrawn claims.**

**Shipped and live on the canary:** all three layers of the fold. Layer 1 (CPU fold) + layer 2
(object transform) live in `webgl/generative-background-transform.js`, verified against matrices
extracted from the running rig; layer 3 was already correct. A missing depth buffer (`depth:
false`, no `DEPTH_TEST`) was the stair-step artefact — the fold overlaps itself, so draw order
decided the visible surface. Fixed `ba01581df`, live-verified. Frame cost 0.240ms / 0.300ms.

**The gap was REAL, is now FIXED and measured closed** (`fidelity-baseline.json`, tracked). At
effective phases 0.70/1.10/1.90 the divergence went **5.29%→2.81% / 4.71%→2.35% / 5.63%→2.73%
crop-wide** — **3 of 3 now pass the 5% ceiling** (was 2 of 3 failing). It did not collapse when a
25,000x phase-mismatch bug was fixed alone (that ruled out a measurement artefact); it DID collapse
once the real cause (below) was fixed.

⛔ **TWO CLAIMS WERE ASSERTED PREVIOUSLY AND ARE WITHDRAWN — do not resurrect either.**
An 89.3% silhouette IoU (no script, no committed inputs, a `background:#fff` hack in its capture
path), and "a systematic colour cast" (over-read `bias_over_abs`, which measures directionality
not spatial uniformity). See D888.

⛔ **D880: Bean authorised porting the reference's VERTEX SHADER mechanism** (that file only).
Palette PNG stays off-limits as a shipped asset — it is a measurement fixture, read in place from
`.claude/scratch/`, never in `plugins/`. Three.js can never ship (page weight, not law).

⭐ **Gate E stays held** — `.claude/scratch/stripe-hero-poc/` is in ZERO git files (`git ls-files`
returns 0). A `git clean -xdf` destroys every reference number permanently. The tracked
`fidelity-baseline.json` + `reference-matrices.json` are what survive it.

**2026-09-03 (D925-D927) — root cause PROVEN via `/systematic-debugging`, then FIXED mechanically
(Bean: "this is a mechanical fix, we're cloning something pre-existing").** D925 closed both D888
alternative causes. D926 proved geometry/twist was never the cause (silhouette coverage matches
the rig within 0.4pt avg) and isolated the fragment shader as the real one — the leading suspect
(depth-fade) recovered only 2% alone when tested, disproven rather than assumed guilty. D927 went
further: every fragment-shader constant was checked against the reference's actual measured
values (`index.html`'s light preset `P` + the hardcoded literals in `shaders/39798.glsl`'s
`surfaceColor()`) rather than accepted as "tuned by eye". Found `DEFAULT_GLOW_AMOUNT` was ~20x the
reference's real value (40.0 vs 1.98) — gating BOTH the fine-noise term and the camera-facing
lift — plus 7 more constants all wrong. **Deleted** (not corrected) the §3(b) legacy periodic-line
striation term entirely: its hardcoded `425.0` frequency is the reference's DARK-theme preset's
`lineAmount`, not light's (`1`), and the light theme's real shader never references it at all —
proven, not assumed, by reading `shaders/98230.glsl` (dark) directly, which DOES have an
equivalent mechanism, confirming depth-fade is real for dark ground and fabricated for light — now
gated on `u_ground`'s own luminance rather than deleted.

**Result: 3/3 phases pass** (2.81/2.35/2.73%, ceiling 5%); `bias_over_abs` ~0.9 (systematic) →
~0.3 (not); silhouette IoU 0.77-0.80 → 0.90-0.96; SHADED/SILHOUETTE coverage now match exactly
per-phase. `verify-transform.mjs` still 7/7.

### ▶ NEXT — Bean's named visual sign-off (the plan's other acceptance criterion, unaffected by the numbers passing)

Numbers pass; a residual ~1.8pt OVER-coverage (opposite sign from before) is noted, not chased.
"B-movie 3D VFX" is a look judgement no measurement closes — his eye is still the other half of
done. `npm run fidelity:compare` now exits 0 ("All rungs passed").

**Shipped this session:** `chromeOffsetPx()` moved to the Tier V shared home so a vanilla consumer
can read the sticky-header height; the progress marker re-mapped to a **reading line** and the two
fill drivers collapsed to one; **`milestoneSize: full-height`** with hero-split media
(+ `milestoneMinHeight`, `entryGap`); the root changed to a `<div>` with the `<ol>` inside it; and
**`scrollEffect`** — Standard / Move with the scroll / Pin and reveal / Pin and slide sideways,
gated on orientation, wired to the existing GSAP modules with `providesNatively` collapsing the
generic picker into one surface.

⛔ **FIVE defects, NONE caught by a gate.** (1) Deleting the CSS branch alone would have killed the
fill on Chrome+Safari — `view.js` gated on BROWSER CAPABILITY, not on whether the stylesheet branch
existed; Firefox would have looked perfect. Found by a cold reviewer. (2) A screenshot caught tall
milestones visibly broken while five assertions passed. (3) The `<ol>` losing its UA padding reset
put the node 20px off its own rail — found ONLY by comparing against geometry baselined before the
change. (4) Horizontal orientation stopped laying out entirely after the root change — same
coupling as the carousel, which WAS fixed in the same commit; missed because only the carousel was
looked for. (5) The intermediate track `<div>` made `pinned-horizontal` attach and slide nothing.

⛔ **A SPECIFICITY CONTEST LOST SILENTLY, AGAIN — third time in this feature.** Two candidate fixes
for the tall-milestone layout both changed NOTHING: one had no free space to distribute, the other
was correct CSS out-ranked by a `--media-under` rule at (0,4,0). Enumerating every rule matching the
element is the only reliable move. **A losing rule is indistinguishable from an absent one.**

⚠ **Corrections to earlier records, measured:** the marker sat at **109.8% and 116.7%** of viewport
on a TALL block — below the screen, invisible — not the 87-91% logged from a short one; and the fill
was **84.6%** complete when a reader starts, not 73%. Every prior figure came from a block SHORTER
than the viewport, which is exactly what hid the defect. `same-side` also shipped on PREDICTIONS
with no browser dispatched; Addendum 18 closed that debt — all six predictions held, rail/node
exactly 712.5.

⚠ **The design doc's "no GSAP loads at 375px" is FALSE and is withdrawn.** The modules ARE enqueued
on mobile and do nothing: the registry sniffs `data-sgs-fx` server-side where the viewport is
unknowable. Suppression is BEHAVIOURAL (no transforms, no pin-spacers, no GSAP objects — verified),
never byte-level. Framework-wide, not timeline-specific.

**Canary fixtures — `[GATE — DO NOT DELETE]`:** **3135** (tall + full-height marker probe, 1618px)
and **3141** (scrollEffect matrix, all four values). Both are load-bearing for re-measuring; 3079
and 3072 remain the layout probes.

### ▶ NEXT for the timeline

Nothing outstanding. Three items were NAMED as out of scope rather than dropped, all in the design
doc §3.4: `mediaParallax`/`mediaKenBurns` (deferred on the real D597 `@keyframes` collision — add
them against a stable layout, not during one), per-image crop control under `object-fit: cover`, and
`milestoneMediaDecorative` being block-wide rather than per-entry (negligible at thumbnail size,
material now that images are full-height). Plus a **pre-existing 1px** node/rail offset on
`single-column`, recorded in Addendum 21 and provably untouched by this session.

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
