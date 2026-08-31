---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-30
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

## Task 1 — sticky sidebar + band-replacement model: PARKED, not this track's.

`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL. RE-MEASURE before building —
their own evidence says the accordion already solved the sidebar.

## ▶ CLIENT-CONTROLS TRACK — 2026-08-31: MEDIA ELEMENT, waves 1-4 SHIPPED

**Detail: D904-D910. Plan `~/.claude/plans/media-element-zippy-boole.md`. Design
`.claude/plans/2026-08-30-media-element-architecture-v2.md` — rewritten in place; do not re-add
"this was wrong" notes, they mislead a grepping agent. Method rules: STOP-CATALOGUE **E19** + both
CLAUDE.mds. Do not restate history here.**

**Waves 1-2 deployed + live-verified** (probe **3143**). **Waves 3-4 built, 82/82 gates, NOT
deployed** — atom registry, presentation census + `gaps` matrix, selective injection both sides
(109 → 49 keys), generated L4 stylesheet, ten atoms, **nine** media gates.

⛔ **Each atom is TWO modules** (`check-media-atom-purity.js`): `<id>.js` plain-Node importable,
`<id>.control.js` holds the JSX. Three of my own instruments read green while proving nothing —
read D910 before trusting a ratchet or fixture here.

⛔ **METHOD, Bean-locked 2026-08-31.** A control that "does not work" already works somewhere: query
`block_attributes`, read the WORKING block, diff. **Never reason from what the canary renders** —
pre-production, nothing to protect. Two gated rules from it: a shared fallback is the MEASURED
default, never `initial`; scope per ELEMENT (`{uid}--{prefix}`), never per block, or a two-element
block renders both slots with the second's value.

⛔ **ABSENCE IS A GAP, NOT A DECISION.** `gaps` is the operative census output, not the inventory:
**SIX real gaps**. Only a genuinely DIFFERENT concept is excludable (`decorative-image`'s
`positionX/Y` = absolute page placement).
⛔ **A control becomes standard by BEING a shared helper** — `golden-controls.json` encodes 14 types,
exactly ONE has a rule reading it.
⛔ **`object-fit`'s `custom` is a SIZING MODE** → belongs to `box-shape`.

**NEXT — the prompt is `prompts/2026-08-31-media-element-waves-5-7.md`; read it first.**
Wave 5 = wire `sgs/media` THEN `before-after`, **never parallel** (falsification test =
`git diff --stat` shows no file outside `src/components/Media*` +
`includes/helpers-media-element.php`). Then 6 (inspector-scan rules, advisory) → 7 (remaining
surfaces, INSERT→VERIFY→GUT per commit).

⚠ **OWED:** `button/render.php`'s two SVG allowlists; the SMIL bypass is REASONED NOT EXECUTED.
⛔ **Nothing in Waves 3-4 is deployed — WAVE 5 CLOSES ON PAINT.** The no-JS autoplay defect is FIXED
and PHP-verified; `reports/visual-diff/media-2026-08-30.md` names the three live cases owed.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.
