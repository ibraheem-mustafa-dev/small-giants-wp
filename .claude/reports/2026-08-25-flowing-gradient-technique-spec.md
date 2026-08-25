---
doc_type: report
project: small-giants-wp
spec_ref: 38
status: reference spec for the FR-38-31 rework — describes mechanisms, reproduces no third-party source
last_updated: 2026-08-25
---

# Flowing-gradient technique — implementation reference

**What this is.** A description, in our own words, of the seven mechanisms that make a
premium-feeling animated gradient hero, precise enough to implement from without opening anyone
else's source. It exists so that the FR-38-31 rework has a durable specification to build against
and the study material it was derived from becomes genuinely disposable.

**What this is not.** It is not a porting guide and it contains no third-party shader source,
no reproduced imagery and no transliterated code. Where a reference implementation's measured
parameter values are useful as calibration they are given as a numeric table — those are observed
facts about a running program, not expression.

## Licence position, stated once

Copyright protects **expression**, not functionality. That is settled law, not an
interpretation: *SAS Institute v World Programming* (CJEU C-406/10, 2012; upheld [2013] EWCA Civ
1482) holds that neither a program's functionality nor its underlying ideas are protected, and
**CDPA 1988 s.50BA** makes observing, studying and testing a program to determine those ideas a
**permitted act that a licence cannot override**.

So the split is:

| | Status |
|---|---|
| Another party's shader source text, and their painted palette artwork | Their expression. Never reproduced, here or anywhere tracked. |
| The mechanisms below — folded geometry, UV-sampled colour, derivative-gated striations, angular blur, hash grain | **Method and functionality. Free to implement.** |
| Measured parameter values | **Observed facts. Not expression.** |

⚠ Not legal advice. But the practical rule this project already follows — *describe, never
reproduce* — is the correct one regardless, and this document follows it.

⭐ **The single most important finding behind this spec:** the premium quality lives in the
MACHINERY, not the artwork. A four-stop palette carrying 307 unique colours renders as expensive
through the mechanisms below, against a reference painting's 82,831. **No artist-painted asset is
required.** The constraint is hue adjacency (§5), which is a design rule and costs nothing.

---

## The seven mechanisms

Ranked by what they contribute per unit of cost. Costs are from the Q6 measurement
(`.claude/reports/2026-08-25-stripe-hero-anatomy.md` §Q6) — RTX 2060, 1.06MP, GPU timer query.

### 1. A subdivided plane, folded once on the CPU

**What it buys:** the *form* — a bounded ribbon that reads as a sculpted object, rather than a
full-bleed wash. This is the single biggest difference between a hero that looks expensive and one
that looks like a screensaver.

**Algorithm.** Start from a flat plane subdivided into a grid — the reference uses 128 × 256
segments, giving 129 × 257 = **33,153 vertices**. Then deform it **once, at build time**, not per
frame:

1. Compute a per-vertex "fold power" that falls off along the plane's V axis — the reference uses
   `4 − 2·ease(v, k)` with a steep easing exponent, so the fold is strong at one end and relaxes
   toward the other.
2. Split the plane's local X into **three bands** about the centre (the reference boundaries sit at
   ±16 in local units, on a 400-unit plane — so a narrow central band and two wide flanks).
3. Warp each band with a cosine profile and give each a **different re-angling**, so the three
   bands do not fold as one surface. This is what produces the curl rather than a simple bend.
4. Translate along X by a quarter of the plane width, then apply two 90° rotations — about X, then
   about Y — to stand the folded sheet up into the camera's view.

**Do it in a Worker with a synchronous fallback.** It is a one-time cost of tens of thousands of
vertex transforms; on the main thread it is a visible hitch at load.

**Cost:** zero per frame. This is the cheapest mechanism in the list and it contributes the most.

⚠ **For SGS this is where our own design decision lives.** Do not copy the reference's fold
parameters — they produce *their* ribbon. What transfers is the *principle*: a bounded, folded,
once-deformed sheet beats a full-bleed noise field. Our shape should be ours.

### 2. Colour sampled from a 2D source by the surface's own UVs

**What it buys:** smooth, non-muddy colour transitions that no per-vertex interpolation of stops
reproduces cheaply.

**Algorithm.** The fragment shader performs **no colour arithmetic at all**. It reads a texture at
the fragment's interpolated UV, then applies a short grading chain:

1. contrast about mid-grey
2. desaturation toward luminance
3. hue rotation

On the reference's live preset the grading is very nearly identity (contrast 1.0, saturation 1.0,
hue shift −0.0016 turns), so what is on screen is essentially the source image, transported over
the folded geometry.

