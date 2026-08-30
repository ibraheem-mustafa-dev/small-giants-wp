---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-30
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Five tracks work on it in parallel,
sharing one `main` branch — which is why almost every rule below is about not treading on
another track's work.

Right now: the cloning pipeline and the motion system are both stable. The live front is
**client controls** — making sure every setting a client can change actually does something
visible, in the editor as well as on the published page. The canary test site is
sandybrown-nightingale-600381.hostingersite.com; there are no live client sites on this
framework yet, so breakage there costs time, not money.

## State Snapshot

- **Branch:** `main`, shared by five tracks. Commit with explicit paths, never `git add -A`.
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
- **Build:** green. Deploy payload is ~29MB (was 114MB).
- **Live fronts:** client controls (below) and motion. Cloning + consolidation are closed.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **FIVE TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden /
client-controls** track is CLOSED (D898) — its section below is a pointer only. The **motion**
track owns `## ▶ MOTION TRACK` below.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.
The fifth is the **editor-errors / nav-drawer** track (D742) — CLOSED, section at the bottom.

⛔ **Before building ANY script or hand-doing investigative work, grep the two GENERATED
catalogues in `.claude/dev-setup.md`.** 524 scripts across FIVE directories, and this repo's
recorded failure mode is rebuilding one that already exists. Search the SUBJECT (colour,
token, element, parity), never the verb — the same idea is spelled `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

## ▶ BORDER / SHAPE-B TRACK — 2026-08-30 (evening): CLOSED

**Detail: D881 + `.claude/prompts/2026-08-31-shape-b-close-out.md` (5 tasks ALL DONE) +
`.claude/memory/sdd-progress.md` (the form-field-tiles fix). Do not restate history here.**

Both red gates fixed (`check-editor-render-parity` 177→162, a real false positive fixed with a
regression test, not baselined; `check-undeclared-attrs` 4→0), deployed, all 46
boxFamilies.borderRadius blocks live-probed (not 44, stale even at close-out), remaining stored
content migrated (558: info-box 351, testimonial 186, site-footer-row 18, form-step 3 — the
close-out's 522/345/174 were already stale), worktrees tidied. `sgs/form-field-tiles`'s
distinct FAIL (its outer `field_open()` wrapper, shared by ~10 field-block types, never called
`get_block_wrapper_attributes()`, so WP's identity class landed on an inner child div instead of
the one carrying the uid + border CSS) fixed via `field_open()` itself — the universal fix,
confirmed safe against all 10 sibling field types. Live probe re-confirmed PASS for both
form-field-tiles and form-step in the same run, post every commit below.

Commits `76a3ef734`..`81ed169ec` (`git log` for the range — border-track + SDD-ledger commits
only; other tracks landed work in between on the same shared `main`).
Reports: `reports/visual-diff/shape-b-batch-2026-08-30.md` (canonical) + `-full-sweep.md`
(other 14 blocks).

**The 10 NOT RUN blocks are CLOSED (2026-08-29, commit `3069869f5`).** Every one turned out to be
a gap in the PROBE's own fixture-generation, not a parent-nesting requirement — most (quote,
product-faq-item, site-footer-row, site-header-row) failed on one shared bug (the probe's
`sgs/text` filler child used the wrong attribute name); the rest needed richer per-block fixtures
(image attrs, an `optionItems` array, a real `sgs/tab` child, a real heading on the page, and for
`buybox` a live WooCommerce product bound via `woocommerce/product-collection`'s hand-picked mode
— NOT `core/query`+`include`, which this plugin's own CLAUDE.md documents as unreliable). Live
re-run: 9 PASS, 1 real FAIL. `sgs/table-of-contents`'s negative control still paints a border — a
genuine bug in that block (already flagged elsewhere as broken), not a probe gap; still open.
`nav-drawer`'s variant-discriminator finding needs its own `detect_variant` converter session —
not a border-track item, unchanged.

**Bean's corrections:** radius is not native (shared-helper wrap, not `__experimentalBorder`);
`borderStyle` default `solid`, `none` stays in enum. Per-device border WIDTH CANCELLED.

⛔ `sgs-framework.db` is ONE shared file — DB work sequentially, not parallel.
⛔ `inspector-scan` "01-tab-group" ratchet red (58 vs 57), pre-existing + unrelated — reconfirm
on a clean stash first. `--no-verify` was Bean-authorised only for that ratchet.

## ▶ MOTION TRACK (A closed+live; B Phase 2 closed, Phase 3 next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** They shared one plan file once and it cost a full
session (D838). No phase number is shared.

### ▶ A. `fx-wave-gradient` — SIX-STYLE ENGINE: ✅ CLOSED 2026-08-27 (D852 built, D871 closed)

**DEPLOYED, LIVE-VERIFIED, nothing open. Full detail → D871; do not restate.** Only the three things
a future session could get wrong:
- ⛔ **"Gradient controls for the four CSS styles" is CANCELLED, not deferred** — the premise was
  false. Do not revive without evidence a picker is dead.
- ⚠ **Two deploy hazards earned here, both fixed in-tree — read D871 BEFORE deploying:** a
  dev-included Composer autoloader 500'd the canary through 68 green gates (gate-green and
  deploy-safe are INVERTED states of `vendor/`), and its guard had **never been committed**
  (`4494e6e1d`; phar gap closed at `62809c801`).
- **Fixtures: 2740** (single pastel) and **3037** (all six variants), both `[GATE — DO NOT DELETE]`.
  Probe 3037 asserts `webgl capable: true` FIRST, or 0-canvases is indistinguishable from a browser
  declining WebGL.

### ▶ A-legacy — the built engine's design facts (STABLE, still true). Detail: D852.

One `fxWaveVariant`, six styles: `pastel | horizon | ribbon | veil` (pure CSS, no canvas) and
`aurora | ink` (WebGL). ⛔ **No new `fx_effects` rows** — the variant rides the existing effect, so
no shared-DB write, no registry regeneration. ⭐ **Ink and Aurora are the SAME shader**: it measures
the base colour and crossfades compositing (dark ground = curtains ADD, light = DARKEN) — one
shader, two products, separated only by curated colours. ⛔ **CSS cannot do an aurora** — three
attempts failed three different ways; filaments need per-pixel noise + domain warping, and CSS has
neither. **Curated defaults sit in `:where()` at ZERO specificity** so the look is good on
switch-on and the client's pick always wins (a render-layer `(0,1,0)` rule would LOSE to the
`(0,2,0)` variant selectors). Aurora's violet is curated per style, never added to the palette.

### ▶ B. GENERATIVE BACKGROUND ENGINE (Phase 3 — engine BUILT + LIVE; fidelity gap OPEN)

⭐ **Plan: `.claude/plans/2026-08-27-generative-background-engine.md`. Read D886, D887, D888
before touching this track — they supersede the technique spec's Animation section and record
two withdrawn claims.**

**Shipped and live on the canary:** all three layers of the fold. Layer 1 (CPU fold) + layer 2
(object transform) live in `webgl/generative-background-transform.js`, verified against matrices
extracted from the running rig; layer 3 was already correct. A missing depth buffer (`depth:
false`, no `DEPTH_TEST`) was the stair-step artefact — the fold overlaps itself, so draw order
decided the visible surface. Fixed `ba01581df`, live-verified. Frame cost 0.240ms / 0.300ms.

**The measured gap, and it is REAL** (`fidelity-baseline.json`, tracked): at effective phases
0.70/1.10/1.90 the divergence from the reference is **5.29% / 4.71% / 5.63% crop-wide, 10.71% /
9.90% / 10.64% over the painted region** — 2 of 3 over the 5% ceiling. It did not collapse when a
25,000x phase-mismatch bug was fixed, so it is not a measurement artefact.

⛔ **TWO CLAIMS WERE ASSERTED THIS SESSION AND ARE WITHDRAWN — do not resurrect either.**
An 89.3% silhouette IoU (no script, no committed inputs, a `background:#fff` hack in its capture
path), and "a systematic colour cast" (over-read `bias_over_abs`, which measures directionality
not spatial uniformity). **Painted coverage differs 7.7 points at t=17500 and hue count 2.3x — a tone shift
cannot change coverage. Shape divergence is the leading UNTESTED hypothesis.** See D888.

