---
doc_type: report
project: small-giants-wp
spec_ref: 38
status: GO for §1-§6, but PARTLY SUPERSEDED as of 2026-08-29 — READ D886, D887 and D888 BEFORE BUILDING FROM THIS FILE. The Animation subsection describes only ONE of the mechanism's three real layers (D882). Two claims made while executing this spec were withdrawn: an 89.3% silhouette IoU (unreproducible) and "a systematic colour cast" (over-read statistic). The engine is now BUILT and LIVE; the open work is a measured ~10.6% fidelity gap whose cause is unproven. GO — the build spec for the GENERATIVE BACKGROUND ENGINE, ready for Phase 3 (build), not a tuning guide for FR-38-31. History: D794 (2026-08-26) NO-GO on completeness. A 2026-08-28 six-seat /adversarial-council pass on the first completed revision returned NO-GO (avg grade C): a geometrically-wrong OKLab colour fix, a double-rotation bug and unreconciled scale in the Camera section, an unbuildable Animation section, inverted Configurability-axes table columns, a wrong-court legal citation, and other must-fix items — all fixed. A 3-seat targeted re-check found one further defect (Configurability-axes table's v1/v1.1 tagging contradicted itself) — fixed. A final round-3 spec-lawyer sweep returned GO (grade A-), with legal and render-math re-checks also at A-. Four cosmetic should-fix items from round 3 applied. Do not build Phase 3 from any version of this document predating this status line.
last_updated: 2026-08-28
---

# Generative background engine — technique / implementation reference

> ## ⛔ READ THIS FIRST — what this document is for
>
> **What it IS.** The **build spec for our own configurable generative-background engine**,
> derived from the Stripe hero anatomy study using **none of Stripe's assets**. Its owning plan is
> [`.claude/plans/2026-08-27-generative-background-engine.md`](../plans/2026-08-27-generative-background-engine.md),
> whose Phase 2 this document satisfies.
>
> **What it is NOT.** It is **not** a tuning guide for `FR-38-31`, the shipped `flowing-gradient`
> fx effect (six styles, D852/D871). That effect is a separate, finished, self-contained product —
> D838 records it as such, closed at
> [`.claude/plans/archive/2026-08-26-fr3831-look-gate.md`](../plans/archive/2026-08-26-fr3831-look-gate.md).
> **This engine is modelled on the Stripe-hero replication POC** (the mesh-plane / CPU-fold
> technique this document describes), **not** on FR-38-31's fullscreen-triangle noise-field
> technique — the two are deliberately different rendering approaches for two different products.
> This is a directive from Bean (2026-08-28), given after the two were briefly conflated: *"that
> POC and its code and architecture, as well as our SGS standards, should be all that you should
> base things on... the aurora stuff is completely irrelevant here, that was the wrong tool for the
> job too."*
>
> **Why D794 said NO-GO — completeness, NOT purpose.** Every finding was *"this is missing"*: no
> animation section, no camera or coordinate space, no acceptance criteria, no statement of which
> file the code lands in, evidence pointers that needed re-checking. Exactly one finding was
> directional, and it was a **re-ranking**: §1 (the CPU-folded ribbon) plausibly *deepens* the
> "rendered 3D" quality FR-38-31's own mesh attempt was rejected for, while §5 and §6 are free and
> highest-yield. **Nothing in the register said the goal was wrong.** All thirteen must-fix items
> from that register are now absorbed — see the "Assembly & priority order", "Animation", "Camera,
> projection and coordinate space", "Acceptance criteria", "Target file", "CSS fallback contract"
> and "Configurability axes" sections below, all new in this revision.
>
> ⚠ **§6's ground is a CONTROL, not a fixed choice** — stated as a binding requirement in §6 itself
> now, not left as a plan-only note.
>
> ⚠ **Divergence clause.** This document is a build reference, derived by reading a study rig, not
> a contract. If the shipped engine's actual behaviour ever diverges from what is written here, the
> code is authoritative — update this document to match, don't treat the mismatch as a bug in the
> code.

**What this is.** A description, in our own words, of the mechanisms that make a premium-feeling
animated gradient hero, precise enough to implement from without opening anyone else's source. It
exists so that the **generative background engine** has a durable specification to build against and
the study material it was derived from becomes genuinely disposable once the engine ships.

**What this is not.** It is not a porting guide and it contains no third-party shader source, no
reproduced imagery and no transliterated code. Where a reference implementation's measured
parameter values are useful as calibration they are given as a numeric table — those are observed
facts about a running program, not expression.

## Licence position, stated once

⚠ **Not legal advice — this is an internal working position, checked twice by adversarial-council
review, not a solicitor's opinion.** If the client-facing indemnity question ever matters (see the
parent plan's KJC-4 note on a UK IP solicitor's hour), that's a paid-advice question, not something
this document settles.

Copyright protects **expression**, not functionality — well-established, but its application is not
mechanical (see the caveat two paragraphs down; do not read "well-established" as "no judgement
call left"). The **High Court** (Arnold J) referred questions on this in *SAS Institute v World
Programming* to the CJEU in 2010; the CJEU's preliminary ruling (C-406/10, 2012) held that neither a
program's functionality nor its underlying ideas are protected; the High Court then applied that
ruling in its own judgment ([2013] EWHC 69 (Ch)), and the Court of Appeal subsequently upheld that
application on the points appealed ([2013] EWCA Civ 1482). The CJEU ruling was **applied by the
referring court** (the High Court, not the Court of Appeal — corrected here after a prior revision
of this section named the wrong court); a preliminary reference isn't a decision the referring
court affirms or overturns, it's one it's bound to apply — the Court of Appeal's role was the
ordinary appellate one of upholding the High Court's application of it. **CDPA 1988 s.50BA** makes
observing, studying and testing a **computer program** to determine its ideas a permitted act a
licence cannot override. That exception is scoped to code — it does not reach a painted palette
image, which is an artistic work, not a program; s.29's research fair-dealing exception is
non-commercial-only in any case, so it isn't available here regardless. This document doesn't rely
on the palette PNG for anything (see the hue-adjacency finding under §5), so the distinction is
recorded for accuracy, not because it changes what this spec does.

⚠ **The idea/expression split is not a blanket safe harbour — reproducing even a described element
can still infringe where that element embodies the author's own intellectual creation** (*Infopaq
International A/S v Danske Dagblades Forening*, C-5/08; *SAS v WPL* itself echoes this standard for
software). That is exactly why the discipline below is "describe the mechanism and cite measured
numbers, never reproduce source text or artwork" rather than "anything short of a literal copy is
automatically safe" — the boundary is drawn by that discipline, not by the settled-law framing
alone.

