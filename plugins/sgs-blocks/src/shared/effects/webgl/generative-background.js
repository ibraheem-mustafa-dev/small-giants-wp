/**
 * SGS motion — generative background WebGL renderer (Spec 38; D874 technique
 * spec; D880 licence reversal; D882 three-layer mechanism). Tier W, THIRD
 * entry — v1.4, LAYERS 1 + 2 RESTORED AND NUMERICALLY VERIFIED (2026-08-29).
 *
 * ── PROVENANCE — read this before the geometry, and read it accurately ─────
 *
 * The fold mechanism here derives from Stripe's hero reference implementation
 * (studied via `.claude/scratch/stripe-hero-poc/`), under Bean's explicit,
 * twice-confirmed authorisation at D880, which reverses this project's
 * "describe the mechanism and reimplement, never copy" rule for this
 * mechanism specifically.
 *
 * ⚠ WHAT IS ACTUALLY REPRODUCED HERE, stated precisely. This paragraph has
 * been wrong TWICE in opposite directions and is now stated as checkable
 * facts only — a legal CONCLUSION does not belong in a tracked source file,
 * and the previous revision's blanket claim was falsified by a nine-line
 * diff during an adversarial-council fact-check (2026-08-29).
 *
 * Reproduced from the reference:
 *   - Its MEASURED CONSTANTS: rotation axis vectors, Euler angles, scale
 *     factors, twist frequencies and powers.
 *   - Its COMPOSITION ORDER and multiplication convention.
 *
 * NOT reproduced: the reference's own distinctive hash function (`xxhash`)
 * and its noise implementation appear nowhere here — zero matches by grep;
 * this file uses Ashima/Gustavson 3D simplex (MIT) instead.
 *
 * ⚠ Shared text that is NOT the reference's original expression, named
 * explicitly rather than glossed over: `sgsAxisAngle` below shares its three
 * local identifiers (`s`, `c`, `oc`) and term ordering with the reference's
 * equivalent, and `sgsShapingCurve` shares its body. Both are cases of two
 * parties independently copying the SAME PUBLIC SOURCE — the standard
 * axis-angle rotation matrix, and Iñigo Quilez's `expStep`, which the
 * reference file itself attributes to him. A previous revision of this
 * docblock claimed "function names, variable names and structure are ours",
 * which is not true of those two helpers.
 *
 * ⛔ No legal conclusion is drawn here, deliberately. KJC-4's recommended
 * UK IP solicitor's hour on the client-indemnity question has NOT happened,
 * and a tracked file asserting its own favourable verdict while noting that
 * gap is a liability rather than a defence. The operative constraints remain:
 * the palette PNG stays off-limits and unused (colour comes from the client's
 * own theme tokens through the OKLCH pipeline), and no reference file ships
 * in the product.
 *
 * ── THE MECHANISM HAS THREE LAYERS (D882) ─────────────────────────────────
 *
 * ⛔ This is the single thing most likely to be got wrong again, because it
 * already was: a session reading only `68467.glsl` in isolation found layer 3
 * there, concluded layers 1 and 2 did not exist, and DELETED the CPU fold.
 * The shader file was never the whole mechanism — the other two layers live
 * in the rig's own JavaScript.
 *
 *   1. CPU FOLD — one-time, at build time. Three bands split by local X,
 *      each warped by a cosine profile and re-angled differently, then two
 *      -90 degree rotations stand the sheet up. Lives in
 *      `generative-background-transform.js` (`buildFoldedGeometry`).
 *   2. OBJECT TRANSFORM — static per preset: position, a large Z rotation,
 *      and a NON-UNIFORM scale. This is what produces the dramatic diagonal,
 *      off-frame composition. Also in the transform module
 *      (`composeModelMatrix`), applied AFTER the twist, via the one matrix
 *      uniform.
 *   3. PER-FRAME GPU TWIST — three chained axis-angle rotations whose angles
 *      are a fixed function of UV (not time), plus noise displacement. The
 *      vertex shader below.
 *
 * Per-vertex order: folded rest position (1) -> displacement -> three twist
 * rotations (3) -> model matrix (2) -> view -> projection. Layer 2 lands
 * AFTER the twist, exactly as the reference composes it; baking it into the
 * geometry buffer instead would scale and rotate the twist itself.
 *
 * ⚠ The three rotations use the reference's LITERAL axis vectors
 * `(0.5,0,0.5)` and `(0,0.5,0.5)`, chained A -> B -> A, in ROW-VECTOR order
 * (`v * M`, not `M * v`). All three details are load-bearing and each has
 * been got wrong at least once. Row-vector vs column-vector is not a style
 * choice: `v * M` equals `transpose(M) * v`, which for a rotation matrix is
 * the same matrix built from the NEGATED angle — so the column-vector version
 * silently rotates the opposite way on all three rotations while looking
 * entirely plausible. Bean caught that one by eye ("same shape, just bigger").
 *
 * ── VERIFICATION — numbers, not screenshots ───────────────────────────────
 *
 * `scripts/generative-background/extract-reference-matrices.mjs` pulls the
 * real `modelViewMatrix`/`projectionMatrix` out of the running reference rig;
 * `verify-transform.mjs` imports THIS ENGINE'S OWN transform module and
 * checks it reproduces them, with negative controls proving the check can
 * still fail. Run both before trusting any change to layers 1 or 2. D882
 * named "the verification is in a scratch Node script, not yet wired into
 * `generative-background.js`" as the outstanding gap; the transform module
 * exists as a separate importable file precisely to close it.
 *
 * ⛔ Do not verify this by screenshot alone. A screenshot already passed the
 * build that was rotating the wrong way on every axis.
 *
 * ── CAMERA (no scene graph — one baked orthographic matrix) ────────────────
 *
 * One combined projection × view × model matrix, rebuilt on resize and
 * uploaded as a single `mat4` uniform. Orthographic; the frustum is sized
 * from the CSS canvas box in the geometry's own world units, matching the
 * reference. Rotation lives in the vertex shader (layer 3) and the model
 * matrix (layer 2) — never a third time in the view.
 *
 * ⚠ The previous build's `CROP_ZOOM`/`CROP_OFFSET` frustum hack is GONE. It
 * shrank and shifted the viewing window to fake an off-centre composition,
 * because layer 2 — the thing that genuinely produces one — was missing. With
 * layer 2 restored the crop actively fights it. Do not reintroduce a second
 * framing mechanism; change the preset instead and re-run the verifier.
 *
 * The simplex-noise GLSL below is the SAME Ashima Arts/Stefan Gustavson (MIT)
 * function `wave-gradient.js` already ships — duplicated here rather than
 * imported, because that file carries an explicit "do not touch" constraint
 * (FR-38-31 is closed). Same documented-duplicate pattern `motion-utils.js`
 * uses for `isNativeHorizontalScroller()`.
 *
 * ── VERTEX ADDENDUM (2026-08-28) — a fourth reference file, checked this
 *    session, showed one of the three chained rotation angles carrying a
 *    subtle TIME-based wobble rather than being purely UV-driven like the
 *    other two. Rotation 2 (axis B, the first `v_uv.y`-driven angle) now
 *    subtracts `noiseWobble * 0.1` from its frequency term before the
 *    shaping curve applies, where `noiseWobble` is ONE extra sample of the
 *    same simplex-noise function already reused for displacement above,
 *    evaluated at the OTHER uv axis and time (`v_uv.x * 2.0`, `u_time`).
 *    This makes the fold shape itself subtly shift and breathe over time, on
 *    top of the existing vertical-displacement animation — cheap (one extra
 *    noise sample) and does not touch rotations 1 or 3. ──────────────────────
 *
 * ── COLOUR (§2) / STRIATIONS (§3) / DEPTH FADE / GRAIN (§4) ─────────────────
 *
 * Grading (§2) is unchanged from the v1.1 build. The fine-line striation and
 * depth-fade mechanisms were REBUILT this session (2026-08-28) against the
 * real reference fragment shaders: a screen-space-derivative "glow gate"
 * (high where the folded surface turns away from the camera, via `dFdy` of
 * the UV) gates a two-layer simplex-noise fine-texture contribution, added
 * to the sampled palette colour BEFORE grading runs. The v1.1 build's plain
 * periodic-line `striations()` function (the reference's OTHER, dark-theme
 * technique) is kept as a lower-priority secondary detail layer, applied
 * after grading exactly as before. A separate, simpler depth-fade mechanism
 * mixes the final colour toward the `--sgs-genbg-ground` colour using the
 * vertex's own clip-space Z (passed through as a new `v_depth` varying) —
 * points further from the camera recede into the background. Hash-based
 * grain (§4) is unchanged, applied last.
 *
 * ── OUT OF SCOPE ────────────────────────────────────────────────────────────
 *
 * §7 (the angular-blur post pass) is explicitly excluded — it needs its own
 * design gate (D479 reopening), not an increment here.
 *
 * @package
 */