⛔ **D880: Bean authorised porting the reference's VERTEX SHADER mechanism** (that file only).
Palette PNG stays off-limits as a shipped asset — it is a measurement fixture, read in place from
`.claude/scratch/`, never in `plugins/`. Three.js can never ship (page weight, not law).

⭐ **Gate E stays held** — `.claude/scratch/stripe-hero-poc/` is in ZERO git files (`git ls-files`
returns 0). A `git clean -xdf` destroys every reference number permanently. The tracked
`fidelity-baseline.json` + `reference-matrices.json` are what survive it.

### ▶ NEXT — investigate the ~10.6% painted-region gap against the SHAPE hypothesis

Prompt: `.claude/prompts/2026-08-30-generative-background-fidelity-gap.md`. Two named follow-ups
first (both live alternative explanations): drive the replica through the PRODUCTION option path
(it currently measures the module's `DEFAULT_*` constants, not the block's shipped attributes),
and a shared `harness-lib.mjs` — four Chromium harnesses have already drifted, one roots where the
palette 403s. `npm run fidelity:compare` reproduces every figure; `check:transform-parity` is
wired and survives the rig's deletion.


### ▶ PARTICLE + GATES SUB-TRACK — CLOSED 2026-08-27/28. Detail = D839-D842, D846, D853, D863-D870.

