---
doc_type: plan
plan_id: generative-background-council-fixes
project: small-giants-wp
created: 2026-09-04
---

# Generative background — council-finding fixes

## Context

An `/adversarial-council` review of the generative-background colour/texture engine
(`.claude/decisions.md` D939, D941, D944, D946) found six real, independently-verified
defects/gaps. Seven parallel investigation subagents then diagnosed each in detail; a
human fact-check pass (in the session, not this file) confirmed the load-bearing claims
against the actual source (`data[i+3]=255`, `texture(u_texture,v_uv).rgb`, the dark
preset's real `index.html` values, `DEFAULT_PARABOLA_POWER=3.0`) before this plan was
written. This is a single consolidated implementation task, not six separate ones —
every fix touches the same two files and touching them one at a time with a full
review loop per fix would multiply review overhead for no isolation benefit.

## Global Constraints

- Files in scope: `plugins/sgs-blocks/src/shared/effects/fx-generative-background.js`,
  `plugins/sgs-blocks/src/shared/effects/webgl/generative-background.js`,
  `plugins/sgs-blocks/src/blocks/extensions/fx.js` (one help-text string only),
  `.claude/decisions.md` (one new entry), and a new file
  `plugins/sgs-blocks/scripts/generative-background/verify-field-texture.mjs`.
- No other file may be touched.
- No `deprecated.js`, no version bumps (project policy, D270/D293).
- UK English in all new comments/strings.
- Every numeric constant introduced must be commented with WHERE it came from (a
  measured value, a cited file/line) — this project's standing rule; no invented numbers.
- Do not touch the WebGL geometry/transform layer (`generative-background-transform.js`)
  or anything already covered by `verify-transform.mjs`/`fidelity-compare.mjs` — those
  are out of scope and must stay green (`npm run fidelity:compare` must still pass 3/3
  after your changes, since none of these fixes should move the geometry-fidelity
  numbers — re-run it and confirm).
- Build with `npx wp-scripts build --experimental-modules --webpack-copy-php` from
  `plugins/sgs-blocks` after every code change, and it must succeed.

## Task 1 (the only task): implement all six approved council-finding fixes

### 1a. Dark-ground opaque-alpha bug (the headline finding)

**Problem, confirmed by direct code read:** `buildFieldImageData()` in
`fx-generative-background.js` writes `data[i+3] = 255` unconditionally for every
pixel (line 347 as of this writing — verify the current line number) — the texture
carries no real transparency, even for the "white gap" pixels the alpha-composite
design intentionally produces (see D944). The fragment shader in
`generative-background.js` only ever reads `texture(u_texture, v_uv).rgb` (discards
alpha) and its final `outColour`'s alpha is a hardcoded `1.0` (see `main()`). Net
effect: on a DARK ground preset, the texture's "white gap" regions render as literal
opaque white patches instead of showing the client's actual dark ground colour.

**Fix (approved approach):**
1. In `buildFieldImageData()`, accumulate a real per-pixel coverage value alongside
   the existing `r`/`g`/`b` accumulation, using the SAME Porter-Duff "over" formula
   already used for colour (`coverage = a + coverage * (1 - a)` inside the existing
   per-blob loop, where `a` is the blob's already-computed alpha at that pixel).
   Write `data[i+3] = Math.round(coverage * 255)` instead of the hardcoded `255`.
2. In the fragment shader's `main()` (`generative-background.js`), sample the FULL
   `vec4` from `u_texture` and mix its RGB against `u_ground` using the real alpha,
   BEFORE the rest of the colour pipeline (grading, striation, lift, depth-fade,
   grain) runs on the result: `vec4 texSample = texture(u_texture, v_uv); vec3 colour
   = mix(u_ground, texSample.rgb, texSample.a);` — everything downstream is
   unaffected since it already operates on a plain `vec3 colour`.
3. `u_ground` already reaches the shader correctly (used today for the separate
   depth-fade effect) — do NOT add a new uniform; reuse it.
4. The existing depth-fade block (gated `groundLuma < 0.5`) must be left exactly
   as-is — it composes with this fix (distance-based fade on top of the
   coverage-based ground mix), it does not replace it.
5. **Before implementing, grep this codebase's other WebGL effects
   (`wave-gradient.js`, `aurora.js` if present under `src/shared/effects/`) for any
   use of `UNPACK_PREMULTIPLY_ALPHA_WEBGL` — if any of them sets it `true` globally in
   a way that could affect a NEW context, the mix formula in step 2 needs adjusting
   (premultiplied vs straight alpha). If none do, proceed with the straight-alpha
   `mix()` as written above.**

### 1b. Dark-ground light-theme-only grading/glow/striation constants

**Problem, confirmed by direct code read (`generative-background.js` +
`.claude/scratch/stripe-hero-poc/index.html` lines 223 and 236 + shader
`98230.glsl`):** `GRADE_CONTRAST`/`GRADE_SATURATION`/`GRADE_HUE_SHIFT` and the
glow/striation constants are ALL sourced from the reference's LIGHT-theme preset and
applied unconditionally regardless of ground. The reference's real DARK-theme preset
(`index.html` line 236) has different `colorSaturation` (1.15 vs light's 1) and
`colorHueShift` (-0.0315926535897932 vs light's -0.00159265358979299) — these two are
genuinely shared uniforms in both reference shaders and should vary by ground.
`colorContrast` is identical (1) in both — no dark variant needed there.

Separately, and more importantly: the dark reference shader (`98230.glsl`) declares
`u_glowAmount`/`u_glowPower`/`u_glowRamp` as uniforms but **never reads them in
`main()`** (confirmed: grep the file, they appear only in the declaration line) — the
whole glow-gate/fine-noise-striation/camera-facing-lift mechanism our engine runs
(`sgsGlowGate()`, `sgsStriationNoise()`, the `colour += (1.0-glowGate)*0.25` lift) is a
LIGHT-theme-only mechanism with no dark equivalent in the real reference at all. The
dark reference instead uses a completely different technique (periodic lines via
`u_lineAmount=425`) that our engine has never ported.

**Fix (approved approach — the MINIMAL, correctly-scoped one; do NOT do more):**
1. Add `DEFAULT_GRADE_SATURATION_DARK = 1.15` and
   `DEFAULT_GRADE_HUE_SHIFT_DARK = -0.0315926535897932` as named constants (comment:
   cite `.claude/scratch/stripe-hero-poc/index.html` dark preset, line 236). Contrast
   stays the single shared `1.0` — no dark variant.
2. At the point `u_contrast`/`u_saturation`/`u_hueShift` are uploaded
   (`gl.uniform1f(...)` call sites in `createGenerativeBackground()`), branch on
   `groundLuma` (computed from `opts.groundColour`/`DEFAULT_GROUND`, the SAME
   luminance formula the fragment shader already uses for its own `groundLuma` gate —
   keep both computations consistent) to pick the light or dark saturation/hue-shift
   value before upload.
3. In the fragment shader's `main()`, skip the glow-gate/striation-noise/camera-lift
   block entirely when `groundLuma < 0.5` (dark ground) — these three effects
   (`sgsGlowGate()`'s output feeding the striation term, and the `(1-glowGate)*0.25`
   lift) should not run at all for dark ground, since the real dark reference never
   runs this mechanism. Use the same `groundLuma` gate the depth-fade block already
   computes; do not add a second uniform for this.
4. **Explicitly OUT OF SCOPE for this task, do not build it:** porting the dark
   reference's real periodic-line texture mechanism as a replacement fine-texture
   effect for dark ground. Leave dark ground with grading + depth-fade only, no
   fine-texture, until a future task with its own design gate. Add a one-line code
   comment at the point you skip the glow/striation block noting this is deliberately
   deferred scope, not a forgotten case.

### 1c. Flat/low-movement region — real cause found, hypothesis in the council review REFUTED

**A parallel investigation this session tested the "camera-facing angle" hypothesis
directly (a UV-visualisation debug render of the real geometry) and DISPROVED it** —
`glowGate` is spatially near-uniform across the whole visible ribbon at the current
preset (194-198/255 in every screen-row band measured), so it cannot be the cause of a
bottom-specific flat region. **Do not re-litigate or re-implement anything related to
glowGate for this finding** — it was checked and is not the mechanism.

**The real, measured cause:** `sgsParabola(v_uv.x, u_parabolaPower)` (with
`DEFAULT_PARABOLA_POWER = 3.0`) drops `parabolaFalloff = 1 - sgsParabola(...)` fully to
zero at `v_uv.x = 0.5` — a complete striation blackout at the mesh's horizontal
midline. Direct measurement of the real render confirmed the on-screen luma dips to
its minimum (134/255, a ~31% drop from the surrounding peak) in exactly the screen
band where that midline currently lands at `PRESETS.light`.

**Fix (approved approach):**
1. In `generative-background.js`, where `parabolaFalloff` is computed and used
   (currently `colour += striationNoise * u_striationStrength * atten * glowGate *
   parabolaFalloff;`), change the falloff so it never reaches a true zero: replace
   `parabolaFalloff` with `mix(0.4, 1.0, parabolaFalloff)` (a floor of 0.4 — a
   reasonable starting value; comment it as "floor chosen for a visible screenshot
   check, not a measured constant — Bean may want to tune this after looking at the
   live result").
2. Do NOT change `u_parabolaPower`/`DEFAULT_PARABOLA_POWER` itself, and do NOT touch
   any geometry/fold/twist constant — this is a one-line shader change, nothing else.
3. After implementing, take a live screenshot (same demo page used throughout this
   session:
   `https://sandybrown-nightingale-600381.hostingersite.com/gate-generative-background-fidelity-check/`)
   and confirm by eye that the previously-flat lower region now shows visible
   striation texture. This is a look-and-feel check the implementer can do directly —
   it does not require Bean's sign-off to verify the mechanism worked, only to
   approve the final look.

### 1d. Missing decisions.md entry for commit `51ef364d5`

A parallel investigation already drafted the complete entry text. Read it from the
investigation report (ask the controller for the drafted D946 text if not already
provided in your dispatch) — **before pasting, re-run
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
yourself to get the CURRENT next number** (this is a shared, concurrently-edited file
— the number may have moved since the draft was written; renumber the drafted entry if
so) and paste at the very top of the file (most-recent-first convention).

### 1e. Colour-field regression safety net

A parallel investigation designed and proved a working prototype of
`scripts/generative-background/verify-field-texture.mjs` (Node + headless browser,
reusing `harness-lib.mjs`'s `serve()`, reading the real `buildFieldImageData()`
output's canvas pixels — NOT a reimplementation). Build the REAL version of this
script:

1. Measures `nearWhitePct`/`nearPurePct`/`meanInk`/`stdInk` (the same "how much ink is
   here" proxy already used throughout this session:
   `ink = 1 - min(R,G,B)/255`, near-white = `ink < 0.10`, near-pure = `ink > 0.90`)
   against the real shipped module's canvas output.
2. Test fixtures (lock these in as named, committed test palettes — do not invent new
   ones beyond what's listed here): (i) the current shipped demo palette (`#533AFD
   #FE86E9 #FE8D2C #9E5FE5`) — LIGHT-class threshold band: near-white 1-7%, std-dev
   0.10-0.22; (ii) a near-monochrome palette (reuse the one from the generalisation
   investigation: `#8B3A2B #B25A44 #5E2617 #D68B6F`) — same LIGHT-class band; (iii) a
   dark 4-colour palette (reuse `#1A1A2E #16213E #0F3460 #53354A` from the
   generalisation investigation) — needs its OWN, separate DARK-class threshold band,
   since the "near-pure" metric reads as much higher on any dark palette regardless of
   actual saturation (confirmed by measurement: this exact palette scored 44.72%
   near-pure on the current engine using the light-class band, which is a property of
   the metric on dark input, not a defect) — use near-white 1-7% (same, coverage is
   luminance-independent) but DROP the near-pure assertion for the dark fixture, or
   gate it at a much higher, separately-justified threshold (document your choice).
3. **Negative control — use the REAL historical regression, not a synthetic one:** a
   degenerate-palette negative control was tried during investigation and did NOT
   discriminate cleanly (a single-colour palette still produces real coverage
   variance from blob geometry alone). Instead, hardcode a second, deliberately
   OLD/WRONG copy of the blob parameters this session actually shipped and reverted —
   `N_BLOBS = 26` with `radius = (0.1 + rng()*0.12) * width` (the exact overcorrected
   config from the reverted commit, per D946) — run the SAME measurement against it
   using the shipped palette, and assert it correctly FAILS the light-class near-white
   band (it should land in the 24-35% range this session measured for that exact
   config). This proves the check can fail, using this project's own real history as
   the negative case, not an invented one.
4. Wire it as a standalone `npm run` script (name it `genbg:verify-field-texture`) in
   `plugins/sgs-blocks/package.json` — do NOT add it to `prebuild` (it needs a real
   browser + GPU-capable canvas, same reasoning already documented in
   `scripts/generative-background/README.md` for why `fidelity-compare.mjs` is
   deliberately excluded from `prebuild`).
5. Run it after building 1a/1b/1c and confirm the shipped code passes.

### 1f. Narrow-hue-palette editor warning + stale help text fix

**Two separate findings, fix both:**

1. **Stale, actively-wrong help text (fix regardless of anything else):** in
   `src/blocks/extensions/fx.js`, the "Colour 2" field's help text says "pick colours
   that sit NEXT TO each other on the colour wheel — opposite colours (e.g. blue and
   orange) blend through a muddy grey band." This describes the OLD, retired
   interpolation engine (`buildGradientImageData`, deleted at D944) and is now
   backwards: the CURRENT alpha-composite blob engine's real vulnerability, confirmed
   by measurement this session, is the OPPOSITE — colours that are too CLOSE together
   in hue produce a washed/muddy result; colours spread wide (even near-opposite ones
   like navy+gold) work fine. Rewrite this help text to say the opposite: encourage a
   WIDE hue spread across the four colours, not a narrow one.
2. **Editor warning for narrow hue spread (Bean's approved direction: warn, don't
   block).** Reuse the EXACT existing pattern already shipped in this codebase for
   this shape of problem: `sgs/site-header`'s `contrastSafe` mechanism
   (`src/blocks/site-header/edit.js` — read it for the pattern: a computed check run
   against the operator's own colour choices, a non-dismissible `<Notice
   status="warning">` naming the specific issue, no `onClick` auto-fix required if
   the pattern doesn't have one you can cleanly reuse — a plain warning notice is
   sufficient, do not build a novel "one-click fix" button unless the existing
   pattern makes it trivial to copy). Compute a simple hue-spread check on the four
   `fxGenColour1-4` values in `fx.js`'s editor component (convert to HSL, take the
   max pairwise circular hue distance across the four stops) and show a warning
   notice when the max spread is below a threshold. **Threshold: use 30 degrees** —
   the investigation's measured data showed genuinely washed palettes at 4-7 degrees
   spread and healthy results from 100+ degrees; 30 is a conservative floor beneath
   which to warn (comment this as "a conservative starting threshold — not
   independently re-validated below 30°; revisit if real client feedback disagrees").
   The warning text should name the problem in plain English (e.g. "These four
   colours are close together on the colour wheel — the background effect may look
   flat or washed out. Try picking colours from more different parts of the colour
   wheel.") and must NOT block saving/publishing.

## Verification (the implementer must do all of this before reporting DONE)

1. `cd plugins/sgs-blocks && npx wp-scripts build --experimental-modules --webpack-copy-php` succeeds.
2. `npm run fidelity:compare` still reports 3/3 rungs passing (geometry/shader fidelity
   must be unaffected — if it isn't, something in 1a/1b/1c touched more than intended).
3. `npm run genbg:verify-field-texture` (the new script) passes on the shipped config
   and correctly FAILS when pointed at the old reverted blob config (prove the
   negative control works).
4. Deploy to the canary (`python scripts/build-deploy.py --target sandybrown
   --blocks-only`) and take a live screenshot of the demo page confirming: (a) no
   obvious regression to the light-ground look already approved this session; (b) the
   previously-flat lower region now shows visible striation (1c); (c) the "Colour 2"
   help text now reads correctly (1f). Dark-ground and the narrow-hue warning notice
   should also be spot-checked live (create a temporary test page or use the block
   editor directly) — screenshot both.
5. Report DONE with: the commit(s), the test/build output, and the screenshots taken
   (describe what each shows, in plain English, for a non-coder to review).
