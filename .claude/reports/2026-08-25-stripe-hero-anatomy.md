---
doc_type: report
project: small-giants-wp
spec_ref: 38
status: council retraction SUPERSEDED - root cause found and fixed; rig now 0.66% with no systematic bias
last_updated: 2026-08-25
---

# Stripe hero animation — anatomy

**Status: the rig is built and rendering; all seven questions are answered.** Claims are
labelled `read-source` (verified line-by-line against Stripe's bundle) or `rendered` (observed in
the working rig). ⚠ marks what is not established. **Q6 was MEASURED on 2026-08-25 — quote it only
together with the GPU and configuration it was measured on.**

⭐ **Headline: Q7's prior conclusion is REVERSED. No artist-painted palette is required.** Four
hue-adjacent stops — 307 unique colours against Stripe's 82,831 — render as premium through their
machinery. The constraint is hue adjacency, not colour count. Measured, not argued: see Q7.

## PROVENANCE + LICENCE

| Asset | Owner | Status |
|---|---|---|
| GLSL modules 68467 / 56878 / 39798 / 98230 / 46342 / 26850 | Stripe, all rights reserved | Study only, in `.claude/scratch/` (gitignored). Deleted at Gate E. **Described here, never reproduced — TRUE ONLY SINCE 2026-08-26 (D792).** ⛔ This row asserted that while the document contained two verbatim shader excerpts (Q3, Q4c) and two inline expressions. An adversarial council found them; they are now redacted in place. The lesson: **this file is tracked in `reports/`, which is permanent — a self-certification of cleanliness is worthless unless something actually greps the file it certifies.** A `check-no-third-party-glsl` gate now does. |
| `palette.png` ×2 + `billing_hero_palette.png` | Stripe / Contentful CDN | Study only. Measured statistically; **not reproduced here.** Deleted at Gate E. |
| three.js r179 | MIT | Vendored to scratch only, per **D783**. Deleted at Gate E. |

- **Source:** `b.stripecdn.com/…/chunks/68654-0ccff603146a8ff7.js`; three.js at `…/55369f66-92e84f6aba0a73a8.js`
- **Snapshot:** 2026-08-25. ⚠ Chunk filenames are content-hashed — these URLs 404 after Stripe's
  next deploy, and nothing here is re-checkable once they do.
- ⛔ **This scratch tree is EXEMPT from the `scratch/` → `reports/` promotion rule**
  (`.claude/CLAUDE.md:47`). `reports/` is tracked forever; nothing from that tree promotes into it.

---

## ⛔ Two method warnings, both earned the hard way in this session

**1. A declaration is not a behaviour.** The first version of this analysis was built from a
`uniform` census and was wrong in four places.

| Symbol | Declared | Actually used |
|---|---|---|
| `attribute vec3 tangent` | both vertex shaders, line 1 | **never read**; geometry never calls `setAttribute("tangent")` |
| `varying vec3 v_tangent` | fragment 98230, line 6 | **never written** by any vertex shader |
| `uniform sampler2D u_lutTexture` | both wave fragments | **0** samples, **0** `.value=` assignments |
| `uniform sampler2D u_blueNoiseTexture` | both wave fragments | same — its job is done procedurally instead (see Q4) |
| `uniform vec2 u_mousePosition` | both wave fragments | updated per frame, but its only shader use is commented out beside `// TODO(weston): implement hover effect` |

**Stripe's hero is not pointer-reactive and applies no LUT.**

**2. An inventory is only as good as its independent check.** This report said "five GLSL modules"
for several hours. There are **six**. The sixth is the entire post-processing pass, and it was
invisible because it is single-quoted in the bundle while the others are double-quoted. A second
attempt, accepting both quote styles with one character class, found **one** — a double-quoted GLSL
string containing an apostrophe ended the match early. Only counting the `e.exports=` wrappers
independently exposed either failure. Both intermediate results looked complete.

---

## The pipeline — two passes, not one

```
PASS 1  wave  ->  framebuffer
  geometry : PlaneGeometry(400, 400, 128, 256) = 33,153 vertices, CPU-folded once
  vertex   : 68467
  fragment : 39798 (light / live)   |  98230 (dark)
  camera   : OrthographicCamera(0,0,0,0, 1, 1e4), frustum from canvas size, position z = 5000

PASS 2  framebuffer  ->  screen
  vertex   : 46342   fullscreen, no matrices
  fragment : 26850   angular blur (height-masked) + grain
```

**Which shaders ship.** The bundle imports one vertex shader and both wave fragments, choosing at
runtime: `super({..."dark"===e ? T : k, ...})`, where `T = {vertexShader:h(), fragmentShader:p()}`
(dark) and `k = {vertexShader:h(), fragmentShader:d(), blending:…, blendSrc:…}` (light, **plus
custom blending**). In that scope `h()`=68467, `d()`=39798, `p()`=98230. stripe.com/gb is a light
page, so **the live hero is 68467 + 39798**.

**three.js is r179**, pinned by measurement not guess: `USE_REVERSEDEPTHBUF` is present in Stripe's
build and absent from 0.180–0.183; and the 126-literal `prefixVertex` array hashes
`d3022fe1ad29` in both Stripe's chunk and three@0.179.0, versus `d81ba06f15ba` for 180–183. The
vendored library then self-reports `REVISION: 179`.

---

## Q1 — What geometry? How many vertices?

**A subdivided flat plane, folded once on the CPU.** Not a ribbon, not a tube, not a quad.