**For SGS.** The texture does not have to be painted. Generate it at runtime on a 2D canvas from
the client's four `DesignTokenPicker` colours — a small (256–512px square) gradient, uploaded once.
That keeps the client-configurable colour contract FR-38-31 already ships while gaining the
sampled-source behaviour. ⚠ **This is the one structural change** in the rework list; everything
else is additive.

**Cost:** one texture fetch per fragment. Negligible.

### 3. A fine detail field (striations)

**What it buys:** the photographic quality. Without it a gradient reads as flat vector artwork.
FR-38-31 currently has none — its fragment shader emits the interpolated vertex colour unmodified.

**Two ways to produce it; they are not interchangeable.**

**(a) High-frequency noise, frequency-modulated.** Sample a simplex/gradient noise at a very high
frequency along one UV axis (the reference runs ~600 cycles across U against ~4 across V, giving
fine vertical combing) and **modulate that frequency with a second, much lower-frequency noise**,
so the striations wander instead of reading as a regular comb. The wander is what stops it looking
mechanical. Gate the whole field by a glow ramp derived from a **screen-space derivative** of the
UV, with a parabolic falloff, so the striations appear where the surface turns and fade where it
faces the camera.

**(b) Periodic lines, derivative-antialiased.** Take `|sin(u · N)|` for a large N, and derive the
line *thickness* from a screen-space derivative of the UV scaled by a large constant, raised to a
power. ⭐ **The derivative is the whole trick**: where the surface turns away from the camera the
UV derivative grows, so the lines thicken and fade rather than aliasing into moiré. A fixed-width
line field crawls; this one does not.

**For SGS.** (b) is ~15 lines and needs only `dFdx`/`dFdy`, which are core in WebGL2 — no
extension. (a) needs a noise function; we already ship Ashima/Gustavson simplex (MIT) in
`wave-gradient.js`. Start with (b): it is cheaper, it is the more legible effect, and it does not
add a noise evaluation per fragment.

**Cost:** a few ALU operations per fragment. Cheap.

### 4. A hash-based grain

**What it buys:** it breaks up 8-bit quantisation, and it adds the fine tooth that makes a large
smooth area read as a photograph rather than a render.

**Algorithm.** Hash the fragment coordinate to a pseudo-random value and shift each channel by
roughly ±4/255. Five lines, no texture, no asset. A blue-noise texture does the same job and is
strictly worse — it costs a fetch and a download for an effect that is free procedurally.

⛔ **Do NOT add this to FR-38-31 to fix banding.** It was measured: FR-38-31 as shipped has a mean
scanline run-length of **1.19** and 1,034 distinct colours per line. There are no flat bands and
nothing for a dither to fix. Add grain for *texture*, if at all — never on the banding premise,
which is refuted.

**Cost:** negligible.

### 5. Hue adjacency — a design rule, not code

**What it buys:** it is the difference between "premium" and "muddy", and it costs nothing.

Interpolating between **complementary** hues in RGB passes through grey. Four stops spanning
blue→orange produce a visible grey band exactly where they meet. Four **hue-adjacent** stops
(peach → coral → pink → violet) do not, and rendered through the mechanisms above they read as
expensive despite carrying only ~300 unique colours.

**Binding rule for the rework:** the four client colours must not span complements. Either
constrain the picker, or interpolate in a perceptual space (OKLab) so the path between stops does
not cross grey. ⚠ FR-38-31's current defaults (`#1b2a4a` base with `#3f7fd1` / `#7b4bd8` /
`#d95f8a`) are widely spaced *and* sit on near-black — which is both halves of the problem at once.

### 6. Ground — bright colour on white, not saturated colour on near-black

**What it buys:** more than any shader change on the list.

The rejected FR-38-31 look is a dark, saturated field on near-black navy. That reads as rendered 3D
geometry — the "B-movie 3D VFX" verdict. The reference sits on **clean white with text beside it**,
and the effect is a bounded bright shape rather than a full-bleed dark one.

This is an attribute default, not a mechanism. It is the cheapest real improvement available.

### 7. A full-screen second pass: angular blur, then grain

**What it buys:** a depth-of-field cue done in screen space. It is a large part of why the
reference reads as photographic.

**Algorithm.** Render the scene to a framebuffer, then draw a fullscreen quad that:

1. Samples the scene several times (reference: 6) along an **arc about the canvas centre** — each
   sample's coordinate rotated slightly around the centre point rather than offset linearly. That
   is what makes it read as motion/lens blur rather than a box blur.