import { probeSurface } from './capability';

import {
	buildFoldedGeometry,
	buildTransform,
	PRESETS,
} from './generative-background-transform';

/*
 * ── Animation defaults — the reference preset, NOT a retune of it ───────────
 *
 * ⚠ These were previously "pushed past" the reference's own calibration values
 * on the reasoning that the brief wanted more dramatic self-overlap than the
 * reference produces. That reasoning was sound but aimed at the wrong layer:
 * the drama comes from the object-level transform (layer 2 — a ~107 degree Z
 * rotation and a non-uniform 9/8/5 scale), which was entirely absent from the
 * build at the time. Over-driving the twist to compensate for a missing
 * transform produced a busier fold, not a bolder composition, which is exactly
 * what "same shape, just bigger" described.
 *
 * ⛔ WHAT ACTUALLY CHANGED, corrected 2026-08-29. An earlier note here (and
 * commit b4ce49771's message) said the old values were "inflated ~45%", which
 * narrates a tidy scalar correction over what was really a SIGN and
 * ASSIGNMENT correction — the same class of error as the row-vector bug this
 * file elsewhere congratulates itself for catching. Measured against
 * `PRESETS.light`:
 *   - displacement amount  11.5  ->  -7.821   (1.47x AND sign-inverted)
 *   - twist frequencies    [-0.94, 0.6, -0.84] -> [0.41, -0.65, -0.58]
 *                          (two of three SIGN-INVERTED, not scaled)
 *   - shaping powers       [4.6, 1.0, 5.1]  ->  [0.7, 3.63, 3.95]
 *                          (wholly RE-ASSIGNED between slots, not scaled)
 * Only the displacement magnitude was ever a percentage change.
 *
 * With layer 2 present these go back to the reference's measured values so the
 * three layers compose as they were tuned to. They remain per-instance
 * overridable via `opts`; retune from HERE if the look needs it, not from the
 * old inflated numbers.
 */
const REFERENCE_PRESET = PRESETS.light;
const DEFAULT_DISPLACEMENT_AMOUNT = REFERENCE_PRESET.displaceAmount;
const DEFAULT_DISPLACEMENT_FREQ_X = REFERENCE_PRESET.displaceFrequencyX;
const DEFAULT_DISPLACEMENT_FREQ_Z = REFERENCE_PRESET.displaceFrequencyZ;
const DEFAULT_FOLD_FREQ = REFERENCE_PRESET.twistFrequency;
const DEFAULT_FOLD_POWER = REFERENCE_PRESET.twistPower;

/*
 * ── Grading + glow-gate + fine-noise defaults — MEASURED FROM THE REFERENCE,
 *    not tuned by eye (corrected 2026-09-03, systematic-debugging root-cause
 *    fix, D926/D927). ─────────────────────────────────────────────────────
 *
 * Every constant below was WRONG — this file previously asserted these were
 * "tuned against the live canary rather than transferred from the reference
 * ... not transferable as literals", which is true of the depth-fade SCALE
 * (a frustum-scoped constant, genuinely not portable) but was never true of
 * these: they are read directly off `.claude/scratch/stripe-hero-poc/`, the
 * reference rig, and are exactly as portable as the layer-1/2 transform
 * constants D882/D886 already ported the same way.
 *
 * GRADE_CONTRAST/SATURATION/HUE_SHIFT — the light-theme preset `P` in
 * index.html:221-232 (`colorContrast: 1, colorSaturation: 1,
 * colorHueShift: -0.00159265358979299`), not an invented "near-identity"
 * choice.
 *
 * DEFAULT_GLOW_AMOUNT/POWER/RAMP — same `P` preset (`glowAmount: 1.98,
 * glowPower: 0.806, glowRamp: 0.834`). The previous value
 * (`glowAmount: 40.0`) was ~20x the reference's — the single biggest
 * miscalibration found, and load-bearing: this uniform gates BOTH the
 * fine-noise contribution below AND the camera-facing lift.
 *
 * DEFAULT_STRIATION_STRENGTH/FREQ/COLOUR_ATTENUATION/PARABOLA_POWER — NOT
 * preset-driven; hardcoded literals inside the reference's `surfaceColor()`
 * (`shaders/39798.glsl:267-270`: `strength = 0.2; freq = 600.0;
 * colorAtten = 0.9; paraPow = 3.0`). Confirmed `USE_NOISE_BANDS` is NOT
 * defined on the live hero (index.html:369 — "noise bands exist but ...
 * are inert"), so these plain literals are what the light theme actually
 * uses, not the conditionally-compiled per-band override path.
 */