- `PlaneGeometry(400, 400, 128, 256)` → **(128+1) × (256+1) = 33,153 vertices**.
- Built in a **Web Worker** (`waveGeometry.worker.`) with a synchronous fallback.
- Attributes supplied: `position`, `uv`, `normal`. **No `tangent`.**
- The fold: a per-vertex "fold power" `4 − 2·ease(uv.y, 9.5)`, then local X is split into three
  bands (`x < −16`, `−16 ≤ x < 16`, `x ≥ 16`) which are cosine-warped and re-angled differently to
  produce the curl; then `x += width/4` and two 90° rotations (about X, then Y).
- ⚠ This is a **one-time CPU deformation**. The per-frame motion is separate, in the vertex shader,
  on top of this fixed base.

## Q2 — How is the shape produced?

⛔ **THIS ANSWER WAS WRONG AND IS CORRECTED. It cited the DARK shader for the LIVE hero.**

An earlier version said the edge comes from `mix(u_clearColor, color.rgb, a * (1.0 - depthFade))`
with `depthFade` from `v_clipPosition.z`. **That code exists only in `98230.glsl` — the dark-theme
fragment.** Verified by grep on the live light fragment `39798.glsl`: `depthFade` 0 occurrences,
`mix(u_clearColor` 0, `v_clipPosition.` 0. The live light shader ends by adding a small constant fraction of an inverted
derivative term to the colour and clamping to 0–1 — **no depth fade at all.**

**What is actually established:** the palette PNG is RGB with no alpha channel (verified with PIL),
so the shape does not come from a palette mask. The light material sets **custom blending**
(`blending` / `blendEquation` / `blendSrc` / `blendDst`) which the dark one does not, and that is
the prime candidate for how its edge composites — ⚠ **but this is UNVERIFIED.** An attempt to
capture the live GL blend state produced `(SRC_COLOR, ZERO, SRC_COLOR, ZERO)`; applying it to the
rig made the diff **six times worse** (2.59% → 14.95%) and was reverted. That capture is not
trustworthy: its state variable was shared across every WebGL context on the page, and it reported
identical blend state for the wave draw and the fullscreen quad, which cannot both be true.

**The light hero's edge mechanism is therefore an OPEN QUESTION.** This is the single most
dangerous item in this report for a follow-on session: the previous answer was real Stripe code
from the wrong theme, and implementing it would reproduce a mechanism the live effect does not use.

## Q3 — How is the palette sampled?

**Directly by the surface's own UV coordinates**, then graded:

> ⛔ **REDACTED 2026-08-26 (D792).** A verbatim four-line shader excerpt stood here. This file is
> tracked in `reports/`, which is permanent, and this report's own PROVENANCE table promises
> "described here, never reproduced" — so the excerpt contradicted the document containing it.
> Described instead, which is all a reimplementation needs:

The palette texture is sampled once at the fragment's own interpolated UV — both components taken
directly, with no transformation of the coordinate. The sampled colour then passes through a
three-step grading chain in this order: **contrast about mid-grey → desaturation toward luminance →
hue rotation**, each driven by its own uniform.

**The shader constructs no colour whatsoever.** ⭐ This is the largest single difference from
FR-38-31, which computes colour arithmetically by blending four stops per vertex. On the live light
preset the grading is nearly identity (`colorContrast 1`, `colorSaturation 1`,
`colorHueShift −0.0016`) — so what you see is very close to the painting itself.

## Q4 — What produces the fine striations?

**Three mechanisms, and the third is the one nobody would guess.**

**(a) Live light path — 39798, high-frequency simplex noise.** `freq = 600.0` — roughly 600 cycles
across U against ~4 across V, giving fine vertical combing, with the frequency *itself* modulated by
a lower-frequency noise so the striations wander instead of being regular. Gated by a `dFdy`-derived
glow ramp (`glowAmount 1.98`, `glowPower 0.806`, `glowRamp 0.834`) and a parabola falloff.
⚠ `u_numNoiseBands` defaults to **0** and `USE_NOISE_BANDS` is only defined when a band is added at
runtime, so the band machinery is dormant and the hard-coded `strength 0.2 / freq 600 /
colorAttenuation 0.9 / parabolaPower 3` are what actually run.

**(b) Dark path — 98230, derivative-antialiased periodic lines.** A rectified sine of the U
coordinate scaled by a large line count, with the line THICKNESS derived from the screen-space
derivative of that coordinate scaled by a large constant and raised to a power
(`u_maxWidth = 1232`, `lineAmount 425`). The screen-space derivative is what stops the stripes crawling: where the surface
turns away, the lines thicken and fade rather than aliasing into moiré. On the light preset
`lineAmount` is **1**, i.e. this path is effectively off — consistent with the light fragment not
using it at all.

**(c) ⭐ A full-screen post-process — angular blur plus grain.** This was missed entirely on first
pass and is likely a large part of why the result reads as photographic:

> ⛔ **REDACTED 2026-08-26 (D792)** — same reason as the excerpt in Q3. Described instead:

The pass samples the rendered scene through an angular blur, then computes a **vertical band mask**
as the difference of two smoothstep ramps over the V coordinate — one rising through the lower
portion, one rising through the upper — so the mask peaks across a horizontal band and falls off
above and below it. Blurred and sharp are mixed by that mask, and grain is applied to the result.

`blurAngular` spins the sample coordinate about the canvas centre — 6 samples, `blurAmount 0.02` —
and `blurPower` is a **vertical band mask**, so the image is sharp through a horizontal band and
progressively blurred above and below it. That is a depth-of-field cue done in screen space.

`grain` (`grainAmount 1.1`) is, in substance, **a dither**: it shifts each pixel by about ±4/255 per
channel from a hash of the fragment coordinate. ⭐ **This is what keeps a large, subtle gradient from
posterising into visible 8-bit bands** — and it is why `u_blueNoiseTexture` is dead weight: the same
job is done procedurally, for free.

