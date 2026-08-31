---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-01
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Five tracks worked on it historically,
sharing one `main`; **only ONE is active now (Bean, 2026-08-30)** — the path-scoped commit hook
still applies, but 'another track holds this file' is no longer a live constraint.

Right now: the cloning pipeline and the motion system are both stable. The live front is
**client controls** — making sure every setting a client can change actually does something
visible, in the editor as well as on the published page. The canary test site is
sandybrown-nightingale-600381.hostingersite.com; there are no live client sites on this
framework yet, so breakage there costs time, not money.

## State Snapshot

- **Branch:** `main`, ONE active track. Commit with explicit paths (a hook enforces it).
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
- **Build:** green. Deploy payload is ~29MB (was 114MB).
- **Live fronts:** client controls (below) and motion. Cloning + consolidation are closed.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **Multiple tracks have touched `main` historically; ONE is active now. Sections below are per-track.**
The **motion** track owns `⛔ `sgs-framework.db` is ONE shared file — DB work sequentially, not parallel.

## ▶ MOTION TRACK (A closed+live; B Phase 2 closed, Phase 3 next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** They shared one plan file once and it cost a full
session (D838). No phase number is shared.

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

## ▶ CLIENT-CONTROLS TRACK — 2026-09-01/02: all 11 atoms finished, panel design settled (§18)

**Detail: D904-D913. Design `.claude/plans/2026-08-30-media-element-architecture-v2.md` §18
carries the panel design; §17 carries build status. Method rules: STOP-CATALOGUE **E19** + both
CLAUDE.mds. Do not restate history here.**

✅ **Comparison table + design decisions CLOSED.** `.claude/reports/2026-09-01-media-control-comparison.md`
compared all six in-scope blocks control-by-control (rewritten once, from 819-line prose to
187-line tables, after Bean flagged the first draft as overwhelming). Bean picked a target shape
per control, recorded in plan §18: media-type = real `MediaType` attribute + button-group +
NON-DESTRUCTIVE switching (§18.1, corrects that section's own original tabs-and-clear-siblings
text); "Media" panel with type tabs + an "Image Styling" sub-panel + overlay at the bottom
(§18.2); alt text auto-fills from the attachment, optional override not required (§18.3); a NEW
11th atom, `motion` (ken-burns/parallax), harvested from hero/container rather than designed
fresh (§18.4); overlay moved to the panel's bottom, hero's CSS-emitter bypass flagged (§18.5);
the `imageControls` extension is superseded by the panel for the six in-scope blocks only, not
framework-wide (§18.6).

✅ **All eleven atoms are built and independently gated** (`check-media-atom-purity.js`,
`test-media-atom-parity.mjs`, `check-dead-controls.js` — green throughout, verified together
after every parallel round). object-fit and focal-point are now fully tiered end to end (JS
`css()`, PHP twin, CSS `@media` chain, control UI) — a DIFFERENT prior documented decision
(`object-fit.css` said "deliberately not tiered") was reversed on Bean's explicit direction,
disclosed before building. box-shape rebuilt on the standard `SgsBorderControl` — an interim
radius-only mechanism was rejected as over-engineered ("shove it in with 0 nuance, like the
colour pickers"). `motion` built fresh; found and fixed a real cross-atom bug where it and
`svg-presentation` both wrote the same physical `animation-name` properties unconditionally —
fixed via one shared multi-value composing rule in `_base.css`, so both effects run at once
instead of one silently killing the other. media-type/source/meaning finished (button-group,
alt auto-fill on pick, non-destructive type switch).

⛔ **Three real bugs found by QC, all fixed same session.** (1) `ToggleGroupControl` has no
group-level `disabled` prop in the stable Gutenberg API (`WordPress/gutenberg#57862`, still open)
— it was a silent no-op; fixed by moving `disabled` onto each `ToggleGroupControlOption`
(`#63450`). Captured: `mistakes.md` `wp-component-prop-name-is-not-proof-of-behaviour`. (2) The
rewritten Wave 5-7 prompt had dropped `reports/visual-diff/media-2026-08-30.md`, which would have
sent the next session to re-verify a live check already closed 2026-09-01 (D909's
autoplay/muted/playsinline negative control, 4/4 assertions, desktop+tablet, JS disabled) —
restored with corrected framing. (3) **Most significant:** the rewritten prompt AND this LEDGER
entry's own first draft both claimed `MediaElementPanel.js`/`class-sgs-media-element.php` "does
not exist" — FALSE. Both were built and committed at `0f246b34a`, predating this session, already
correctly recorded in D911. Every atom `.control.js` file's own docblock said "deferring assembly
to a caller nobody wrote yet" — written before the panel existed, never updated once it did, and
carried forward uncritically. Caught by the independent handoff QC subagent, not during the atom
work itself. Full detail: D913.

**NEXT — `.claude/prompts/2026-08-31-media-element-waves-5-7.md`. Read it first — it now states
the CONFIRMED wiring state and gives the verification commands to re-check it, since it has
already been wrong once.** `MediaElementPanel.js` exists and works; `sgs/media` already has
`object-fit`/`focal-point` wired (INSERT-then-GUT done for both). Wave 5a's remaining work: wire
the other nine atoms into `sgs/media` and reorganise the mount to match §18's layout (currently
the two wired atoms are absorbed as bare rows into the pre-existing panel, not yet a dedicated
"Media" panel with tabs). Wave 5b: `before-after` — confirmed untouched, zero blocks besides
`sgs/media` reference `MediaElementPanel` at all — and the shared layer must NOT change while
wiring it (the falsification test). Waves 6-7 follow once 5 closes on a live paint, not on gates.

⛔ **SCOPE unchanged from 2026-08-31 — SIX blocks:** media, before-after, hero, container,
decorative-image, product-card. **A BACKGROUND IS NOT A MEDIA ELEMENT** — a block with a
background gets it from the shared `BackgroundPanel` (nine blocks mount it); `site-header` and
`site-footer` have nothing to do with this work. `container` is in scope because it OWNS that
mechanism. `trust-bar` + `brand-strip` have real nested media but are LIMITED follow-on.
**AFTER the six:** upgrade `BackgroundPanel` per media type. Order: container fixes the shared
wrapper -> hero -> remaining hosts.

✅ All four owed debts from the prior session CLOSED 2026-09-01 (D912) — SVG allowlist, SMIL
bypass, no-JS autoplay, video/SVG object-fit, all measured live not reasoned. `sgs/info-box`'s
three dead media attrs deleted. Full detail: D912.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.