const GRADE_CONTRAST = 1.0;
const GRADE_SATURATION = 1.0;
const GRADE_HUE_SHIFT = -0.00159265358979299;

/*
 * ── Dark-ground grade variants — MEASURED FROM THE REFERENCE'S OWN DARK
 *    PRESET, not invented (`.claude/scratch/stripe-hero-poc/index.html:236`:
 *    `colorSaturation: 1.15, colorHueShift: -0.0315926535897932`). Contrast
 *    is identical in both presets (1.0) so has no dark variant. Selected by
 *    `isDarkGround` at upload time, alongside the same `groundLuma` gate the
 *    fragment shader's depth-fade block already computes.
 */
const DEFAULT_GRADE_SATURATION_DARK = 1.15;
const DEFAULT_GRADE_HUE_SHIFT_DARK = -0.0315926535897932;

const DEFAULT_GLOW_AMOUNT = 1.98;
const DEFAULT_GLOW_POWER = 0.806;
const DEFAULT_GLOW_RAMP = 0.834;
const DEFAULT_STRIATION_STRENGTH = 0.2;
const DEFAULT_STRIATION_FREQ = 600.0;
const DEFAULT_COLOUR_ATTENUATION = 0.9;
const DEFAULT_PARABOLA_POWER = 3.0;

/*
 * ── Depth fade — DARK-GROUND ONLY, matching the reference exactly ─────────
 * `shaders/39798.glsl` (light theme) has NO depth/fog/ground-mix mechanism
 * anywhere in it. `shaders/98230.glsl` (dark theme) DOES have one —
 * structurally the same "mix toward the ground colour as distance
 * increases" shape (`depthFade = clamp(0,1, z*6.0); color = mix(u_clearColor,
 * color, a*(1-depthFade))`) — so this is a real, reference-backed mechanism
 * for the dark preset, not an invention, and is now gated to apply ONLY when
 * `u_ground` is dark (see FRAGMENT_SHADER main()). `DEFAULT_DEPTH_FADE_SCALE`
 * stays a local tuning constant (the reference's own `z*6.0` is scoped to
 * ITS frustum/camera, genuinely not a portable literal — see `resize()`'s
 * frustum-sizing comment) and stays NOT exposed as a client control.
 */
const DEFAULT_DEPTH_FADE_SCALE = 2.0;
const DEFAULT_GROUND = [ 0.98, 0.98, 0.97 ];

/*
 * ── Internal time scale — MEASURED FROM THE REFERENCE, not a guess ────────
 * The reference's own vertex shader scales its raw time uniform before it
 * ever reaches the noise/displacement functions:
 * `shaders/68467.glsl:230` — `displace(uv, position, u_time * u_speed, ...)`,
 * with `u_speed = 4e-5` (`index.html`'s light AND dark presets both use this
 * exact value). Its `u_time` itself is uploaded in MILLISECONDS
 * (`timeOffset + seconds*1000`), so the effective phase advances at
 * `1000 * 4e-5 = 0.04` per real second — independently re-derived the same
 * way by `fidelity-compare.mjs`'s own `RIG_SPEED` constant.
 *
 * This engine's `draw(seconds)` receives real elapsed SECONDS already (not
 * milliseconds), and previously uploaded them to `u_time` completely
 * unscaled — with no equivalent of the reference's `u_speed` at all. That
 * made the noise phase advance ~25x faster than the reference (1.0/s vs
 * the reference's 0.04/s), which is what "ours is super fast" (Bean,
 * 2026-09-03) was actually measuring. `TIME_SCALE` is the missing
 * multiplier, applied so the client-facing `speed` option's default (1)
 * now means "the reference's own real-world pace", not "raw seconds".
 */
export const TIME_SCALE = 0.04;

/*
 * ── Ashima Arts / Stefan Gustavson 3D simplex noise (MIT) ──────────────────
 * Duplicated verbatim from `wave-gradient.js` — see module docblock for why
 * this is a documented duplicate, not an import.
 */
const SIMPLEX_3D = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
	const vec2 C=vec2(1.0/6.0,1.0/3.0);
	const vec4 D=vec4(0.0,0.5,1.0,2.0);
	vec3 i=floor(v+dot(v,C.yyy));
	vec3 x0=v-i+dot(i,C.xxx);
	vec3 g=step(x0.yzx,x0.xyz);
	vec3 l=1.0-g;
	vec3 i1=min(g.xyz,l.zxy);
	vec3 i2=max(g.xyz,l.zxy);
	vec3 x1=x0-i1+C.xxx;
	vec3 x2=x0-i2+C.yyy;
	vec3 x3=x0-D.yyy;
	i=mod289(i);
	vec4 p=permute(permute(permute(
		i.z+vec4(0.0,i1.z,i2.z,1.0))
		+i.y+vec4(0.0,i1.y,i2.y,1.0))
		+i.x+vec4(0.0,i1.x,i2.x,1.0));
	float n_=0.142857142857;
	vec3 ns=n_*D.wyz-D.xzx;
	vec4 j=p-49.0*floor(p*ns.z*ns.z);
	vec4 x_=floor(j*ns.z);
	vec4 y_=floor(j-7.0*x_);
	vec4 x=x_*ns.x+ns.yyyy;
	vec4 y=y_*ns.x+ns.yyyy;
	vec4 h=1.0-abs(x)-abs(y);
	vec4 b0=vec4(x.xy,y.xy);
	vec4 b1=vec4(x.zw,y.zw);
	vec4 s0=floor(b0)*2.0+1.0;
	vec4 s1=floor(b1)*2.0+1.0;
	vec4 sh=-step(h,vec4(0.0));
	vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
	vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
	vec3 p0=vec3(a0.xy,h.x);
	vec3 p1=vec3(a0.zw,h.y);
	vec3 p2=vec3(a1.xy,h.z);
	vec3 p3=vec3(a1.zw,h.w);
	vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
	p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
	vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
	m=m*m;
	return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;