`u_diffuseBlur` defaults to 0, so the heavier gaussian path is off.

## Q5 — What is animated?

**Only `u_time`**, throttled to every second frame (`frameInterval = 2`), with an `introTimeRamp`
easing 0→1 in 0.016 steps for a slow-motion start. Everything else — mesh transform, all
`materialProps`, `u_resolution` — is set once at load / resize / config-change. (`u_mousePosition`
is also written per frame but never read.)

Live light preset: `speed 4e-5`, `timeOffset 17500`, `displaceAmount −7.821`,
`displaceFrequency X 0.005831 / Z 0.016001`, `twistPower 3.63 / 0.7 / 3.95`,
`twistFrequency −0.65 / 0.41 / −0.58`; mesh at `(380, −301.7, −11.1)`, rotation
`(−0.4496, −0.1176, 1.8744)`, scale `(9, 8, 5)`; camera at `(100, ~0, 5000)`, zoom 1, looking at origin.

## Q6 — Per-frame cost

✅ **MEASURED 2026-08-25.** Harness: `.claude/scratch/stripe-hero-poc/perf/measure-frame-cost.mjs`,
raw data `perf/frame-cost.json`. Primary metric is the **GPU timer query**
(`EXT_disjoint_timer_query_webgl2`, median of 60 samples), corroborated by an independent batched
wall-clock leg. **Both controls pass and the two methods agree** — see "Why these numbers are
trustworthy" below.

**Configuration the numbers belong to** (a figure without this is not a measurement):
NVIDIA RTX 2060, ANGLE/D3D11, Chromium 147.0.7727.15, canvas 1393×761 CSS px, ⭐ **GPU blocklist
NOT bypassed** — the rig's own capability gate returns `supported: true` on this machine, so this
is a configuration Stripe would actually serve.

| Config | Backing store | MP | GPU ms/frame | ms/MP |
|---|---|---|---|---|
| **Stripe rig — both passes, DPR 1** | 1393×761 | 1.06 | **0.373** | 0.354 |
| **Stripe rig — both passes, DPR 2** | 2786×1522 | 4.24 | **1.135** | 0.266 |
| Stripe rig — wave pass only, DPR 1 | 1393×761 | 1.06 | 0.113 | 0.108 |
| Stripe rig — wave pass only, DPR 2 | 2786×1522 | 4.24 | 0.367 | 0.085 |
| **FR-38-31 as shipped, DPR 1** | 1393×761 | 1.06 | **0.040** | 0.037 |
| FR-38-31 as shipped, DPR 2 → capped 1.5 | 2090×1142 | 2.39 | 0.070 | 0.029 |
| NEGATIVE CONTROL — `glClear` only | 1393×761 | 1.06 | 0.004 | 0.004 |

### ⭐ The three findings, in order of consequence

**1. The post-process pass is ~70% of the total cost.** 0.261ms of 0.373ms at DPR 1 (0.767 of
1.135 at DPR 2 — the share is stable at 68–70% across both). **The blur-and-grain second pass
costs 2.3× the wave render it post-processes.** Spec 38 §1.2b names multi-pass/framebuffers as
the trigger to reopen D479 decision 2 (the OGL question); that decision was being argued with no
number behind it. This is the number, and the second pass is the expensive half — not a
10-line add-on.

**2. Stripe's effect costs 9.4× our shipped FR-38-31** at identical pixel count (0.373 vs 0.040ms).
But in absolute terms 0.373ms is ~2% of a 16.7ms frame budget. **Relatively expensive, absolutely
cheap — on this GPU.** Both halves of that sentence are load-bearing.

**3. DPR 2 costs 3.0× DPR 1 for 4× the pixels** — sub-linear, so there is a fixed per-frame cost
independent of resolution. Note FR-38-31's own `resize()` clamps DPR to 1.5, so its "DPR 2" column
is 2.39MP not 4.24MP; the ms/MP column is what makes the comparison size-independent.

### Live-loop behaviour (measured while the module's own rAF loop was running)

`frameInterval = 2` is now **confirmed empirically rather than read from source**: 601 rAF ticks
produced 602 GL draw calls at 2 calls per drawn frame = **301 drawn frames**, and the `?nopost`
config produced 301 calls at 1 per frame. Zero-to-one frames over 20ms in a 6-second window.
⚠ The display on this machine runs at **100Hz**, not 60 — so "every 2nd frame" is ~50 drawn fps
here, not 30.

### Why these numbers are trustworthy — and the two instruments that failed first

| Control | Result |
|---|---|
| **Negative** — a `glClear`-only page must cost far less than the real effect | **PASS**, 88× cheaper (0.004 vs 0.373ms) |
| **Positive** — DPR 2 must cost measurably more on a fillrate-bound effect | **PASS**, 3.04× |
| **Method agreement** — GPU timer vs batched wall-clock | **PASS**, ratios 0.75–1.23 on the real configs |

⛔ **Two instrument failures, both caught only by the controls.**

1. **Per-draw wall-clock timing returned 0.00ms for EVERYTHING — including the negative control.**
   Chrome clamps `performance.now()` to 100µs, and real frame times here are 0.04–1.1ms, at or
   below the clock's resolution. Had the controls not been run, "0.00ms per frame" would have
   looked like a triumphant result rather than a dead instrument.
2. ⭐ **`gl.finish()` is not a stall on this stack.** After batching fixed the clock-resolution
   problem, wall-clock still read 0.015ms against the GPU timer's 0.375ms — a 25× disagreement.
   Under ANGLE/D3D11 `finish()` flushes the command queue rather than blocking until completion.
   A 1×1 `readPixels()` — a genuine synchronous read-back — is what forces the GPU to finish, and
   with it the two methods converge. **A timing loop that does not truly stall measures how fast
   JS can queue work, not how long the GPU takes to do it.**