Sparks approved by Bean (`fxParticleColour`, live on 2744). FR-38-33 grid-dots closed (live on
3038, contrast 1.30 → **4.23:1**). FR-38-6 closed by observation (page 2893). Row-collapse
reduced-motion closed (D863). ⛔ Editing template part 2671 does NOTHING — `parts/header.html` is a
`wp:pattern` ref, so `patterns/framework-header-default.php` renders.
⛔ **Parked:** `P-PARTICLE-TRAIL-VARIATIONS` (post-launch, Bean's timing).

### ▶ C. TIMELINE (FR-38-35) — Stages A/B/C SHIPPED + LIVE. D879, D894-D897.

Layered control model built and live. `f6188b027`→`10072a44b` (canary 3079 + 3072). Evidence:
`reports/visual-diff/timeline-2026-08-30.md` + `memory/sdd-progress.md`. Shipped:
mobile collapse fixed (content 76/164px → **328px**), `date-over-media` REMOVED on Bean's verdict,
`mobileLayout` (stacked | scroll-snap carousel), `alignment` split into `contentLayout` +
`datePosition`, and **`same-side`** — Bean's originally-requested option.

⛔ Safari has `animation-timeline` since **26.0**; **Firefox has it in NO stable build** (157), so
the JS driver is Firefox's PRIMARY path — Spec 38 named the wrong browser twice. **The SVG-path
route is DEAD for a straight connector**; Spec 31 C9's no-JS hatch is CLOSED. Detail: D879.

⛔ **FOUR INSTRUMENT TRAPS — in CC memory and reproduced in full in the prompt. Read before
measuring.** Lenis-animated scroll; staircase custom-property reads; **a losing CSS rule is
indistinguishable from an absent one** (hit twice in one session); wrong-owner match resolution.

⚠ **Every real defect here was caught by a screenshot or by Bean, never by a gate.** A blank
carousel passed 73 gates and every numeric check — a zero-opacity element measures perfectly.
STOP-CATALOGUE STOP-INSTRUMENT-SHAPE.

### ▶ NEXT for the timeline

⭐ **`.claude/prompts/2026-08-31-timeline-task4-and-tall-milestones.md` carries every remaining
task.** Its predecessor shipped in full and was deleted. **Task 1** wires `scrollEffect` to the
existing `fx-pin-scrub`/`fx-horizontal-panel` modules (approved, block-private via `data-sgs-fx`;
neither GSAP preset may run ≤767px — SC 2.5.7). **Task 2** is a DESIGN GATE ONLY for Bean's
tall-milestones direction, which also fixes the measured marker defect (it sits at **87-91%** of
viewport height; fill hits 73% before the reader starts). Verdict: **~35-40vh**, sticky,
`scroll()` not `view()`.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (Phase 4). Detail: D731/D732/D733,
Spec 32 §6.1(a1)/(a2), Spec 35 Part K. shop-archive: Phase 3 ownership moved 2026-08-27 to
`.claude/prompts/2026-08-28-finish-the-template-review.md` — do not restart it here.

## Task 1 — container width model: ✅ CLOSED (D725/D726). `contentWidth` caps content, core's
duplicate constrained-layout DELETED. One cap per page, ours. A block placed straight into a
page is intentionally full-width — do not "fix" it.

## Task 2 — Two decisions the colour-golden track is waiting on

Sticky sidebar (their evidence says the accordion already solved it — RE-MEASURE before
building anything) and the band-replacement model, which is Task 1 by another name. Neither
touched by the client-controls track's 2026-08-30 close-out (D898) — parked:
`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL.

## ▶ LIVE STATUS — 2026-08-23 (shop-archive track — PHASE 3 WAVE A CLOSED)

**All pushed. Build GREEN (677 converter tests). Canary deployed + live-verified.**
✅ `a85a87d2` (the cosmetic `--flex` marker-class fix, a plugin file) SHIPPED on the
2026-08-23 blocks deploy. Nothing outstanding.

**Phase 3 has TWO axes.** Correctness (the 7-point checklist) and design. Wave A closed
the STATIC half of correctness across all 10 surfaces; the design axis has never run.

**Wave A: 10 parallel agents, one per surface, ZERO FAILs.** Register:
`reports/2026-08-22-phase3-template-audit-register.md`. Global gates run ONCE and
attributed rather than per-agent — both scripts are whole-repo and take no file argument,
so a per-surface run returns the same answer ten times and attributes nothing.

**⭐ The headline: the whole `align` mechanism was inert and is now GONE from
`sgs/container`.** Measured, not reasoned — stripping `.alignfull` from a real element in
a real `.wp-block-post-content` context changed nothing (left, width, all four margins
identical; A/B against an unaligned sibling byte-identical). Core's breakout resolves
`calc(var(--wp--style--root--padding-left) * -1)` against a variable that is EMPTY at
`:root`. `align:"wide"` never had a matching rule at all. No SGS-BEM draft can express
either — there is no such CSS property — so emitting it failed the R-1 honest-mapping
test. **Full-bleed comes from `maxWidth` defaulting to `{}`.** Canary DB held 0 align
authorings. Spec 31's L1 rule amended; converter self-disabled via the DB reseed.

**⭐ Second: a `<main>` is not a flex container.** D742's `layout:flex` default was
retroactive and no `<main>` had ever set the attr, so every page laid its top-level
sections out in a ROW — measured at 634/1328/1328px on the product page. Bean's call, and
he was right about the shape: normal block flow already stacks, so the outer flex is now
suppressed for a `<main>` rather than re-pointed to `column`. Explicit `layout:"stack"`
removed from the eight templates so ONE owner remains; `404.html` states nothing at all
and is the **living canary** for the behaviour. Verified: 3 sections → 1732px each,
stacked, backgrounds spanning.

**Also fixed, both root-caused rather than worked around:** `extract-signatures.py`'s
`css_tier` was RANDOM (set iteration + per-process string-hash salting) — three sessions
had hand-reverted the same diff without finding it; now deterministic, proven across three
`PYTHONHASHSEED` values. And Stage 2's live scrape was failing on an expired root in the
**Windows** trust store, not WordPress's cert (their leaf is valid to October); both
`urlopen` sites now use a certifi context — 3/7 sources → **10/0**, and `wp_version_indexed`
corrected 7.0 → 7.1.

### ▶ NEXT for this track, in order

1. **The design benchmark — ✅ IT DID RUN (2026-08-23). This line said otherwise and was
   wrong.** Output: `.claude/reports/2026-08-23-template-design-benchmark.md`, ten surfaces
   graded; most of the ranked list was implemented, deployed and live-verified. Its prompt
   carried its own `⛔ EXECUTED` banner the whole time. Bean deleted the prompt on that
   basis and was right to; the deletion is committed. **Read the register's four
   corrections before trusting any of its findings** — Bean caught all four by eye.
2. ⛔ **Wave C + the three correctness items — MOVED 2026-08-27 to
   `.claude/prompts/2026-08-28-finish-the-template-review.md`. Do not start here.** Of the
   three: `main` missing from `edit.js` `TAG_NAME_OPTIONS` IS carried forward in that prompt.
   The h1→h3 skip was re-checked live 2026-08-27 and came back CLEAN on both `archive.html:21`
   and `search.html:16` — resolved, nothing to do. **The third item — redundant nested
   `contentWidth` in 5 files — is NOT in the new prompt** (found missing during the 2026-08-27
   handoff QC pass; it never made it into an earlier prompt rewrite). File names for the 5
   instances were not recorded anywhere still readable — next session needs to re-derive them
   (likely via `grep -rn 'contentWidth' plugins/sgs-blocks/src/blocks/*/render.php` cross-checked
   against nesting depth) before fixing.

⚠ **Canary content constrains Wave C:** 9 posts, 135 pages, 5 products, 1 category,
**0 approved comments** (so `single.html`'s 14 comment blocks cannot be demonstrated
without seeding one). `index.html` is genuinely unreachable — `show_on_front=posts`,
`page_for_posts=0` — which is the healthy state for a fallback template, not a defect.
`front-page.html` renders ~104 chars and ZERO `<h1>`: the template is CORRECT as a shell,
the mismatch is that the site shows latest posts while the template holds `post-content`.
That is a Settings → Reading finding.

## ▶ shop-archive track — Phases 1 & 2: CLOSED 2026-08-22 (D742)

Narrative swept VERBATIM to `memory/session-2026-08-22-shop-archive-phase2.md` on
2026-08-23 (this file was 2,074 bytes over its cap). Nothing pending there.

⛔ **One item in that archive is still OPEN and is NOT part of Phase 2** — the
`sgs/container` capability gap: the container injects `.sgs-container__inner` carrying
`max-width` on ITSELF, where core caps CHILDREN via
`.is-layout-constrained > :where(:not(.alignfull))`. Ours therefore cannot express
"full-bleed child of a constrained parent". Read it there before reopening it.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-08-30 (late). Detail: D898.

Colour-standard residuals (border group default on `sgs/multi-button`, deploy, scatter-detector
census) closed and deployed same session — full detail in `decisions.md` D898, do not restate
here. Full prior-session narrative archived verbatim: `memory/session-2026-08-30-5.md`.

**Closed same day:** hero's visual-diff debt paid (`reports/visual-diff/hero-2026-08-30.md`) and
the `sgs/media` "wrapper vs media" note confirmed a non-issue (`check-element-manifest-conformance.js`
GATE PASS) — both archived to `memory/parking-archive.md`, not restated here.

**Still open, parked (none blocking, none this track's to finish alone):**
`P-SCATTER-DETECTOR-FAMILY-CLASSIFICATION` · `P-DETECTOR-FIRST-COMMIT-GATE-THRESHOLD-HOLE` ·
`P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL` (all in `parking.md`, bucket "framework").
Spec 39 capture work stays paced by `plans/2026-08-25-road-to-uniform-then-spec-39.md` /
`plans/spec-39-seed-requirements.md` — D552 still holds: standard leads, pipeline follows.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.