const VERTEX_SHADER = `#version 300 es
in vec3 a_position;
in vec2 a_uv;

uniform mat4 u_projection;
uniform float u_time;
uniform float u_dispAmount;
uniform float u_dispFreqX;
uniform float u_dispFreqZ;
uniform float u_foldFreq[3];
uniform float u_foldPower[3];

out vec2 v_uv;
out float v_depth;

${ SIMPLEX_3D }

/*
 * Rodrigues' rotation-matrix formula — a public, textbook linear-algebra
 * identity (not third-party source): the rotation matrix that turns a
 * vector by angle radians about a unit axis.
 */
mat3 sgsAxisAngle( vec3 axis, float angle ) {
	vec3 a = normalize( axis );
	float s = sin( angle );
	float c = cos( angle );
	float oc = 1.0 - c;
	return mat3(
		oc * a.x * a.x + c,        oc * a.x * a.y - a.z * s,  oc * a.z * a.x + a.y * s,
		oc * a.x * a.y + a.z * s,  oc * a.y * a.y + c,        oc * a.y * a.z - a.x * s,
		oc * a.z * a.x - a.y * s,  oc * a.y * a.z + a.x * s,  oc * a.z * a.z + c
	);
}

/*
 * Iñigo Quilez's public generic shaping function (iquilezles.org/articles/
 * functions) — an exponential falloff shaped by a power curve. Public
 * shaping-function library, same free-to-use category as the OKLCH formulas
 * already implemented in this codebase (fx-generative-background.js).
 */
float sgsShapingCurve( float x, float n ) {
	return exp2( -exp2( n ) * pow( max( x, 0.0 ), n ) );
}

void main() {
	v_uv = a_uv;

	// The reference's literal axis vectors — ported directly, D880.
	vec3 axisA = vec3( 0.5, 0.0, 0.5 );
	vec3 axisB = vec3( 0.0, 0.5, 0.5 );

	// 1. DISPLACEMENT ("breathing"), applied to the REST position, along the
	// plane's own local UP axis (Y) — before any rotation. Single noise
	// sample, not summed (technique spec, Animation subsection correction).
	float n = snoise( vec3(
		a_position.x * u_dispFreqX + u_time,
		a_position.z * u_dispFreqZ + u_time,
		0.0
	) );
	vec3 displaced = a_position + vec3( 0.0, 1.0, 0.0 ) * n * u_dispAmount;

	// 2. THREE CHAINED ROTATIONS. Each angle is a fixed function of the
	// vertex's own UV, NOT of time — so the folded shape is static
	// frame-to-frame even though it is recomputed every frame. Rotation 2
	// alone gets a small TIME-based wobble on top of its UV-driven angle (a
	// fourth reference file, checked 2026-08-28 — module docblock's "VERTEX
	// ADDENDUM"): one extra noise sample, reusing the same simplex function
	// as the displacement above, evaluated at the OTHER uv axis and time.
	float noiseWobble = snoise( vec3( v_uv.x * 2.0, u_time, 0.0 ) );
	float angle1 = u_foldFreq[ 0 ] * sgsShapingCurve( v_uv.x, u_foldPower[ 0 ] );
	float angle2 = ( u_foldFreq[ 1 ] - noiseWobble * 0.1 ) * sgsShapingCurve( v_uv.y, u_foldPower[ 1 ] );
	float angle3 = u_foldFreq[ 2 ] * sgsShapingCurve( v_uv.y, u_foldPower[ 2 ] );

	// ROW-VECTOR convention (v times M), matching the reference exactly —
	// NOT M times v. For an orthogonal rotation matrix these are NOT the
	// same operation: v times M equals transpose(M) times v, which for a
	// rotation matrix built from (axis, angle) equals M built from
	// (axis, -angle). The previous build used M times v with the same
	// axes/angles and so was silently rotating the OPPOSITE way on every
	// one of the three chained rotations — a real structural bug, not a
	// style difference, found by comparing directly against the reference
	// file's own multiplication order (D880 literal-port pass, 2026-08-28).
	vec3 folded = displaced * sgsAxisAngle( axisA, angle1 );
	folded = folded * sgsAxisAngle( axisB, angle2 );
	folded = folded * sgsAxisAngle( axisA, angle3 );

	gl_Position = u_projection * vec4( folded, 1.0 );
	// Clip-space Z, passed through for the fragment shader's depth fade (§2) —
	// the CAMERA section's provable bounding sphere already gives this a
	// known, testable range (see the resize() frustum-sizing comment).
	v_depth = gl_Position.z;
}`;

/*
 * FRAGMENT_SHADER — notes kept here in a stripped JS comment rather than as
 * GLSL comments inside the string below, which ships to the browser
 * byte-for-byte (this file breached its bundle-size budget once these got
 * verbose inline during the D926/D927 investigation).
 *
 * u_silhouetteDebug — DEBUG-ONLY, DEFAULT OFF, never touched by shipped code
 * paths (fx-generative-background.js never sets it, so every real page
 * reads GLSL's own zero-init false). General-purpose diagnostic
 * infrastructure (systematic-debugging, 2026-09-03) isolating layers 1-3's
 * on-screen footprint from every fragment effect, for fidelity checks. Do
 * not wire to any client-facing control.
 *
 * The old §3(b) "legacy periodic-line striation" term, deleted from main()
 * below (D926/D927): hardcoded 425.0 as its line frequency — the
 * reference's DARK-theme preset's lineAmount (index.html:244), not the
 * light theme's (lineAmount: 1, index.html:231) — and the light theme's
 * own real fragment shader (shaders/39798.glsl, read in full) never
 * references u_lineAmount/u_lineThickness/u_lineDerivativePower at all.
 * Ported from the wrong preset into a build only ever compared against the
 * light one. Isolating it alone recovered 62% of the measured
 * silhouette-coverage deficit — the single largest fragment-effect
 * contributor found.
 *
 * Depth fade (main(), gated on groundLuma < 0.5): shaders/39798.glsl
 * (light theme) has no depth/fog/ground-mix mechanism anywhere in it;
 * shaders/98230.glsl (dark theme) does have one, structurally the same
 * "recede toward the ground colour with distance" shape. Gating on the
 * ground colour's own luminance needs no extra uniform and matches the
 * reference's actual per-theme behaviour instead of always running.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_hueShift;
uniform float u_time;
uniform float u_glowAmount;
uniform float u_glowPower;
uniform float u_glowRamp;
uniform float u_striationStrength;
uniform float u_striationFreq;
uniform float u_colourAttenuation;
uniform float u_parabolaPower;
uniform float u_depthFadeScale;
uniform vec3 u_ground;
uniform bool u_silhouetteDebug;

in vec2 v_uv;
in float v_depth;
out vec4 outColour;

${ SIMPLEX_3D }

/*
 * §2 — near-identity grading. No gradient/lerp maths here: the texture
 * already carries the OKLCH-interpolated colour (fx-generative-background.js).
 */