### ⚠ What this does NOT establish

- **n=1 on the GPU axis**, which is the axis Stripe's own gating says matters most. An RTX 2060 is
  a strong desktop GPU. Their blocklist and `failIfMajorPerformanceCaveat` exist precisely because
  this effect gets expensive on weak hardware — see below.
- One browser, one driver (ANGLE/D3D11), one OS, one display refresh rate.
- Nothing about CPU-side cost of the one-time geometry fold, which runs on a worker at load.

Structurally, for context: 33,153 vertices, **two passes** (wave → framebuffer → post), 6 texture
samples per pixel in the blur, DPR capped at 2. The geometry fold is one-time CPU work on a
worker, not per-frame.

Their own gating is the strongest available signal that this is expensive: the animation requires
WebGL2 with `EXT_color_buffer_float`, requests `powerPreference: "high-performance"` **and**
`failIfMajorPerformanceCaveat: true`, pattern-matches the GPU string against a blocklist, and
declines outright on a range of mobile chips — falling back to `wave-fallback-{desktop,tablet,mobile}.png`.

⚠ **Correction to an earlier claim on the record:** it was previously suggested Stripe uses a
*cheap* technique for mobile reliability. That is false. The effect is expensive and is gated so
that it **refuses to run** rather than running badly.

## Q7 — What could we reproduce with our own assets?

⭐ **ANSWERED BY MEASUREMENT, AND THE ANSWER REVERSES THE PRIOR CONCLUSION.**

The prior session concluded: *"Four colour stops cannot structurally reproduce an artist-painted
image's variation."* That was reasoned from the palette's statistics. **Rendered, it is false.**

### The experiment

The rig was built with Stripe's real shaders, geometry, camera and post-process, then the palette
texture — and ONLY the palette texture — was swapped, one variable at a time, all at the same
viewport and the same frozen frame.

| Palette | Unique colours in source | Rendered result |
|---|---|---|
| Stripe `palette-a.png` (their artwork) | 82,831 | the reference |
| `sub-4stop` — 4 brand stops, blue→orange→pink→violet | **703** | premium — but a visible **grey band** where blue meets orange |
| `sub-4warm` — 4 stops, hue-adjacent peach→coral→pink→violet | **307** | ⭐ **clean, and reads as expensive.** No grey band. |

### What that proves

1. **The "expensive" quality is in the MACHINERY, not the artwork.** A 307-unique-colour palette —
   270× fewer colours than Stripe's — rendered through their folded geometry, striations, depth
   fade, grain and blur, looks premium. The artwork is not what makes it look costly.
2. **The palette's real job is to avoid muddy transitions.** Four *complementary* stops
   (blue↔orange) produced a grey band, because interpolating complements in RGB passes through
   grey. Four *adjacent* stops did not. Stripe's palette is nearly all adjacent warm hues, which is
   very likely why it works — not the 82,831 colours.
3. **The colour count is a symptom, not the cause.** Rendered through the shader the 4-stop palette
   yielded ~27,000 unique colours in the hero region anyway, because the grain and blur ADD
   variation. Counting colours in the source image measured the wrong thing.

⚠ This is a strong result but a single-operator visual judgement on a static frame. It has not been
Bean-reviewed (R-31-13) and no council has attacked it yet.

### Per-mechanism verdict

| Mechanism | Verdict | Basis |
|---|---|---|
| Folded plane geometry | **REPRODUCIBLE-IN-CODE** | Transcribed and rendering correctly in the rig |
| Twist + displace | **REPRODUCIBLE-IN-CODE** | Every live uniform value recovered and in use |
| Simplex striations (freq 600) | **REPRODUCIBLE-IN-CODE** | Rendering; we already ship simplex noise |
| Derivative-antialiased lines | **REPRODUCIBLE-IN-CODE** | 3 lines of GLSL; `dFdy` is core WebGL2 |
| Depth fade to page colour | **REPRODUCIBLE-IN-CODE** | One `mix()` |
| ⭐ Grain / dither | **REPRODUCIBLE-IN-CODE — 5 lines, no asset** | Rendering in the rig |
| Height-masked angular blur | **REPRODUCIBLE-IN-CODE** | 10 lines, needs a framebuffer + second pass |
| ⭐ **Palette artwork** | ⭐ **NOT NEEDED — 4 hue-adjacent stops suffice** | **Measured, not argued** |
| LUT / blue noise / pointer | **N/A** | Do not exist — dead declarations |

**No artist is required.** The constraint is hue adjacency, which is a design rule, not an asset.

---

## What this says about FR-38-31

Ours and theirs differ on six axes. Only one is structural, and the cheapest fixes are the biggest.

| # | Difference | Cost to close |
|---|---|---|
| 1 | ⭐ **No dither at all.** Verified: `grep -icE 'dither\|grain\|random\|hash'` over `wave-gradient.js` returns **0**. Stripe shifts every pixel ±4/255. At 8-bit output a large subtle gradient bands without it. | ~5 lines |
| 2 | ⭐ **`precision mediump float`** in our fragment shader, where Stripe uses `highp`. On a smooth gradient mediump can step visibly. | one word |
| 3 | **No fine detail field.** They have striations; our fragment shader is 5 lines and emits the interpolated vertex colour unmodified. | ~15 lines |
| 4 | **Hue choice, not stop count.** Our four stops are fine *if* adjacent. Widely-spaced saturated hues are what produce mud. | design rule |
| 5 | **Ground.** Theirs is bright colour on white; ours was near-black navy. | attribute default |
| 6 | **Form.** Theirs is a bounded shape dissolving by depth; ours is a full-bleed wash. | geometry + one `mix()` |