So the split is:

| | Status |
|---|---|
| Another party's shader source text, and their painted palette artwork | Their expression. Never reproduced, here or anywhere tracked. |
| The mechanisms below — folded geometry, UV-sampled colour, derivative-gated striations, angular blur, hash grain | **Method and functionality. Free to implement.** |
| Measured parameter values | **Observed facts. Not expression.** |

⭐ **The single most important finding behind this spec:** the premium quality lives in the
MACHINERY, not the artwork. A four-stop palette carrying a few hundred unique colours renders as
expensive through the mechanisms below, against a reference painting's tens of thousands. **No
artist-painted asset is required.** The constraint is hue adjacency (§5), which is a design rule and
costs nothing.

---

## Assembly & priority order

D794's council re-ranked the mechanisms by cost-to-yield; this section states the build order that
ranking implies, without renumbering the sections below (their §-numbers are cited elsewhere in
this codebase and stay stable as identifiers).

**Build and validate in this order:**

1. **§6 Ground** and **§5 Hue adjacency** — zero shader cost, design rules only. Validate the look
   (client colours through a hue-adjacent, correctly-grounded static gradient) *before* any GPU
   work starts. If the palette doesn't read as premium here, no amount of geometry or post-processing
   downstream will fix it — this is the finding the council rated highest-yield, and it's backed
   empirically by **§Q7 of the sibling anatomy report**
   (`.claude/reports/2026-08-25-stripe-hero-anatomy.md`), not by this document (this document's own
   sections are §1–§7, unrelated to that report's Q-numbering — corrected here after an earlier
   revision miscited Q7 as belonging to this file).

   ⭐ **This step is a legitimate v1 on its own, not only a validation gate.** If a static,
   hue-adjacent, correctly-grounded gradient meets Bean's visual bar at this checkpoint, that is a
   shippable v1 with zero WebGL, zero geometry risk, and near-zero build cost — ship it. §1 onward
   is then a v1.1 **motion upgrade**, undertaken deliberately and design-gated on its own, not an
   assumed continuation just because the spec describes it next. Do not treat "the document goes on
   to describe geometry" as "the build must too."

   ⚠ **This v1 static image is a DIFFERENT artefact from the "CSS fallback contract" (below) — name
   the distinction, don't let them blur into one thing.** The v1 gradient is built through §2's
   OKLCH pipeline (Canvas 2D, JS-only — this is colour maths, not rendering, so it needs no WebGL
   at all: build the interpolated image once with `putImageData`, display it as a background). The
   CSS fallback is a SEPARATE, lower-fidelity, hand-authored plain-CSS gradient that exists once
   v1.1's WebGL renderer ships, specifically for visitors whose browser can't run it — CSS has no
   OKLCH-hue-angle interpolation mode (§2), so it relies on hue-adjacency alone (§5) in sRGB, and it
   is accordingly weaker than the v1 image. **If v1 ships and v1.1 never does, the OKLCH-built v1
   image is the permanent deliverable and the CSS fallback contract is moot** — it only becomes
   necessary once there's a WebGL path to fall back FROM.

2. **§1 Geometry — the folded plane**, plus its **Animation** and **Camera, projection and
   coordinate space** subsections (new, below). ⚠ Flagged suspect by the council: this is the
   mechanism closest to what produced FR-38-31's "B-movie 3D VFX" verdict on a *different* effect.
   Build it, then stop and look at it against §6/§5 before adding anything else — if the fold alone
   already reads as cheap 3D, the fold parameters (not the mechanism) are the thing to change.

   ⛔ **Kill criterion, not open-ended retuning.** Two parameter-retune passes, maximum. If the
   geometry still reads as rendered 3D / "B-movie VFX" after two retunes, **stop** — drop geometry
   entirely, ship the step-1 static gradient as the actual v1, and treat a third attempt at the fold
   as needing a fresh design-gate (new approach, not another parameter tweak) rather than more time
   inside this same build. This is what stops "just retune it once more" from eating an
   open-ended amount of a solo-operator's build time on the one mechanism the council already
   flagged as the most likely to fail taste.
3. **§2 Colour sampling**, including the OKLCH colour-space correction (below) — the one structural change from
   a curated CSS gradient to a runtime-generated, token-derived texture.
4. **§3 Striations** — cheap, and per the technique's own account is what turns a flat gradient into
   something photographic.
5. **§4 Grain** — negligible cost, do last since it's the easiest thing to omit if the budget is
   tight.
6. **§7 Post-pass (angular blur + grain)** — **stays out of scope for this build.** D791 measured it
   at 70% of total frame cost and 2.3× the render it post-processes; Spec 38 §1.2b names multi-pass
   as the trigger to reopen the D479 library decision. Treat as a design-gated future addition, not
   part of this engine's first ship.

---

## The mechanisms

Costs are from the Q6 measurement (`.claude/scratch/stripe-hero-poc/perf/frame-cost.json`, RTX
2060, 1.06MP, GPU timer query — see "Where the evidence lives").

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

**Cost:** zero per frame — for the one-time fold described above only. See "Animation" immediately
below for the separate, per-frame cost that sits on top of this once motion is added; don't read
this line as covering all of §1.