vec3 grade( vec3 c ) {
	c = ( c - 0.5 ) * u_contrast + 0.5;
	float luma = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	c = mix( vec3( luma ), c, u_saturation );
	if ( abs( u_hueShift ) > 0.0001 ) {
		float ca = cos( u_hueShift );
		float sa = sin( u_hueShift );
		mat3 hueRot = mat3(
			0.299 + 0.701 * ca + 0.168 * sa, 0.587 - 0.587 * ca + 0.330 * sa, 0.114 - 0.114 * ca - 0.497 * sa,
			0.299 - 0.299 * ca - 0.328 * sa, 0.587 + 0.413 * ca + 0.035 * sa, 0.114 - 0.114 * ca + 0.292 * sa,
			0.299 - 0.300 * ca + 1.25 * sa,  0.587 - 0.588 * ca - 1.05 * sa,  0.114 + 0.886 * ca - 0.203 * sa
		);
		c = hueRot * c;
	}
	return clamp( c, 0.0, 1.0 );
}

/*
 * §3(a) — light-theme fine-line striation / glow-gate layer, rebuilt
 * 2026-08-28 against the real reference fragment shaders. dFdy of the UV
 * is HIGH where the folded surface is turning away from the camera (many UV
 * rows compressed into few screen pixels) and LOW where it faces the camera
 * flat-on — used to gate where the fine texture below is visible at all.
 */
float sgsGlowGate( vec2 uv ) {
	float d = dFdy( uv.y ) * u_glowAmount;
	d = clamp( d * 0.5 + 0.5, 0.0, 1.0 );
	d = pow( d, u_glowPower );
	d = smoothstep( 0.0, u_glowRamp, d );
	return clamp( d, 0.0, 1.0 );
}

/*
 * Iñigo Quilez's public parabola shaping function (iquilezles.org/articles/
 * functions) — same free-to-use category as sgsShapingCurve in the vertex
 * shader. Peaks at x=0.5, falls to 0 at the UV extremes.
 */
float sgsParabola( float x, float k ) {
	return pow( 4.0 * x * ( 1.0 - x ), k );
}

/*
 * §3(a) continued — two layered simplex-noise samples build the fine
 * texture: a low-frequency "wander" value, then a much-higher-frequency
 * sample whose OWN frequency is modulated by the first, giving the striation
 * pattern an organic, non-repeating drift rather than a uniform weave.
 */
float sgsStriationNoise( vec2 uv ) {
	float wander = snoise( vec3( uv.x * 0.1, uv.y * 0.5, 0.0 ) );
	float highFreq = snoise( vec3(
		uv.x * ( u_striationFreq + u_striationFreq * 0.5 * wander ),
		uv.y * 4.0 * wander,
		0.0
	) );
	return highFreq * 0.5 + 0.5;
}