⚠ **Not yet measured:** whether FR-38-31 currently bands visibly on a real screen. That is a
one-screenshot check and it should be done before any of this is designed around — items 1 and 2 are
predicted fixes for a defect that has been *reasoned*, not *observed*.

---

## Build state — QA GATE B PASSED (2026-08-25)

`index.html` reproduces Stripe's hero. **Measured, not asserted.**

### The gate

Comparing two animated canvases at different moments compares nothing, so the rig accepts an
absolute `u_time`. `gate-b.mjs` captures the live hero's `u_time` by hooking `uniform1f`, freezes
its rAF, screenshots it, then renders the rig at that **same** `u_time` and diffs.

| Region | Result |
|---|---|
| Text-free ribbon crop (1150,100)–(1420,600) | **mean 6.61/255 = 2.6%** — under the 5% Gate B ceiling |
| Same crop, before the colour-space fix | 25.69/255 = 10.1% |

Residual 2.6% is the grain (random per pixel by design), the palette being served as WebP q95 to
the live page against the PNG re-encode used locally, and sub-pixel timing.

### ⛔ Five divergences I introduced, and the correction that mattered

An earlier pass called the rig "close in character" and moved on. That was wrong: the brief was
exact replication, and "close in character" is the phrasing that lets a real defect through.
Every input was then checked against the live page rather than against my assumptions.