2. Computes a **vertical band mask** as the difference of two smoothsteps, so the image is sharp
   through a horizontal band and progressively blurred above and below it.
3. Mixes blurred and sharp by that mask, then applies the grain from §4.

⛔ **THIS IS THE EXPENSIVE ONE — and the number was not known when it was last discussed.**

| Measured (RTX 2060, 1.06 MP) | GPU ms/frame |
|---|---|
| Wave pass alone | 0.113 |
| Wave pass + post pass | 0.373 |
| **The post pass by itself** | **0.261 — 70% of total, 2.3× the render it post-processes** |

**Architectural consequence.** Spec 38 §1.2b names multi-pass/framebuffers as precisely the
trigger to reopen D479 decision 2 (the OGL question), because the current raw-WebGL2 Tier W
interface is single-pass by construction. This mechanism therefore **cannot be added to FR-38-31 as
an increment** — it needs a design gate, and it now has a cost figure to be judged against. Treat
§7 as out of scope for the first rework pass.

---

## Reference calibration values

Observed from a running reference implementation. Useful as a starting point for tuning; **not
targets to match**, since our form and ground should differ deliberately (§1, §6).

| Group | Values |
|---|---|
| Geometry | plane 400×400 units, 128×256 segments → 33,153 vertices; fold bands at ±16 |
| Time | speed 4e-5, offset 17500; **draws every 2nd frame**; intro ramp 0→1 in 0.016 steps |
| Displacement | amount −7.821; frequency X 0.005831, Z 0.016001 |
| Twist | power 3.63 / 0.7 / 3.95; frequency −0.65 / 0.41 / −0.58 |
| Grading | contrast 1.0, saturation 1.0, hue shift −0.00159 |
| Striations (noise path) | frequency 600, strength 0.2, colour attenuation 0.9, parabola power 3 |
| Glow gate | amount 1.98, power 0.806, ramp 0.834 |
| Striations (line path) | line count 425, max width 1232 |
| Post pass | blur amount 0.02, 6 samples, grain 1.1, diffuse blur 0 |
| Surface | 8-bit render target *deliberately* — a float target removes the quantisation the grain exists to dither |

⚠ **Per-tier presets for tablet/mobile were never recovered.** The reference's own medium/small
configurations arrive as page data from outside the analysed source. Do not invent values; tune
ours per breakpoint from scratch.

---

## Notes for a Tier W implementation

- **No three.js.** The reference uses it; we must not — 182KB gzip against a 120KB Tier W page
  allowance. Everything in §1–§6 is expressible in raw WebGL2: one program, one indexed buffer of
  positions and UVs, one texture, a handful of uniforms. §7 is the only mechanism that needs
  machinery we do not have.
- **The vertex shader needs its own preamble.** Under three.js, `projectionMatrix`,
  `modelViewMatrix`, `position`, `normal` and `uv` are injected. A raw port must declare and supply
  all of them itself. This is the most common porting mistake and it fails at compile time, loudly.
- **Cap DPR.** The effect is fillrate-bound: measured 3.0× cost for 4× the pixels. FR-38-31's
  existing 1.5 cap is well-judged and should stay.
- **Keep the existing house contracts** — context-loss recovery, explicit GPU disposal,
  `IntersectionObserver` and `visibilitychange` pausing, the SC 2.2.2 Pause control, and the
  hand-authored CSS fallback. None of the above changes any of that.
- **Gate on capability, and fail toward the fallback.** The reference requires WebGL2, requests a
  high-performance context, sets `failIfMajorPerformanceCaveat`, screens the GPU string against a
  blocklist, and **declines outright** rather than running badly. That posture is right and we
  already have the shape of it.

## Cost expectations

At 1.06 MP on a desktop GPU, the geometry-plus-fragment half of this technique measured **0.113 ms
per frame** — about 0.7% of a 16.7 ms budget. FR-38-31 as shipped measures 0.040 ms. So §1–§6
together should land in the low hundreds of microseconds: **a real increase over what we ship, and
still cheap in absolute terms.** ⚠ Measured on one strong desktop GPU only; the reference's own
blocklist exists because this class of effect gets expensive on weak hardware.

## Where the evidence lives

- Measurements, controls and instrument failures: `.claude/reports/2026-08-25-stripe-hero-anatomy.md`
- Comparator: `perf/compare.py` (validated against a known answer before use)
- Cost harness: `perf/measure-frame-cost.mjs` → `perf/frame-cost.json`
- Held-out validation: `perf/capture-heldout.mjs` → `perf/heldout-*.json`