⚠ **For SGS this is where our own design decision lives.** Do not copy the reference's fold
parameters — they produce *their* ribbon. What transfers is the *principle*: a bounded, folded,
once-deformed sheet beats a full-bleed noise field. Our shape should be ours. Per the assembly
order above, build this and STOP to compare against §5/§6 before layering anything else on — this
is the mechanism the council flagged as the one most likely to reproduce FR-38-31's rejected look
if over-built.

#### Animation — the fold is static; what moves is Twist and Displacement

The one-time CPU fold above sets the plane's *shape*. Motion is a **separate, per-frame GPU**
operation applied on top of the already-folded geometry, driven by `u_time`, and it decomposes into
two distinct vertex operations — the calibration table's "Twist" and "Displacement" rows name these,
not a single undifferentiated "wobble". They do **not** commute (rotate-then-offset ≠
offset-then-rotate), so the order matters and is stated explicitly below, not left to be guessed:

- **Displacement, applied first, to the CPU-folded rest position.** A per-vertex offset **along the
  surface normal** (not X/Z in-plane — an along-normal offset is what reads as the surface breathing
  outward/inward; an in-plane offset would read as sliding, a different and wrong-looking motion),
  with magnitude driven by a noise function sampled at two independent frequencies (the calibration
  values below give an X frequency roughly a third of the Z frequency, so the two samples drift out
  of phase rather than moving together — sum the two noise samples into one scalar magnitude, then
  multiply by the surface normal). Use the same simplex noise function already shipped in this
  codebase for FR-38-31's `aurora`/`ink` variants (Ashima/Gustavson, MIT) — reuse it, don't add a
  second noise implementation.
- **Twist, applied second, to the displaced position.** A per-band 2D rotation of the vertex's
  (X, Z) coordinates about the band's local pivot, by an angle of `power[band] * sin(freq[band] *
  u_time)` — three power values, three frequency values in the calibration table below, one triple
  per band, mirroring the three-band split from the fold step. This is what keeps the three folded
  bands visually independent as they animate, rather than moving as one rigid folded sheet.
  ⛔ **Band membership must survive the fold.** §1 step 2 defines the three bands by local X on the
  *flat, unfolded* plane — after folding and the two 90° rotations, a vertex's final position no
  longer trivially encodes which band it came from. **Carry band membership as an explicit
  per-vertex attribute** (an integer 0/1/2, or the pre-fold local X, set once at CPU-fold time and
  uploaded alongside position/UV) so the vertex shader can read it directly rather than
  re-deriving it from post-fold geometry.

Both read `u_time` scaled by a speed uniform (client-configurable, see "Configurability axes"
below) and both apply to vertex positions only — colour, at this stage, is a downstream
per-fragment concern (§2).

#### Camera, projection and coordinate space

*(Unnumbered, sits between §1 and §2 — logically part of §1's build step per Assembly & priority
order, hence the `####` level matching Animation above, not a sibling top-level mechanism.)*

**There is no camera object.** In raw WebGL2 (no three.js, per Tier W's ban on 3D-engine
dependencies) "the camera" is just a name for one combined projection × view matrix, computed once
and re-sent to the shader as a single `mat4` uniform — no scene graph, no camera abstraction, no
per-frame recomputation beyond the resize case below. Everything that follows describes what values
that one matrix bakes in, not an object with its own position/lookAt API.

- **Projection:** orthographic, not perspective. An orthographic projection's frustum is defined by
  left/right/top/bottom clipping planes plus near/far — not a field-of-view angle — so scale on
  screen doesn't change with distance. The standard column-major orthographic matrix (this is
  textbook `glOrtho`-equivalent maths, not anyone's proprietary code — the same form appears in
  every WebGL reference):

  ```
  [ 2/(r-l)        0             0           -(r+l)/(r-l) ]
  [ 0              2/(t-b)       0           -(t+b)/(t-b) ]
  [ 0              0            -2/(f-n)     -(f+n)/(f-n) ]
  [ 0              0             0            1            ]
  ```

  with `l/r/t/b` the frustum edges, `n/f` near/far. Upload via `gl.uniformMatrix4fv` with
  `transpose=false` if building the array already in this column-major layout (the common
  convention; state whichever convention is actually used, don't leave it implicit).

- **⛔ Frustum units and geometry units must be reconciled — this is not automatic.** A frustum
  "sized from the canvas's own pixel dimensions" (e.g. roughly ±960 for a 1920px-wide canvas) and a
  plane built in **400 local units** (§1) do not fill each other by default — the plane would cover
  a small fraction of the canvas. Pick one explicitly, don't leave the reader to discover the gap by
  rendering a tiny dot:
  - **Recommended:** size the frustum in the *same arbitrary world units as the geometry* —
    `left/right = ±(planeWidth/2) × margin`, aspect-matched to the canvas — so no separate scale
    factor is needed to make the plane fill the frame.
  - **Alternative:** keep a pixel-unit frustum and make the "Size" configurability axis (below)
    **mandatory**, not optional, with an explicit `scale ≈ frustumWidth / planeWidth` relationship
    stated as load-bearing pipeline math, not a client nicety.
  Near plane close to zero; far plane large enough to contain the folded plane's own depth extent —
  size that extent to *this build's* geometry, not to the reference's numbers (the reference's
  far-plane value is large only because its world units are large; a different world-space scale
  needs its own far plane, not this one).
- **Recompute on resize — as actual steps, not just "recompute a matrix":** (1) update the canvas's
  backing-store `width`/`height` (distinct from CSS size), scaled by DPR; (2) `gl.viewport(0, 0, w,
  h)`; (3) recompute the frustum from the new dimensions and re-upload the projection uniform; (4)
  do this from a debounced `ResizeObserver` (or `resize` listener), not a per-frame check.
- **Where the "camera" sits:** the matrix's translation component moves the folded geometry back
  along the depth axis (rather than a camera moving toward the geometry) far enough to sit inside
  the near/far range — an orthographic transform has no distance-based scale effect, so this value
  only needs to keep the geometry inside the frustum, not hit an exact number.
- **⛔ Rotation lives in ONE place only — the CPU-baked vertex data, not the matrix.** §1 step 4
  bakes the two 90° rotations into the vertex positions once, at build time, on the CPU. **The view
  matrix must therefore be translation-only** — it must NOT also apply those rotations, or the
  scene rotates twice (180°+180°, misorienting everything). This corrects an earlier draft of this
  section, which described the rotations as living in both places at once — pick one, and it's the
  CPU bake, since §1 already commits to doing it there. Look-at is the origin as a consequence: the
  vertices are already oriented to face forward once baked, so the matrix needs no separate aiming
  term.

### 2. Colour sampled from a 2D source by the surface's own UVs

**What it buys:** smooth, non-muddy colour transitions that no per-vertex interpolation of stops
reproduces cheaply.

**Algorithm.** The fragment shader does **no gradient/lerp math of its own** — no per-fragment
blending between colour stops. It reads a texture at the fragment's interpolated UV (all the stop
interpolation already happened once, at texture-build time, per the correction below), then applies
a short grading chain:

1. contrast about mid-grey
2. desaturation toward luminance
3. hue rotation

On a near-identity grading pass, what's on screen is essentially the source image, transported over
the folded geometry.

**For SGS.** The texture does not have to be painted. Generate it at runtime on a 2D canvas from
the client's four `DesignTokenPicker` colours — a small (256–512px square) gradient, uploaded once.
That keeps the client-configurable colour contract already proven on FR-38-31 (a `DesignTokenPicker`
resolved through `sgs_colour_value()`) while gaining the sampled-source behaviour.

⚠ **The colour-space correction (item 6 of the completion register) — CORRECTED to OKLCH, not
OKLab.** §5 requires hue-adjacent stops so the interpolation path never crosses a muddy grey band.
**`CanvasRenderingContext2D`'s native `createLinearGradient()` interpolates in sRGB**, which is
exactly the space that produces that grey band between non-adjacent hues — so building the texture
with the canvas gradient API silently undoes §5's own remedy. That part of the diagnosis holds.

⛔ **An earlier revision of this fix named OKLab specifically, and that was wrong — a confirmed
geometric error, not a style choice.** OKLab is a Cartesian space (L, a, b). A straight-line
(linear) interpolation between two colours at the same lightness and chroma but opposite hue angles
passes through **exactly zero chroma at the midpoint** — pure grey — for the identical geometric
reason a straight chord between two points on a circle dips toward the centre. That is true in
sRGB, linear RGB, Lab, *and* OKLab: swapping to OKLab does not change which points a straight-line
interpolation passes through relative to the hue circle, only how evenly-spaced the perceived
brightness is along that line. OKLab genuinely fixes a *different* problem — the muddy/dark
undershoot from interpolating gamma-encoded values non-linearly — but it does not, on its own, stop
complementary hues crossing grey.