/* §4 — hash-based grain, five lines, no texture. */
float grain( vec2 fragCoord ) {
	vec3 p3 = fract( vec3( fragCoord.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

void main() {
	// Debug silhouette isolation (u_silhouetteDebug, see its JS-side doc).
	// Magenta, not white — ground/background are near-white.
	if ( u_silhouetteDebug ) {
		outColour = vec4( 1.0, 0.0, 1.0, 1.0 );
		return;
	}

	// D946/1a — sample the FULL texel (colour + real coverage alpha, see
	// buildFieldImageData()'s Porter-Duff coverage accumulation) and mix
	// its colour against the client's own ground colour using that alpha,
	// BEFORE any of the grading/striation pipeline runs. Without this, a
	// white-gap texel (alpha near 0, RGB near-white) painted straight to
	// screen would show literal opaque white regardless of ground preset —
	// this is what made a dark-ground instance show white smudges.
	vec4 texSample = texture( u_texture, v_uv );
	vec3 colour = mix( u_ground, texSample.rgb, texSample.a );

	// Ground luminance decides both which grading constants were uploaded
	// (see the JS-side isDarkGround branch at uniform-upload time) and
	// whether the light-theme-only fine-texture mechanism below runs at all.
	// Computed once, before it's needed, so both the striation gate and the
	// depth-fade gate further down read the exact same value.
	float groundLuma = dot( u_ground, vec3( 0.299, 0.587, 0.114 ) );
	bool isDarkGround = groundLuma < 0.5;

	// §3(a) fine-line striation / glow-gate — matches surfaceColor() in
	// shaders/39798.glsl (constants: see DEFAULT_STRIATION_* declarations).
	// D946/1b — LIGHT-GROUND ONLY: the real dark-theme reference
	// (shaders/98230.glsl) declares u_glowAmount/u_glowPower/u_glowRamp but
	// never reads them in main() at all — this whole mechanism (glow-gate,
	// fine-noise striation, and the camera-facing lift below) has no dark
	// equivalent in the reference, so it is skipped entirely for dark ground
	// rather than run with borrowed light-theme numbers. glowGate is left
	// at a neutral 1.0 so nothing downstream that might read it degrades.
	// The real dark-theme technique (periodic lines, u_lineAmount around
	// 425) is deliberately DEFERRED, not forgotten — porting it is new
	// scope needing its own design gate (see D926/D927: a technique ported
	// from the wrong preset once caused a large, wrong regression).
	float glowGate = 1.0;
	if ( ! isDarkGround ) {
		glowGate = sgsGlowGate( v_uv );
		float striationNoise = sgsStriationNoise( v_uv );
		float atten = 1.0 - colour.b * u_colourAttenuation;
		// D946/1c — floored, not a bare 0-to-1 falloff: sgsParabola reaches
		// exactly 1.0 at v_uv.x=0.5, so 1.0 minus sgsParabola(...) used to
		// hit a true zero at the mesh's horizontal midline — a total
		// striation blackout measured as a ~31% luma dip landing in the
		// visually prominent lower third of the ribbon at this preset.
		// mix(0.4, 1.0, ...) keeps the same falloff shape (still darkest at
		// the midline) without ever reaching a full blackout. 0.4 is a
		// starting value for a visible screenshot check, not an
		// independently re-measured constant — Bean may want to tune it
		// after looking at the live result.
		float parabolaFalloff = mix( 0.4, 1.0, 1.0 - sgsParabola( v_uv.x, u_parabolaPower ) );
		colour += striationNoise * u_striationStrength * atten * glowGate * parabolaFalloff;
	}

	colour = grade( colour );

	// Camera-facing lift — matches shaders/39798.glsl's
	// "color += (1.0 - pdy) * 0.25" exactly. (The old §3(b) legacy
	// periodic-line term that used to sit here is deleted — D926/D927.)
	// Light-ground only, same reasoning as the striation block above:
	// glowGate is neutral (1.0) for dark ground, so this term is already a
	// no-op there, but the if keeps the intent explicit rather than
	// relying on the neutral value silently cancelling it.
	if ( ! isDarkGround ) {
		colour += ( 1.0 - glowGate ) * 0.25;
	}

	// Depth fade, dark-ground only — D926/D927; see FRAGMENT_SHADER's JS
	// doc comment above for why.
	if ( isDarkGround ) {
		float depthFade = clamp( v_depth * u_depthFadeScale, 0.0, 1.0 );
		colour = mix( colour, u_ground, depthFade );
	}

	float g = ( grain( gl_FragCoord.xy ) - 0.5 ) * ( 8.0 / 255.0 );
	colour += g;

	outColour = vec4( clamp( colour, 0.0, 1.0 ), 1.0 );
}`;

/**
 * Compile one shader stage, returning null on failure rather than throwing.
 *
 * @param {WebGL2RenderingContext} gl     Context.
 * @param {number}                 type   gl.VERTEX_SHADER or gl.FRAGMENT_SHADER.
 * @param {string}                 source GLSL.
 * @return {WebGLShader|null} The shader, or null.
 */
function compile( gl, type, source ) {
	const shader = gl.createShader( type );
	if ( ! shader ) {
		return null;
	}
	gl.shaderSource( shader, source );
	gl.compileShader( shader );
	if ( ! gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
		gl.deleteShader( shader );
		return null;
	}
	return shader;
}

/**
 * Create the generative-background WebGL2 renderer bound to a canvas.
 *
 * Returns `null` on any failure — no WebGL2, a shader that will not compile, a
 * program that will not link, no texture source. The caller treats null as
 * "leave the 2D-canvas/CSS fallback visible" (Tier W's fail-open contract).
 *
 * Geometry building is now SYNCHRONOUS — the flat rest-pose grid this build
 * uses is a trivial CPU cost (no fold, no bands, no per-vertex normals), so
 * the Worker/Blob machinery the previous CPU-fold build needed is gone. The
 * function stays `async` and Promise-returning purely to keep the caller's
 * existing `await createGenerativeBackground(...)` contract unchanged.
 *
 * @param {HTMLCanvasElement}    canvas          Target canvas.
 * @param {Object}               opts            Options.
 * @param {HTMLCanvasElement|HTMLImageElement} opts.textureSource Already-painted
 *   OKLCH gradient (the Step-1 2D canvas), used as the colour texture (§2).
 * @param {number}               [opts.speed]        Time-scale multiplier, default 1.
 * @param {number}               [opts.dispAmount]    Displacement magnitude, world units.
 * @param {number}               [opts.dispFreqX]     Displacement noise frequency, X.
 * @param {number}               [opts.dispFreqZ]     Displacement noise frequency, Z.
 * @param {number}               [opts.foldFreq1]     Rotation 1 (axis A) angle scale, radians.
 * @param {number}               [opts.foldFreq2]     Rotation 2 (axis B) angle scale, radians.
 * @param {number}               [opts.foldFreq3]     Rotation 3 (axis A) angle scale, radians.
 * @param {number}               [opts.foldPower1]    Rotation 1 shaping-curve power.
 * @param {number}               [opts.foldPower2]    Rotation 2 shaping-curve power.
 * @param {number}               [opts.foldPower3]    Rotation 3 shaping-curve power.
 * @param {number[]}             [opts.groundColour]  Ground colour, sRGB 0-1 [r,g,b], read
 *   from the element's own `--sgs-genbg-ground` custom property — the depth-fade target (§2).
 * @param {number}               [opts.glowAmount]        Glow-gate derivative scale.
 * @param {number}               [opts.glowPower]         Glow-gate exponent.
 * @param {number}               [opts.glowRamp]          Glow-gate smoothstep ramp.
 * @param {number}               [opts.striationStrength] Fine-texture contribution strength.
 * @param {number}               [opts.striationFreq]     Fine-texture high-frequency base.
 * @param {number}               [opts.colourAttenuation] Blue-channel attenuation of the fine texture.
 * @param {number}               [opts.parabolaPower]     Fine-texture UV-axis falloff shape power.
 * @param {Function}             [opts.onLost]        Called when the GPU context is lost.
 * @return {Promise<{draw: Function, resize: Function, destroy: Function}|null>}
 */
export async function createGenerativeBackground( canvas, opts = {} ) {
	if ( ! canvas || typeof canvas.getContext !== 'function' ) {
		return null;
	}
	if ( ! opts.textureSource ) {
		return null;
	}

	// Capability gate — same discipline as wave-gradient.js/aurora.js: proves a
	// real program can compile AND link on the actual driver, before this
	// effect ever opens its own context.
	if ( ! probeSurface() ) {
		return null;
	}

	const gl = canvas.getContext( 'webgl2', {
		antialias: false,
		// Alpha TRUE, deliberately: the ground colour is already painted by the
		// element's own CSS `background-color` (fx-generative-background.php's
		// ground token). Keeping this canvas transparent means the ground is
		// never duplicated/desynced between CSS and a gl.clearColor() call.
		alpha: true,
		/*
		 * ⛔ DEPTH IS REQUIRED — this was `false` and that was a real rendering
		 * bug, not an optimisation (found by adversarial council, 2026-08-29).
		 *
		 * The fold makes the sheet pass back over ITSELF: §1's third band
		 * mirrors in X (`x = -x`) specifically so one flank folds back across
		 * the others. Without a depth buffer, which surface is visible where
		 * they overlap is decided by TRIANGLE DRAW ORDER, not by which is
		 * nearer the camera. Along the overlap boundary — which runs diagonally
		 * across a regular triangle grid — that produces a jagged, triangle-
		 * aligned staircase rather than a clean silhouette edge.
		 *
		 * The reference does the same thing the same way: `depthWrite: true,
		 * depthTest: true` with `side: DoubleSide` (rig `index.html:377-378`).
		 *
		 * ⚠ This defect is INVISIBLE to the matrix verifier — the transforms
		 * are perfectly correct, and every vertex lands exactly where it
		 * should. Only the resolution between overlapping surfaces was wrong.
		 * A numeric transform check cannot see it; that is why it survived.
		 */
		depth: true,
		powerPreference: 'low-power',
		failIfMajorPerformanceCaveat: true,
	} );
	if ( ! gl ) {
		return null;
	}

	const vs = compile( gl, gl.VERTEX_SHADER, VERTEX_SHADER );
	const fs = compile( gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER );
	if ( ! vs || ! fs ) {
		return null;
	}
	const program = gl.createProgram();
	gl.attachShader( program, vs );
	gl.attachShader( program, fs );
	gl.linkProgram( program );
	gl.detachShader( program, vs );
	gl.detachShader( program, fs );
	gl.deleteShader( vs );
	gl.deleteShader( fs );
	if ( ! gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
		gl.deleteProgram( program );
		return null;
	}

	// LAYER 1 — the one-time CPU fold. Not a flat grid: the three-band cosine
	// warp and the two -90 degree rotations are baked in here, once, before
	// the shader's per-frame twist (layer 3) ever runs.
	const geometry = buildFoldedGeometry();

	// The canvas may have been destroyed while this ran — bail rather than
	// upload buffers into a context nobody will ever draw with.
	if ( gl.isContextLost() ) {
		gl.deleteProgram( program );
		return null;
	}

	gl.useProgram( program );

	const vao = gl.createVertexArray();
	gl.bindVertexArray( vao );

	/*
	 * Depth testing ON, face culling deliberately OFF.
	 *
	 * DEPTH_TEST is what makes the self-overlapping fold resolve by distance
	 * rather than by draw order — see the `depth: true` note at context
	 * creation for why this is a correctness requirement, not a nicety.
	 *
	 * ⛔ Do NOT add `gl.enable( gl.CULL_FACE )` as a "free" optimisation. The
	 * folded sheet is a single open surface that turns back on itself, so the
	 * camera sees BOTH of its faces — the reference renders it as
	 * `side: DoubleSide` for exactly this reason (rig `index.html:377`).
	 * Culling back faces would silently delete roughly half the ribbon, and it
	 * would do so in a way that looks like a geometry bug in the fold rather
	 * than a rasteriser setting.
	 */
	gl.enable( gl.DEPTH_TEST );
	gl.depthFunc( gl.LEQUAL );

	const posBuf = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, posBuf );
	gl.bufferData( gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW );
	const posLoc = gl.getAttribLocation( program, 'a_position' );
	gl.enableVertexAttribArray( posLoc );
	gl.vertexAttribPointer( posLoc, 3, gl.FLOAT, false, 0, 0 );

	const uvBuf = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, uvBuf );
	gl.bufferData( gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW );
	const uvLoc = gl.getAttribLocation( program, 'a_uv' );
	gl.enableVertexAttribArray( uvLoc );
	gl.vertexAttribPointer( uvLoc, 2, gl.FLOAT, false, 0, 0 );

	const indexBuf = gl.createBuffer();
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuf );
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW );
	const indexType =
		geometry.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
	const indexCount = geometry.indices.length;

	gl.bindVertexArray( null );

	// Texture — the Step-1 OKLCH-built canvas, uploaded ONCE. The caller
	// (fx-generative-background.js) re-invokes this factory whenever a colour
	// token changes, per the technique spec's "rebuild the texture whenever
	// the client changes any of the four colour tokens" (§2).
	const texture = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, texture );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, opts.textureSource );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );

	const u = ( name ) => gl.getUniformLocation( program, name );
	const projectionLoc = u( 'u_projection' );
	const timeLoc = u( 'u_time' );
	const textureLoc = u( 'u_texture' );

	const dispAmount =
		typeof opts.dispAmount === 'number' ? opts.dispAmount : DEFAULT_DISPLACEMENT_AMOUNT;
	const dispFreqX =
		typeof opts.dispFreqX === 'number' ? opts.dispFreqX : DEFAULT_DISPLACEMENT_FREQ_X;
	const dispFreqZ =
		typeof opts.dispFreqZ === 'number' ? opts.dispFreqZ : DEFAULT_DISPLACEMENT_FREQ_Z;
	const foldFreq = [
		typeof opts.foldFreq1 === 'number' ? opts.foldFreq1 : DEFAULT_FOLD_FREQ[ 0 ],
		typeof opts.foldFreq2 === 'number' ? opts.foldFreq2 : DEFAULT_FOLD_FREQ[ 1 ],
		typeof opts.foldFreq3 === 'number' ? opts.foldFreq3 : DEFAULT_FOLD_FREQ[ 2 ],
	];
	const foldPower = [
		typeof opts.foldPower1 === 'number' ? opts.foldPower1 : DEFAULT_FOLD_POWER[ 0 ],
		typeof opts.foldPower2 === 'number' ? opts.foldPower2 : DEFAULT_FOLD_POWER[ 1 ],
		typeof opts.foldPower3 === 'number' ? opts.foldPower3 : DEFAULT_FOLD_POWER[ 2 ],
	];

	gl.uniform1f( u( 'u_dispAmount' ), dispAmount );
	gl.uniform1f( u( 'u_dispFreqX' ), dispFreqX );
	gl.uniform1f( u( 'u_dispFreqZ' ), dispFreqZ );
	gl.uniform1fv( u( 'u_foldFreq[0]' ), foldFreq );
	gl.uniform1fv( u( 'u_foldPower[0]' ), foldPower );
	// D946/1b — ground colour resolved ONCE, here, ahead of the grading
	// uniforms below (`ground` itself is declared further down for the
	// depth-fade/§3(a) uniforms; both reads use the exact same
	// `opts.groundColour`/`DEFAULT_GROUND` fallback + luminance formula the
	// fragment shader's own `groundLuma` gate uses, so JS and GLSL never
	// disagree on which side of the light/dark line a preset falls).
	const groundForGrading = Array.isArray( opts.groundColour ) ? opts.groundColour : DEFAULT_GROUND;
	const groundLumaForGrading =
		0.299 * groundForGrading[ 0 ] + 0.587 * groundForGrading[ 1 ] + 0.114 * groundForGrading[ 2 ];
	const isDarkGround = groundLumaForGrading < 0.5;

	gl.uniform1f( u( 'u_contrast' ), GRADE_CONTRAST );
	gl.uniform1f( u( 'u_saturation' ), isDarkGround ? DEFAULT_GRADE_SATURATION_DARK : GRADE_SATURATION );
	gl.uniform1f( u( 'u_hueShift' ), isDarkGround ? DEFAULT_GRADE_HUE_SHIFT_DARK : GRADE_HUE_SHIFT );

	// Striation / glow-gate + depth-fade uniforms (§3, 2026-08-28 build).
	const glowAmount =
		typeof opts.glowAmount === 'number' ? opts.glowAmount : DEFAULT_GLOW_AMOUNT;
	const glowPower = typeof opts.glowPower === 'number' ? opts.glowPower : DEFAULT_GLOW_POWER;
	const glowRamp = typeof opts.glowRamp === 'number' ? opts.glowRamp : DEFAULT_GLOW_RAMP;
	const striationStrength =
		typeof opts.striationStrength === 'number'
			? opts.striationStrength
			: DEFAULT_STRIATION_STRENGTH;
	const striationFreq =
		typeof opts.striationFreq === 'number' ? opts.striationFreq : DEFAULT_STRIATION_FREQ;
	const colourAttenuation =
		typeof opts.colourAttenuation === 'number'
			? opts.colourAttenuation
			: DEFAULT_COLOUR_ATTENUATION;
	const parabolaPower =
		typeof opts.parabolaPower === 'number' ? opts.parabolaPower : DEFAULT_PARABOLA_POWER;
	const ground = Array.isArray( opts.groundColour ) ? opts.groundColour : DEFAULT_GROUND;

	gl.uniform1f( u( 'u_glowAmount' ), glowAmount );
	gl.uniform1f( u( 'u_glowPower' ), glowPower );
	gl.uniform1f( u( 'u_glowRamp' ), glowRamp );
	gl.uniform1f( u( 'u_striationStrength' ), striationStrength );
	gl.uniform1f( u( 'u_striationFreq' ), striationFreq );
	gl.uniform1f( u( 'u_colourAttenuation' ), colourAttenuation );
	gl.uniform1f( u( 'u_parabolaPower' ), parabolaPower );
	gl.uniform1f( u( 'u_depthFadeScale' ), DEFAULT_DEPTH_FADE_SCALE );
	gl.uniform3fv( u( 'u_ground' ), ground );
	// DEBUG-ONLY, opt-in — see u_silhouetteDebug's declaration in
	// FRAGMENT_SHADER above. `fx-generative-background.js` never sets
	// `opts.silhouetteDebug`, so every real page uploads `0` here, identical
	// to the pre-existing behaviour (no uniform, GLSL's own zero-init) this
	// line replaces.
	gl.uniform1i( u( 'u_silhouetteDebug' ), opts.silhouetteDebug ? 1 : 0 );

	const speed = typeof opts.speed === 'number' ? opts.speed : 1;

	let lost = false;
	const onContextLost = ( event ) => {
		event.preventDefault();
		lost = true;
		if ( typeof opts.onLost === 'function' ) {
			opts.onLost();
		}
	};
	canvas.addEventListener( 'webglcontextlost', onContextLost );

	/*
	 * ── LAYER 2 + CAMERA — the real transform, verified numerically ─────────
	 *
	 * This REPLACES the old CROP_ZOOM/CROP_OFFSET frustum hack. That hack
	 * existed to fake a dramatic, off-centre composition by shrinking and
	 * shifting the viewing window — because the thing that actually produces
	 * that composition, the object-level transform (layer 2), was missing
	 * entirely. With layer 2 present the crop is not merely unnecessary, it
	 * fights the transform: two independent framings competing for the same
	 * picture. D882 records the same diagnosis from the other direction —
	 * every earlier build "wondered why the result looked centred, small and
	 * gentle regardless of camera/frustum tuning."
	 *
	 * The frustum is now sized from the canvas in the geometry's own world
	 * units, exactly as the reference does, and the composition comes from
	 * the preset's position/rotation/scale instead.
	 *
	 * ⛔ Do not re-tune this by eye. `scripts/generative-background/
	 * verify-transform.mjs` checks these matrices against ones extracted from
	 * the running reference rig, with negative controls proving it can still
	 * fail. A screenshot already passed a build that was rotating the wrong
	 * way on all three chained rotations; the numbers caught it in seconds.
	 * If the look needs changing, change the PRESET values and re-run the
	 * verifier against re-extracted ground truth — do not reintroduce a
	 * second framing mechanism here.
	 */
	let projection = buildTransform( REFERENCE_PRESET, 1, 1 ).mvp;

	const resize = ( width, height, dpr ) => {
		// DPR capped at 1.5 — same fillrate-bound precedent as
		// wave-gradient.js:493 / aurora.js:308.
		const scale = Math.min( dpr || 1, 1.5 );
		const w = Math.max( 1, Math.round( width * scale ) );
		const h = Math.max( 1, Math.round( height * scale ) );
		if ( canvas.width !== w || canvas.height !== h ) {
			canvas.width = w;
			canvas.height = h;
			gl.viewport( 0, 0, w, h );
		}
		// Rebuild P · V · M from the CSS canvas box, NOT the DPR-scaled backing
		// store. The reference sizes its frustum from `canvas.clientWidth/
		// clientHeight`, so feeding `w`/`h` here would make the composition
		// change with device pixel ratio — a retina visitor would see a
		// differently-framed picture from everyone else. The backing store
		// still drives `gl.viewport` above; only the frustum uses CSS pixels.
		projection = buildTransform(
			REFERENCE_PRESET,
			Math.max( 1, width ),
			Math.max( 1, height )
		).mvp;
		gl.useProgram( program );
		gl.uniformMatrix4fv( projectionLoc, false, projection );
	};

	const draw = ( seconds ) => {
		if ( lost ) {
			return false;
		}
		gl.useProgram( program );
		gl.uniform1f( timeLoc, seconds * TIME_SCALE * speed );
		gl.uniform1i( textureLoc, 0 );
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, texture );
		gl.bindVertexArray( vao );
		gl.clearColor( 0, 0, 0, 0 );
		/*
		 * The DEPTH bit must be cleared alongside COLOR every frame. Clearing
		 * only colour leaves last frame's depth values in place, so as the
		 * surface breathes, fragments get tested against a stale buffer and
		 * whole regions drop out intermittently — a flicker that looks like a
		 * shader bug and is not one.
		 */
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.drawElements( gl.TRIANGLES, indexCount, indexType, 0 );
		gl.bindVertexArray( null );
		return true;
	};

	return {
		draw,
		resize,
		/**
		 * Rebuild the colour texture from a fresh source canvas — called when a
		 * client colour token changes (§2's "rebuild whenever … changes").
		 *
		 * @param {HTMLCanvasElement} source The freshly-painted OKLCH canvas.
		 * @return {void}
		 */
		updateTexture: ( source ) => {
			if ( lost ) {
				return;
			}
			gl.bindTexture( gl.TEXTURE_2D, texture );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source );
		},
		destroy: () => {
			canvas.removeEventListener( 'webglcontextlost', onContextLost );
			gl.deleteBuffer( posBuf );
			gl.deleteBuffer( uvBuf );
			gl.deleteBuffer( indexBuf );
			gl.deleteTexture( texture );
			gl.deleteVertexArray( vao );
			gl.deleteProgram( program );
			const ext = gl.getExtension( 'WEBGL_lose_context' );
			if ( ext ) {
				ext.loseContext();
			}
		},
	};
}