| # | My rig had | Stripe has | Effect |
|---|---|---|---|
| 1 | ⭐ palette texture untagged | effectively sRGB-tagged | **the whole washed-out look** — 10.1% → 2.6% |
| 2 | `u_opaque: 1` (guessed) | `u_opaque: 0` (captured live) | forced alpha to 1, so the transparent clear rendered BLACK |
| 3 | opaque white clear (a *workaround* for #2) | `setClearColor(clearColor, 0)` | masked #2 instead of fixing it |
| 4 | `WebGLRenderTarget(w,h,{type:HalfFloatType,…})` | `new WebGLRenderTarget(w,h)` — no options | 16-bit float removed the 8-bit quantisation the grain exists to dither |
| 5 | `OrthographicCamera(-1,1,1,-1,0,1)` | `new OrthographicCamera()` | post-pass camera mismatch |

⛔ **#3 is the one worth remembering.** The black background had a cause (`u_opaque`), and I
"fixed" it by clearing to opaque white — which made the symptom disappear while leaving the wrong
value in place and changing how the blur composited at the ribbon's edges. A workaround that hides
its own cause is worse than the bug.

⚠ **#1's mechanism is not fully explained.** Stripe's loader sets only `wrapS`/`wrapT`, exactly as
mine did, yet their result is correctly saturated. Marking the texture sRGB is what reproduces
their output — that is measured. *Why* their path yields an sRGB-tagged texture is not established,
and is recorded as unresolved rather than guessed at.

### Confirmed by live capture, not inferred

Hooking `getUniformLocation` to build a location→name map, then every `uniform*` setter:

- **The live preset is `gj`** — `colorSaturation 1`, `colorContrast 1`, `colorHueShift −0.00159`,
  and every twist/displace/glow value matching. The `colorSaturation 1.383` preset is NOT in use.
  This closed the recovery report's UNRECOVERED item about which preset variant ships.
- `u_grainAmount 1.1`, `u_opaque 0`, `u_blurAmount 0.02`, `u_blurSamples 6`, `u_diffuseBlur 0`.
- **`modelViewMatrix` matches to 1.8e-4 and `projectionMatrix` to 4.2e-7** — camera, mesh transform
  and projection are exact, which is what ruled composition out as the cause of the difference.
- The live page requests the palette I used (`5DrmXrFYpKk43Kj0I1MXQr`), as WebP q95.
- ⭐ **`u_lineAmount`, `u_maxWidth`, `u_clearColor`, `u_lutTexture` and `u_blueNoiseTexture` never
  appear in the capture** — the compiler stripped them as unused. A third independent confirmation
  that they are dead.

### Q7 re-verified on the corrected rig

The palette-substitution experiment originally ran on the rig *with* those five defects, so its
conclusion was re-tested after the fixes. **It holds:** four hue-adjacent stops still render as
premium, now correctly saturated. The finding does not depend on the bug.

### Still outstanding

The raw-WebGL2 port and the two remaining councils. (The performance trace was run on 2026-08-25 —
Q6 now carries a figure.)

### Instrument failures worth carrying forward

- ⛔ **A canvas probe using `drawImage` reported "nothing rendered" for a rig that was rendering
  correctly.** Without `preserveDrawingBuffer` the WebGL drawing buffer is cleared after
  compositing, so a later read returns empty — indistinguishable from a broken shader. Three
  debugging steps went into working code before the screenshot on disk was opened. **Measure the
  rendered output, never the drawing buffer.**
- ⛔ **A generator failed on a wrong working directory and the screenshot tool ran anyway**,
  producing a plausible PNG for a palette that never existed. Deleted and re-run.
- ⛔ **Comparing two animated canvases at different `u_time` values** made a composition
  "difference" appear that did not exist. Freeze both to the same frame before diffing anything.
- ⚠ An anchor heuristic written as a keyword blocklist **overmatched** and silently absorbed 25
  bytes of shader source into a "preamble". Replaced with a uniqueness test, which cannot
  overmatch because ambiguity is itself the disqualifier.

---

# ⛔ COUNCIL RETRACTION — the Gate B claim is withdrawn

A four-seat adversarial council attacked the claim *"Gate B passes at 2.6% mean pixel difference;
the rig reproduces Stripe's hero."* Every measurable finding was re-derived against the artefacts
before being accepted. **The claim does not survive. It is withdrawn.**

## What the claim should have said

> The rig reproduces Stripe's hero **structurally** — geometry, striations, grain, blur and palette
> handling are the real recovered mechanisms and they render. It has a **measured, systematic,
> unexplained colour deficit**, and it has been tested in exactly one configuration.

## The four findings that killed the original claim

**1. The residual is a systematic bias, not grain — my stated cause was wrong.**
Signed mean (rig − live) across the crop: **R −1.91, G −9.50, B −7.66**, against an absolute mean
of 6.61. **Bias/abs ratio = 0.96** — 96% of the residual is directional error, not zero-mean noise.
Grain is decorrelated by construction, so it cannot be the cause. All three causes the report gave
are now refuted: grain (refuted above); WebP-vs-PNG palette (measured: 0.89/255 abs, an order of
magnitude too small); sub-pixel timing (cannot produce a directional per-channel bias).
**The cause is unknown.** `premultipliedAlpha:false` improves it slightly (6.75→6.29); marking the
render target sRGB does nothing.

**2. The mean concealed a heavy tail.** Only **25.0%** of pixels are within 8/255 on all channels.
93.3% within 16/255, 98.0% within 32/255, but the worst single-channel error is **137/255**.
"Near-indistinguishable" was not a defensible reading of that distribution.

**3. The crop reasoning was wrong — in my favour, which is not an excuse.** The report implies the
wide crop scored worse because Stripe's text overlaid it. Measured: wide crop **9.24%**, narrow
crop pre-fix **10.07%**. The narrow crop is the *harsher* test. The stated reasoning was wrong even
though the choice was not self-serving. It also, per the council, avoids the ribbon's silhouette
edges entirely — the exact region where a blend-mode difference would show.

**4. The fix was selected and graded on the same single frame.** `cs-sweep.mjs` chose `cs=tex`
by comparing against one live capture; Gate B then scored that same variant against that same
capture. **No held-out frame, time, viewport or machine.** That is circular, and it is why the
2.6% cannot be read as a generalisation.

## Also confirmed

| Finding | Status |
|---|---|
| The comparator that produced 2.6% / 10.1% was never committed — run ad hoc, now gone | CONFIRMED. `gate-b.mjs` only captures screenshots. Recomputed here in `verify-council.py`. |
| Custom blending is documented in this report and **not implemented** in the rig | CONFIRMED — and an attempt to fix it made things 6× worse (see Q2) |
| `frameInterval = 2` and `introTimeRamp` are described in Q5 and absent from the rig | CONFIRMED — the rig's loop advances `u_time` every frame with no ramp |
| n=1 on every axis: one frame, one viewport (1440×900), one DPR (1), one browser, one GPU, one theme | CONFIRMED across all seven scripts |
| The 5% ceiling has no derivation and no precedent elsewhere in this project | CONFIRMED — it is self-set for this study; say so |
| Gate B ran with `--ignore-gpu-blocklist`, bypassing the very gate Stripe uses to decide who sees this effect | CONFIRMED |
| This report promises `read-source` / `rendered` labels per claim and never applies them | CONFIRMED |
| Q7's headline ("no artist needed") was tested through **Stripe's** machinery — three.js, two-pass framebuffer, 6-tap blur — none of which the follow-on session is allowed to use | CONFIRMED. The narrow claim (*hue-adjacent stops avoid the grey band*) stands; the general claim does not. |
| n=2 palettes were promoted into a law about adjacency-vs-count; no stop-count sweep at fixed adjacency was ever run | CONFIRMED |
| `wave-gradient.js`'s docblock still claims lineage to "the original vertex shader used by stripe", i.e. the *discontinued* hero | CONFIRMED — stale provenance in shipped code |

## Refuted or overstated by the council

- **"An achromatic grey fringe at the ribbon silhouette."** REFUTED. Measured rig chroma at the
  sampled edge is 89–148, not ~0. It does corroborate a *global* saturation deficit (live chroma
  175–210 at the same points), which is finding 1.
- **"Worst pixel 89/255."** Understated — the real worst is 137/255.
- **"A 1% ceiling elsewhere in the report."** Not present; that came from my own prompt, and the
  seat correctly declined to assert it.

## What must happen before anyone trusts a fidelity number here

1. Commit the comparator as code — metric, crop, tolerance — so the number is reproducible.
2. Find the directional colour bias, or state plainly that it is unexplained.
3. Re-validate on a **held-out** frame, viewport and DPR that were not used to select any fix.
4. Report the distribution, not just the mean.
5. Resolve the light-theme edge mechanism (Q2) — it is currently an open question, not an answer.


---

# ✅ RESOLVED — the council's top two findings are fixed, and the cause was a compensating error

The retraction above stands as the record of what was wrong. This section supersedes its
conclusion, because the root cause was subsequently found and fixed.

## What the council was right about

It could not rule out that the sRGB colour-space fix was "a compensating error that happens to
cancel at this frame". **It was exactly that.**

## The experiment that settled it

Two binary factors had only ever been tested in three of four combinations. Completing the 2x2,
all at the same frozen `u_time`, same viewport, same crop:

| palette sRGB tag | blend state | mean diff | signed bias R/G/B |
|---|---|---|---|
| **none (= Stripe)** | **live (= Stripe)** | **0.66%** | **+0.02 / −0.30 / −0.45** |
| tex | three.js default | 2.65% | −1.9 / −9.6 / −7.8 |
| none | three.js default | 10.11% | +1.6 / +37.5 / +34.9 |
| tex | live | 14.95% | −5.8 / −58.8 / −49.4 |

**Both-wrong scored better than either-one-right.** The sRGB tag was brightening the output to
compensate for a missing blend operation that darkens it. That is precisely the "two overlapping
fixes are unfalsifiable" trap — and it is what a single-factor sweep cannot see.

## How the true blend state was recovered

The first capture was untrustworthy: its state variable was **per-prototype**, so it was shared
across every WebGL context on stripe.com. Re-keyed on the context instance via a `WeakMap`:

```
hero canvas, wave draw (196,608 indices):  blend ENABLED,
  blendFuncSeparate(768, 0, 768, 0)  = (SRC_COLOR, ZERO, SRC_COLOR, ZERO)  -> src is SQUARED
  blendEquationSeparate(FUNC_ADD, FUNC_ADD)
hero canvas, post quad (6 indices):        blend DISABLED
```

The old bug's signature was reporting *identical* state for those two draws, which cannot be true.

⭐ **The rig's own GL calls were then captured with the same tool and confirmed to match live
numerically on both draws BEFORE the image was judged.** The previous attempt applied a blend
change and assessed it by the picture alone — which is how it drew the wrong conclusion.

## Result

| Metric | Council-era | Now |
|---|---|---|
| Mean difference | 2.59% | **0.66%** |
| Bias / abs ratio (1.0 = pure systematic) | **0.96** | **0.15** |
| Pixels within 8/255, all channels | 25.0% | **95.2%** |
| Within 4/255 | 18.0% | 84.1% |
| Worst single channel | 137/255 | 124/255 |

The residual is now noise-shaped rather than systematic — so the original "it's grain" attribution
is finally true, but only because the real defect was removed. It was not true when first claimed.

## Also fixed (motion + config)

- `frameInterval = 2` — draws every 2nd frame, as Stripe does
- `introTimeRamp` — 0 → 1 in 0.016 steps per drawn frame, multiplying elapsed time
- `failIfMajorPerformanceCaveat: true` on the renderer

⛔ The ramp applies to the live loop only. `window.__drawAt` stays deterministic, verified by the
frozen frame being **byte-identical** to the reference — so every measurement above remains
comparable.

## Still open

Unchanged from the retraction: **n=1 on every axis** (one viewport, one DPR, one browser, one GPU,
one theme, one frame). The 0.66% is one sample. The 5% ceiling remains self-set and underived, and
a held-out frame has still not been used to validate. (Q6 was answered later the same day — see the
Q6 section. It is no longer open.)

---

# ⛔ THE BANDING PREMISE IS REFUTED — items 1 and 2 of the six differences are withdrawn

The report recommended adding a dither and raising `mediump` to `highp`, starred as the cheapest
and biggest wins, while admitting the premise had never been checked. **It has now been checked,
and it is false.**

## Method

`fr3831-banding.html` renders the SHIPPED `wave-gradient.js` with its OWN shipped default colours
(`--sgs-wave-base: #1b2a4a`, `--sgs-wave-1: #3f7fd1`, `--sgs-wave-2: #7b4bd8`,
`--sgs-wave-3: #d95f8a`), one deterministic frame, no rAF. `measure-banding.py` then walks five
horizontal scanlines and measures run-lengths of byte-identical pixels — the signature of 8-bit
quantisation into flat steps — with a ±4/255 ordered dither applied to the same image as control.

## Result

| | max run | mean run | distinct colours / line |
|---|---|---|---|
| FR-38-31 as shipped | 20 | **1.19** | 1,034 |
| Same image + ±4/255 dither (control) | 1 | 1.00 | 1,192 |

A mean run of **1.19** means almost every pixel already differs from its neighbour. There are no
flat bands. **There is nothing for a dither to fix.**

## What is actually wrong with it, from looking at the render

The rejected effect renders as a **dark, saturated, repetitive field of undulating ridges with
specular-looking highlights, full-bleed, on a near-black navy ground.** That reads as rendered 3D
geometry — which is exactly the "B-movie 3D VFX from the early 2000s" verdict. The defect is
**form and ground**, not colour depth.

## Corrected difference list

| # | Difference | Status |
|---|---|---|
| ~~1~~ | ~~No dither~~ | **WITHDRAWN — measured, no banding exists** |
| ~~2~~ | ~~`precision mediump float`~~ | **WITHDRAWN — same premise, unsupported** |
| 1 | **Ground** — near-black navy vs bright colour on white | real, cheap |
| 2 | **Form** — full-bleed repetitive wash vs a bounded shape that dissolves by depth | real, the biggest one |
| 3 | **Colour source** — four interpolated stops vs a sampled painted texture | real, structural |
| 4 | **No fine detail field** — theirs has striations, ours has none | real |
| 5 | **Hue choice** — widely-spaced saturated hues on dark, vs adjacent hues on light | real, design rule |

⚠ **This is why the premise mattered.** Had it gone unchecked, the follow-on session would have
spent its first effort adding a dither to fix a defect that does not exist, and left the actual
problem — a repetitive full-bleed dark wash — untouched.


---

# ✅ ALL 26 MECHANISMS IMPLEMENTED — 0 gaps, QC 10/10

Six SDD tasks closed the divergence list. The light render stayed **byte-identical to the
reference through every one of them**, so the measured 0.66% fidelity never moved.

| Mechanism | How |
|---|---|
| every-2nd-frame throttle, intro ramp, `failIfMajorPerformanceCaveat` | Task 3 |
| Dark-theme path (fragment 98230 + preset `QR`), per-frame `u_mousePosition` | Task 4 |
| Capability gate + 47-entry GPU blocklist + `__disableWebGL` + dark/coarse-pointer gate | Task 5 |
| Static `<picture>` fallback + 639/1263 breakpoint tiers | Task 6 |

⭐ **Q4(b) is now `rendered`, not `read-source`.** The dark path makes the
derivative-antialiased line field visible — fine striations that thicken and fade as the surface
turns away, exactly as the shader predicts.

## Two corrections worth keeping

**The fallback's hide mechanism was right-look-wrong-means.** An implementer hid the static
`<picture>` with `display: none`, flagged honestly as its own addition and unconfirmed by the
recovery. Measured on stripe.com: `display` stays `block`, `visibility` stays `visible`, the
element keeps its full 975px, and it is hidden by **`opacity: 0` with
`transition: opacity 0.25s linear`** — a cross-fade handover, not a removal. Corrected.

**A brief asserted 48 blocklist entries; the source has 47.** The implementer counted
programmatically, refused to pad to match the brief, and flagged the mismatch rather than bending
ground truth to the instruction.

## Known gaps, stated not hidden

- **Per-tier presets for medium/small are unrecovered** — they arrive as page data from outside
  the analysed chunk. A sibling chunk suggests `{wide: gj, medium: P1, small: y7}` but that is
  SUSPECTED, not confirmed for this page. The wide/light preset stands in for all three tiers,
  and the code says so.
- Everything in the earlier retraction still stands: **n=1 on every axis**, no held-out frame,
  and the 5% ceiling is self-set. **Q6 is now MEASURED** (see the Q6 section) — the residual perf
  gap is that it is n=1 on the GPU axis, not that no figure exists.
  ⚠ **Superseded in part** — the held-out-frame and DPR items were closed later the same day; see
  the section immediately below.

---

# ✅ THE FIDELITY NUMBER GENERALISES — the circularity objection is answered

The council's fourth finding was that the fix was **selected and graded on the same single frame**:
`cs-sweep.mjs` chose the winning configuration by comparing against one live capture, and Gate B
then scored that same configuration against that same capture. That objection is now discharged by
measurement, not argument.

## 1. The comparator exists as code — it did not before

⛔ The council confirmed the comparator that produced 2.6% / 10.1% "was never committed — run ad
hoc, now gone". **A fidelity number nobody can re-derive is not a measurement.** It is now
`perf/compare.py`: metric, crop, tolerance and distribution fixed in code, numpy-based, JSON out.

**It was validated against a known answer before being trusted.** Pointed at the recorded winning
cell it returns **0.66%, signed R+0.02 / G−0.30 / B−0.45, bias 0.15, within-8 95.2%, worst 124** —
every figure matching the report's "Now" column exactly. `perf/identify-pairs.py` re-derives all
four cells of the 2×2 to the second decimal.

⛔ **A filename trap worth carrying forward.** The comparator was first pointed at
`blend-live-full.png` as the live reference, on the strength of its name, and returned 14.81% with
a sign-flipped bias. **`blend-live-full.png` is byte-identical to `blend-fixed.png` — it is a RIG
render, not a live capture.** The real live capture is `gateb-live.png`. A session trusting that
filename would compare one rig render against another and report the result as fidelity. The pairs
were recovered by CONTENT, which is the only reliable way. *(Incidentally corroborated in the same
sweep: `FINAL-rig.png` is byte-identical to eleven other captures, independently confirming that
the light render never moved across the six SDD tasks.)*

## 2. Held out on two axes at once — nothing about the rig was changed

`perf/capture-heldout.mjs` captures fresh live/rig pairs at a **new `u_time` the rig was never
tuned against**, at DPR 1 and DPR 2. The rig's configuration was not touched — that is the entire
point of the exercise.

| Frame | DPR | Backing store | Mean | Bias/abs | ≤4/255 | ≤8/255 | Worst |
|---|---|---|---|---|---|---|---|
| Original — the frame the fix was SELECTED on | 1 | 1393×761 | 0.66% | 0.15 | 84.1% | 95.2% | 124 |
| **HELD OUT** — `u_time` 44101.7 | 1 | 1393×761 | **0.67%** | 0.12 | 83.7% | 96.3% | 96 |
| **HELD OUT** — `u_time` 44491.7 | 2 | 2786×1522 | **0.69%** | 0.12 | 82.1% | 96.0% | 117 |

Gate B's tuned frame was `u_time` 44345.4; both held-out captures differ from it, asserted in
`perf/heldout-meta.json` rather than assumed.

**⭐ The number holds: 0.66% → 0.67% → 0.69%.** And the bias/abs ratio *improved* (0.15 → 0.12),
which strengthens rather than weakens the reading that the residual is noise-shaped rather than a
second systematic error hiding behind a lucky frame.

**DPR 2 was the real risk and it passed.** Grain is a fixed ±4/255 in *screen* space and the glow
uses screen-space derivatives, so both are resolution-dependent and there was no reason to assume
the match would survive quadrupling the pixel count. It did.

## 3. The 5% ceiling — stated, not retro-fitted

It has no derivation and no precedent anywhere else in this project. Rather than invent one, it is
now recorded for what it is: **a local convention adopted for this study only.** `compare.py`
prints that caveat with every verdict, so the number cannot be quoted as a project standard by a
future reader. It is not one.

## What is STILL n=1 after this

Honest residual, unchanged by the above:

- **One GPU** (RTX 2060), one driver (ANGLE/D3D11), one browser (Chromium 147), one OS.
- **One theme** — light. The dark path renders but has never been diffed against a live dark capture.
- **One viewport** (1440×900). DPR varied; viewport did not.
- ⚠ A 1px canvas-size difference persists: live measures 1392×760, the rig 1393×761. It does not
  appear to hurt the result, but it is a real sub-pixel offset present in every comparison here.