**The fix:** interpolate in **OKLCH** (the polar form of the same space — Lightness, Chroma, hue
Angle), not OKLab. Convert each of the four client colours to OKLCH, interpolate **hue as an angle**
around the wheel between the nearest two stops (choosing the shorter arc explicitly — a polar
interpolation needs a stated direction, unlike a Cartesian one), interpolate L and C linearly, then
convert the result back through OKLab intermediate form to **linear-light sRGB, gamma-encode to
sRGB, then round to the 0–255 integers `ImageData` expects** — the gamma round-trip is a required
step, not implicit: the standard pipeline is sRGB (gamma) → linear-light sRGB → LMS → OKLab/OKLCH,
and the same steps in reverse on the way back; skipping the gamma decode/encode produces wrong hues
and lightness, not just a slightly-off result, and is the single most common way this exact
procedure gets silently implemented wrong. **Clamp to the sRGB gamut** after conversion — an OKLCH
interpolation between two in-gamut colours can produce an out-of-gamut intermediate, and writing an
unclamped value produces a colour-clipping artefact that looks exactly like the banding this fix
exists to remove. Use the CSS Color Module Level 4 reference formulas for the OKLab/OKLCH↔sRGB
conversion (documented, public maths, not anyone's proprietary code) run once at texture-build time,
not a per-frame shader cost. **Rebuild the texture whenever the client changes any of the four
colour tokens** (both live in the block editor and on the rendered page) — it is not a load-once,
never-touched-again asset.

**Cost:** one texture fetch per fragment. Negligible. Texture generation itself is a JS-side,
build-time-or-on-change cost, not a per-frame one.

### 3. A fine detail field (striations)

**What it buys:** the photographic quality. Without it a gradient reads as flat vector artwork.

**Two ways to produce it; they are not interchangeable.**

**(a) High-frequency noise, frequency-modulated.** Sample a simplex/gradient noise at a very high
frequency along one UV axis and **modulate that frequency with a second, much lower-frequency
noise**, so the striations wander instead of reading as a regular comb. The wander is what stops it
looking mechanical. Gate the whole field by a glow ramp derived from a **screen-space derivative**
of the UV, with a parabolic falloff, so the striations appear where the surface turns and fade
where it faces the camera.

**(b) Periodic lines, derivative-antialiased.** Take `|sin(u · N)|` for a large N, and derive the
line *thickness* from a screen-space derivative of the UV scaled by a large constant, raised to a
power. ⭐ **The derivative is the whole trick**: where the surface turns away from the camera the
UV derivative grows, so the lines thicken and fade rather than aliasing into moiré. A fixed-width
line field crawls; this one does not.

**For SGS.** (b) is ~15 lines and needs only `dFdx`/`dFdy`, which are core in WebGL2 — no
extension. (a) needs a noise function; the codebase already ships Ashima/Gustavson simplex (MIT)
for FR-38-31's `aurora`/`ink` variants, reusable here without a new dependency. Start with (b): it
is cheaper, it is the more legible effect, and it does not add a noise evaluation per fragment.

**Cost:** a few ALU operations per fragment. Cheap.

### 4. A hash-based grain

**What it buys:** it breaks up 8-bit quantisation, and it adds the fine tooth that makes a large
smooth area read as a photograph rather than a render.

**Algorithm.** Hash the fragment coordinate to a pseudo-random value and shift each channel by
roughly ±4/255. Five lines, no texture, no asset. A blue-noise texture does the same job and is
strictly worse — it costs a fetch and a download for an effect that is free procedurally.

**Cost:** negligible.

### 5. Hue adjacency — a design rule, not code

**What it buys:** it is the difference between "premium" and "muddy", and it costs nothing.

Interpolating between **complementary** hues in RGB passes through grey. Four stops spanning
blue→orange produce a visible grey band exactly where they meet. Four **hue-adjacent** stops
(e.g. peach → coral → pink → violet) do not, and rendered through the mechanisms above they read as
expensive despite carrying only a few hundred unique colours.

**Binding rule for this build:** the four client colours must not span complements. Either
constrain the picker, or interpolate in **OKLCH** (per §2's correction — the polar form, not OKLab;
a Cartesian OKLab interpolation does not solve this, see §2) so hue moves around the wheel rather
than crossing it in a straight line.

### 6. Ground — a client-facing control, not a fixed default

**What it buys:** more than any shader change on the list, and — per the parent plan's resolution
of the ground-conflict question — this is now stated as a **binding requirement**, not left open:

**Ground ships as a control with at minimum a light/dark preset pair, resolved from the client's own
base colour token, never hardcoded.** The **light-ground preset** — a bright colour on a light
ground — reads as a bounded shape with text placed *beside* it, not over it; the **dark-ground
preset** — a saturated colour on a near-black ground — reads as rendered 3D geometry. Both
are legitimate looks depending on what the client's palette and section context call for — the
engine's job is to make both reachable from the same mechanism, exactly as FR-38-31's shipped
`aurora`/`ink` pair (D852) already proved is possible for a *different* rendering technique (measure
the ground colour's luminance and branch behaviour, rather than hardcoding one polarity).

This is an attribute default plus a control surface, not a mechanism — the cheapest real
improvement available, and now a spec requirement rather than a plan-only note.

### 7. A full-screen second pass: angular blur, then grain

**What it buys:** a depth-of-field cue done in screen space. **Out of scope for this build** — see
"Assembly & priority order" above.

**Algorithm, for future reference.** Render the scene to a framebuffer, then draw a fullscreen quad
that:

1. Samples the scene several times along an **arc about the canvas centre** — each sample's
   coordinate rotated slightly around the centre point rather than offset linearly. That is what
   makes it read as motion/lens blur rather than a box blur.
2. Computes a **vertical band mask** as the difference of two smoothsteps, so the image is sharp
   through a horizontal band and progressively blurred above and below it.
3. Mixes blurred and sharp by that mask, then applies the grain from §4.

⛔ **THIS IS THE EXPENSIVE ONE — but read the ratio and the absolute together:**

⚠ **Corrected 2026-08-29 (Bean).** "70% of total frame cost" is a RATIO, not a burden. The
absolute total is **0.373 ms — about 2.2% of a 60 fps frame**, and the reference ships it. Seventy
per cent of something small is still small. Two corrections in the other direction, so this is not
re-litigated from the wrong premise: building it raw does NOT make it materially cheaper (the cost
is GPU fillrate — six texture samples per pixel — not three.js overhead, which is CPU/JS); and the
genuine blocker is ARCHITECTURAL, not performance — the Tier W interface is single-pass by
construction, so a post-pass needs framebuffers and reopens D479 decision 2. **That design gate is
Bean's to open and remains open.**


| Measured (RTX 2060, 1.06 MP) | GPU ms/frame |
|---|---|
| Wave pass alone | 0.113 |
| Wave pass + post pass | 0.373 |
| **The post pass by itself** | **0.261 — 70% of total, 2.3× the render it post-processes** |

**Architectural consequence.** Spec 38 §1.2b names multi-pass/framebuffers as precisely the
trigger to reopen D479 decision 2 (the OGL question), because the current raw-WebGL2 Tier W
interface is single-pass by construction. This mechanism **cannot be added as an increment to a
single-pass build** — it needs its own design gate, and it now has a cost figure to be judged
against.

---

## Acceptance criteria

There were none of any kind at D794. Split into two gates matching the Assembly & priority order's
own two-stage structure — a light bar for the free static-gradient step, and a full bar only once
geometry is actually committed to, rather than importing FR-38-31's fully-iterated bar wholesale
onto the cheapest, lowest-risk step:

**Validation gate (§5/§6, before any GPU work) — must pass before step 2 of Assembly & priority
order starts:**

- **No grey/muddy band.** The static, hue-adjacent, correctly-grounded gradient (step 1) shows no
  visible grey band between any two adjacent colour stops, checked visually against the OKLCH fix
  in §2 — this is the specific failure mode the whole hue-adjacency finding exists to prevent, and
  it had no acceptance criterion until this revision.
- **Bean visual sign-off** that the static gradient meets the bar on its own — this is the decision
  point for the MVP off-ramp in Assembly & priority order step 1: ship here, or proceed to geometry.

**Full ship gate (once geometry is committed to, before this engine's actual release):**

- **The §1 risk, checked explicitly — new, not present in any earlier revision.** The built,
  animated geometry gets a **named** Bean visual sign-off specifically against the "B-movie 3D VFX"
  rejection criteria FR-38-31 was rejected on — not a general council pass, a specific checkpoint
  with a stated fail condition (reads as rendered 3D geometry rather than a bounded folded shape).
  Subject to the kill criterion in Assembly & priority order step 2 (two retune passes, then stop).
- **Contrast.** Body text laid over the effect maintains ≥4.5:1 contrast (WCAG 2.1 AA) at every
  point in the animation cycle, not just at a single sampled frame — verify by sampling computed
  colour at multiple `u_time` values, not once. Scoped to configurations where text actually
  overlaps the effect — §6's **light-ground preset** (design intent: text placed beside the effect,
  not over it) doesn't need this check to hold, since there's no overlap to fail.
- **Reduced motion.** The renderer draws exactly one static frame and stops — the same "SIMPLIFY"
  contract Spec 38 §1.2b's house contracts require of every motion tier, and the same pattern
  FR-38-31 already ships. *(This criterion is derived by analogy to the sibling effect and Spec
  38's house contracts, not stated anywhere for this specific engine before now — confirm it holds
  as a pre-condition the council checks, not a parallel output of the council pass below.)*
- **Context loss.** On a lost WebGL context, the engine either recovers within Tier W's standard
  grace window or falls back to the CSS fallback contract (below) — never a dead rectangle. *(Same
  derived-by-analogy and confirm-as-pre-condition caveat as above.)*
- **Frame cost — numeric threshold, not a prose range.** §1–§6 combined (excluding the out-of-scope
  §7) stays under **300 μs / frame** on the RTX 2060 reference rig used for the Q6 measurement (a
  ~2.65× margin over the 0.113ms measured baseline for the comparable mechanisms) — verify with the
  promoted `perf/measure-frame-cost.mjs` tooling (see "Target file" below) before shipping.
- **DPR cap.** Device pixel ratio capped at 1.5, matching the fillrate-bound cost profile already
  measured for this class of effect and FR-38-31's own precedent.
- **Council gate.** This document passes `/adversarial-council` with a GO verdict before any build
  step begins on it. (This gate covers the SPEC; the visual sign-offs above cover the BUILT
  artefact — passing this one doesn't retroactively confirm the derived-by-analogy criteria, they
  need their own explicit confirmation as stated above.)

## Target file

FR-38-31's files (`webgl/wave-gradient.js`, `webgl/aurora.js`, `fx-wave-gradient.js`,
`fx-wave-gradient.css`, `includes/fx-wave-gradient.php`) are explicitly **out of scope** — D838
records FR-38-31 as a finished, self-contained effect, and this engine "will carry its own FR when
it is built." This engine is therefore a **third, new Tier W closed-list entry**, built as a
**sibling of** — never an edit to — the shared boilerplate at
`plugins/sgs-blocks/src/shared/effects/webgl/renderer.js` (the "ONE swappable rendering file",
per that file's own docblock), following the same directory convention FR-38-31 and
`surface-treatment` already use:

- Renderer: `plugins/sgs-blocks/src/shared/effects/webgl/generative-background.js` (working name —
  final naming happens at build time, this is a convention statement, not a guess at unbuilt
  content)
- Lifecycle: `plugins/sgs-blocks/src/shared/effects/fx-generative-background.js`
- CSS fallback: `plugins/sgs-blocks/assets/css/fx-generative-background.css`
- PHP render-layer filter: `plugins/sgs-blocks/includes/fx-generative-background.php`

The public import boundary (`webgl/index.js`) and its "nothing outside `webgl/` imports the
internals" gate apply identically to this new renderer.

## CSS fallback contract

Per Spec 38 §1.2b's fallback-shape distinction: a **generative** Tier W effect (this one, like
FR-38-31) has no untouched source image to fall back to on failed init, so it ships a real,
hand-authored CSS fallback that must be kept in sync with the shader **forever** — the same ongoing
maintenance cost already named and accepted for FR-38-31.

The fallback must reproduce, without any canvas:

- The **ground** colour/preset the client selected (§6) — a static background, not a placeholder
  colour.
- A **static, hue-adjacent gradient** built from the same four client colours (§5) — CSS
  `linear-gradient()`/`conic-gradient()` interpolates in sRGB same as canvas, so the same
  hue-adjacency constraint that avoids grey banding in the shader applies to the CSS stops picked
  for the fallback; this is a design constraint on the CSS authored by hand, not something OKLCH
  math can fix in a static CSS gradient (CSS's own gradient functions have no OKLCH-hue-angle
  interpolation mode to reach for here).
- **No animation.** The generative engine's CSS fallback is a finished static image, matching the
  "reduced motion" acceptance criterion's own SIMPLIFY behaviour — a visitor without WebGL and a
  visitor with reduced-motion enabled should see visually consistent, equally "finished" results.

**Cost — named as its own build-time line item, not folded silently into the WebGL renderer's
estimate.** Reproducing a hand-tuned hue-adjacent gradient in plain CSS, independently of the
OKLCH-driven texture the shader uses, is genuinely separate work — it can't inherit the shader's
colour maths, since CSS gradients interpolate in sRGB regardless. Budget it as its own small task
at build time, and remember it's a "forever" maintenance cost (above), not a one-off.

## Configurability axes

Bean's original ask: colours, shapes, sizes, positions, speed — each maps to a concrete control,
reusing plumbing this session's codebase research confirmed already exists. **Column semantics,
consistent across every row: `Control` = the widget the client actually sees; `Mechanism` = what
that widget drives internally.** (An earlier revision of this table had Shape/Size/Position's two
columns swapped relative to Colours/Speed — corrected here; a reader who took the old "Control"
column literally for Shape would have exposed raw shader uniforms as sliders, which the row's own
text explicitly ruled out.)

| Axis | Ships in | Control | Mechanism |
|---|---|---|---|
| **Colours** | v1 | `DesignTokenPicker` in `linked` mode (stores a theme-token **slug**, not a resolved hex — the D717/D740 defect class this codebase has already hit and fixed elsewhere) | Resolved server-side through `sgs_colour_value()`, then run through the OKLCH texture-build (§2) for **both** artefacts — the v1 static image and, once built, the WebGL shader's colour texture. Identically to FR-38-31 and `surface-treatment`'s duotone colours — **this token-following behaviour is the engine's actual differentiator** (per the parent plan), distinct from FR-38-31's curated per-style defaults |
| **Speed** | ⚠ v1.1 (needs §1's Animation subsection, which doesn't exist until geometry ships) | `RangeControl`, same wiring pattern already proven end-to-end on `fxWaveSpeed` (attribute → `data-sgs-fx-*-speed` → read at init → multiplied into the `u_time` accumulator) | Scales the `elapsed += (now - last) * 0.001 * rate` accumulation feeding both Twist and Displacement (Animation subsection above), which is then read as `u_time` by the vertex shader — **all of which is §1/v1.1 machinery; a static v1 gradient has no `u_time` and nothing for this control to drive** |
| **Size** | ⚠ v1.1 (needs §1's folded plane and the Camera subsection's projection transform) | A `RangeControl`/preset picker exposed as the client-facing widget | Drives a scale uniform applied to the folded plane before the camera/projection transform; composes with the frustum-vs-geometry reconciliation the Camera subsection now requires explicitly — **also §1/v1.1 machinery, for the same reason as Speed** |
| **Shape** | ⚠ v1.1, gated on §1's kill criterion | A small curated preset picker (e.g. "narrow ribbon" / "wide sweep") exposed as the client-facing widget — never raw per-parameter sliders | Sets the fold parameters named in §1 (band boundaries, fold-power falloff exponent) as uniforms; mirrors the "curated presets only" discipline Spec 38 §3.1 already applies to other G/W-tier timeline controls |
| **Position** | ⚠ v1.1, gated on §1's kill criterion | An anchor-choice picker (e.g. "top-left" / "centred" / "bottom-right"), not free pixel coordinates | Sets a 2D offset uniform applied post-fold, pre-projection |

⚠ **§6 Ground is deliberately not a row here — it's a sixth, mandatory v1 control outside this
table's scope.** Bean's original ask named five axes (colours, shapes, sizes, positions, speed);
Ground wasn't one of them, but §6 states it as binding ("ships as a control with at minimum a
light/dark preset pair") and Assembly & priority order step 1 requires it to validate the v1 gradient
at all. Don't read its absence here as "not required" — see §6 directly.

⛔ **Corrected — an earlier revision of this table tagged Speed and Size as v1, contradicting their
own Mechanism column and Assembly & priority order's own definition of v1 as geometry-free.** Both
genuinely need §1 (the folded plane, its Animation subsection, the Camera transform) to mean
anything — there is no `u_time` and no plane to scale in the static-gradient v1. **Only Colours is
genuinely v1**: colour resolution applies identically to the v1 static image and the eventual
shader texture (both go through the same OKLCH build, §2), so it needs no geometry to exist.

⚠ **Shape and Position are deferred for a second, independent reason** on top of the v1.1 grouping
above: §1 explicitly says "our shape should be ours… do not copy the reference's fold parameters" —
the fold shape is an **undesigned mechanism** as of this document, so a client control over it can't
be curated until §1's own kill criterion (Assembly & priority order) has been satisfied. Speed and
Size don't have that second problem — their mechanisms are fully specified, just not yet buildable
before v1.1 ships. **If the v1 block inspector ships with Speed/Size controls visible ahead of
v1.1** (an editor-UX choice this document doesn't resolve), they must be visibly disabled or hidden
on the static-gradient path, not present-but-inert — a control that visibly does nothing is a
defect, not a convenience.

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
| Post pass (out of scope, §7) | blur amount 0.02, 6 samples, grain 1.1, diffuse blur 0 |
| Surface | 8-bit render target *deliberately* — a float target removes the quantisation the grain exists to dither |
| Camera | orthographic, frustum sized from canvas; position on the depth axis with a large ortho far-plane sized to the geometry's own depth extent; look-at the origin (see "Camera, projection and coordinate space") |

⚠ **Corrected — per-tier presets for tablet/mobile WERE recovered**, contrary to an earlier
version of this table. `.claude/scratch/stripe-hero-poc/recovered/responsive.md` recovers:

- **Confirmed breakpoints** (Stripe's own, from their live `matchMedia` calls): small ≤639px,
  medium 640–1263px, wide ≥1264px.
  ⛔ **Do not use these for this engine.** SGS's own device-tier standard is 768/1024
  (mobile ≤767 / tablet ≤1023 / desktop ≥1024, per the framework's binding "Responsive breakpoint
  discipline" rule) — this engine is an SGS block and inherits SGS's tiers, not the reference's.
  Recorded here so nobody later "fixes" the mismatch thinking it's an oversight.
- **Confirmed selection logic:** a `getConfig()`-style fallback chain — a tier's config is used only
  if that breakpoint matches AND a config was actually supplied for it, else it falls through to the
  next tier up, else always to the widest/base config. Same pattern, worth reusing: an unset tier
  inherits the next one up rather than defaulting to nothing.
- **Confirmed preset variance:** across the reference's four base presets, tablet/mobile variants
  differ from desktop only in position/rotation (camera-and-mesh placement) — never in speed,
  colour, or theme. Useful precedent: our own per-tier config should probably vary placement/scale
  only, keeping colour and speed constant across breakpoints, rather than re-deriving a full preset
  per tier.

## Notes for a Tier W implementation

- **No three.js.** A study rig used it to reach byte-for-byte replication fidelity for measurement
  purposes; the shipped engine must not — 182KB gzip against a 120KB Tier W page allowance.
  Everything in §1–§6 is expressible in raw WebGL2: one program, one indexed buffer of positions and
  UVs, one texture, a handful of uniforms. §7 is out of scope (see above) and is the only mechanism
  that would need machinery this tier doesn't have.
- **The vertex shader needs its own preamble.** A library-based renderer injects
  `projectionMatrix`, `modelViewMatrix`, `position`, `normal` and `uv` automatically; a raw WebGL2
  implementation must declare and supply all of them itself. This is the most common porting
  mistake and it fails at compile time, loudly.
- **Cap DPR.** The effect is fillrate-bound: a 4× pixel count measured roughly 3× the cost. A 1.5
  cap (FR-38-31's precedent) is well-judged and should be reused here.
- **Keep the existing house contracts** — context-loss recovery, explicit GPU disposal,
  `IntersectionObserver` and `visibilitychange` pausing, the SC 2.2.2 Pause control, and the
  hand-authored CSS fallback (above). None of this document changes any of that.
- **Gate on capability, and fail toward the fallback — structure, not exact values.** A capability
  gate for this class of effect is realistically shaped as: (a) a small set of hard minimums (WebGL2
  support, a texture-size floor, vertex/fragment uniform-count floors — the reference checks four
  such limits together); (b) a deny-list-first GPU check (a handful of known-slow GPU string
  families denied outright) followed by a small graded allow-list keyed by vendor, defaulting to
  **allow** for anything unrecognised (fail-open for hardware the check doesn't know about, never
  fail-closed on an unknown); (c) a query-parameter kill switch for manual testing; (d) the canvas
  element itself only enters the DOM once the gate passes — the CSS fallback is *always* present
  underneath, not swapped in reactively on failure. This structure is described from observed
  behaviour, not copied code — no blocklist strings or verbatim check logic are reproduced here.

  ⚠ **The deny-list content itself is a real, unfilled pre-ship task — naming the structure above
  does not populate it.** "Deny-list-first" is meaningless with an empty deny-list; without one,
  this degrades silently to "allow everything past the hard minimums," a materially different risk
  posture than the one being specified. Populating it is a named pre-ship task: build it from a
  public source (Chromium's public GPU blocklist, or `webglreport.com` renderer-string samples) —
  `.claude/scratch/stripe-hero-poc/recovered/gate.md` documents the *structure* of a real one in
  detail (never reproduced here for licence reasons, per the split table above), so read it for
  shape, but do not treat "the structure is described" as "the gate is ready to ship."

## Cost expectations

At 1.06 MP on a desktop GPU, the geometry-plus-fragment half of this technique (§1–§6, excluding
the out-of-scope §7) measured **0.113 ms per frame** — about 0.7% of a 16.7 ms budget. So §1–§6
together should land in the low hundreds of microseconds: cheap in absolute terms, and the figure
the "Frame cost" acceptance criterion above checks against.
⚠ Measured on one strong desktop GPU only; a capability gate exists (see "Notes for a Tier W
implementation") because this class of effect gets expensive on weak hardware.

## Where the evidence lives

⚠ **Gate E status.** The study material below still exists — it was never deleted. D790 (2026-08-25)
records Bean's explicit ruling: *"DO NOT FIRE GATE E until the [FR-38-31] rework has SHIPPED... the
POC rig is the only reference available for comparison and analysis while the rework is being
built."* FR-38-31 has since shipped (D852/D871). **This document's reading — that the hold now
extends to THIS engine rather than being discharged — is this document's own inference, not a
Bean-confirmed re-ruling**, made because D838 (2026-08-27) separately documents that "the FR-38-31
rework" was itself an ambiguous label spanning two conflated products at the time D790 was written,
and this engine is the one that still genuinely needs the POC as a live reference. No decision after
D838 explicitly re-confirms the hold for this engine specifically. **Treat "Gate E stays held until
this engine ships" as the working assumption, not settled fact** — do not delete
`.claude/scratch/stripe-hero-poc/` on the strength of the old ruling, but also don't cite this line
as if Bean re-ruled on it.

- Two-pass pipeline, geometry counts, per-mechanism module roles:
  `.claude/scratch/stripe-hero-poc/shaders/MANIFEST.md`
- Recovered responsive/breakpoint/preset data (see calibration table above):
  `.claude/scratch/stripe-hero-poc/recovered/responsive.md`
- Recovered capability-gate structure (see "Notes for a Tier W implementation" above):
  `.claude/scratch/stripe-hero-poc/recovered/gate.md`
- Vendored three.js provenance (measurement-only, gitignored, not a build dependency):
  `.claude/scratch/stripe-hero-poc/vendor/PROVENANCE.md`
- Vertex-shader preamble guidance (why a captured "preamble" file is a superset, not the real one):
  `.claude/scratch/stripe-hero-poc/shaders/live/README.md`
- Cost harness: `.claude/scratch/stripe-hero-poc/perf/measure-frame-cost.mjs` →
  `.claude/scratch/stripe-hero-poc/perf/frame-cost.json` — **the measurement tooling in this `perf/`
  directory (not the shader captures or vendored three.js) is due to be promoted to a permanent
  tracked location** (e.g. `plugins/sgs-blocks/scripts/perf/`, matching the repo's existing
  `scripts/<topic>/` convention) so it survives Gate E firing; not yet done as of this revision.
- Held-out validation: `.claude/scratch/stripe-hero-poc/perf/capture-heldout.mjs` →
  `.claude/scratch/stripe-hero-poc/perf/heldout-*.json`

⚠ **Doc-accuracy note, not this spec's scope to fix.** `decisions.md` cites
`fx-wave-gradient.js:59-62` (FR-38-31's file, not this engine's) as carrying the MIT attribution for
`sa3dany/wave-gradient`. That citation is stale — those lines are now unrelated DOM code. **A
previous revision of this note claimed the attribution "actually lives in `webgl/wave-gradient.js`"
— that is also wrong, checked directly:** `sa3dany` appears nowhere in `plugins/` or `theme/`
source (repo-wide grep, zero matches). `webgl/wave-gradient.js` does carry an MIT attribution, but
for a different piece of code entirely (Ashima Arts/Stefan Gustavson's simplex noise), not the
`sa3dany/wave-gradient` lineage FR-38-31's shader technique was originally modelled on — that
attribution appears to have been deleted along with the vertex-displacement technique it belonged
to, in the same 2026-08-27 rewrite (D827/D828) that moved FR-38-31 to its current fullscreen-triangle
technique. **This is now a real gap, not a stale pointer** — flagged here because it surfaced while
completing this document, but the fix (restore the attribution somewhere, or confirm none is owed
because the technique it credited is gone) belongs to FR-38-31's own records, not this one.
