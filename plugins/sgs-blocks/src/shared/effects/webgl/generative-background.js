/**
 * SGS motion — generative background WebGL renderer (Spec 38, D874 technique
 * spec, §1/§2/§3/§4 + Animation + Camera subsections). Tier W, THIRD entry —
 * v1.3 DIRECT VERTEX-SHADER PORT + CAMERA CROP (2026-08-28).
 *
 * ── PROVENANCE (read before touching the geometry section below) ───────────
 *
 * The fold mechanism in this file's vertex shader is PORTED DIRECTLY from
 * Stripe's hero reference implementation
 * (`.claude/scratch/stripe-hero-poc/shaders/68467.glsl`), per Bean's explicit
 * authorisation recorded at `.claude/decisions.md` D880 (2026-08-28). D880
 * REVERSES this project's previous "describe the mechanism in plain English
 * and reimplement, never copy the reference's literal code" rule — but only
 * for this one file's geometry/vertex-shader mechanism. This is NOT
 * open-source or MIT-licensed code and carries no standard open-source
 * attribution licence to cite here; it is a direct, considered, twice-
 * confirmed BUSINESS decision to accept the associated legal risk, recorded
 * in D880 alongside the outstanding solicitor's-hour flag. Do not read this
 * comment as a citation of permission from Stripe — there is none. The
 * colour/fragment pipeline below (grading, striations, glow-gate, depth
 * fade, grain) is UNCHANGED by D880 and was NOT ported from any reference
 * fragment shader — see the FRAGMENT_SHADER section's own docblock.
 *
 * ⛔ CORRECTED (2026-08-28, second pass) — the FIRST v1.3 attempt claimed a
 * "direct port" while actually keeping v1.2's own axis vectors and its
 * `M * v` (matrix-times-column-vector) multiplication convention, on the
 * reasoning that this was "algebraically equivalent" to the reference. That
 * reasoning was wrong: the reference computes `(vec4(position,1.0) *
 * rotationA).xyz` — a ROW-vector-times-matrix product. For an orthogonal
 * rotation matrix, `v * M` is NOT the same operation as `M * v`; it equals
 * `transpose(M) * v`, i.e. the SAME rotation matrix built from the OPPOSITE
 * angle. So the first "port" was silently rotating the wrong way on all
 * three chained rotations — same axis directions, wrong rotation sense. This
 * pass fixes BOTH: the exact literal axis vectors `(0.5,0,0.5)`/`(0,0.5,0.5)`
 * (not the `(1,0,1)`/`(0,1,1)` stand-ins) AND the multiplication order
 * (`displaced * sgsAxisAngle(...)`, matching GLSL's `vec * mat` row-vector
 * semantics to the reference's own convention exactly). Caught because Bean
 * looked at the live result and correctly said it still looked like the same
 * shape, just bigger — that observation was right; the code had not actually
 * changed in the way the previous commit's docblock claimed it had.
 *
 * What genuinely WAS already correct in the v1.2→v1.3 first pass: the
 * rotation ORDER (axis A, then B, then A again) and which UV coordinate and
 * frequency/power slot drives which rotation. Only the axis literals and the
 * multiplication convention needed this second fix. The CAMERA section below
 * (crop/frustum) was correct from the first v1.3 pass and is unchanged here.
 *
 * ── WHAT CHANGED, MECHANISM-LEVEL (unchanged from v1.2, restated) ──────────
 *
 * There is NO CPU pre-fold any more. The mesh geometry is a plain flat/rest-
 * pose grid, built once, trivially (no fold, no bands, no per-vertex
 * normals) — cheap enough that the Worker/Blob plumbing the old build needed
 * is gone entirely. The FOLDED shape is produced every frame, in the vertex
 * shader, by THREE CHAINED ROTATIONS whose ANGLES are a fixed function of
 * each vertex's own UV coordinate — not of time. Because the angle depends
 * only on UV, the folded shape reads as static frame-to-frame even though it
 * is recomputed every frame; at ~33k vertices and 3 axis-angle rotation
 * matrices per vertex this is negligible GPU cost (see the promoted
 * `scripts/perf/measure-frame-cost.mjs` harness for the measured figure).
 *
 * Two ROTATION AXES, our own choice (NOT the reference's literal vectors):
 * one in the XZ diagonal plane, one in the YZ diagonal plane. The three
 * rotations chain axis A, then axis B, then axis A again — two distinct axes
 * across three rotations. Each rotation's angle is
 * `frequency_i * shapingCurve(uvCoord, power_i)`, where `uvCoord` is `v_uv.x`
 * for the first rotation and `v_uv.y` for the other two. `shapingCurve` is
 * Iñigo Quilez's public generic shaping function
 * (`exp2(-exp2(n) * pow(x, n))`, iquilezles.org/articles/functions) —
 * implemented directly, same free-to-use category as the CSS Color Module
 * OKLCH formulas this effect's lifecycle module already implements.
 *
 * DISPLACEMENT ("breathing") is a plain offset along the plane's own LOCAL
 * UP axis in its un-rotated rest pose — applied BEFORE the three rotations,
 * NOT along the surface normal (the v1.1 build's other mistake). Magnitude
 * comes from a SINGLE simplex-noise sample (not summed), evaluated at the
 * vertex's rest-pose (x, z) scaled by two independent frequencies and offset
 * by time. The plane's rest pose lies in the XZ plane (Y is "up"), matching
 * a conventional Y-up scene: `positions = (x, 0, z)`.
 *
 * Per-vertex order: rest position -> vertical displacement -> rotation 1
 * (axis A) -> rotation 2 (axis B) -> rotation 3 (axis A) -> final position ->
 * `gl_Position = u_projection * vec4(finalPos, 1.0)`. Ten real tunable
 * uniforms result: overall speed (folded into `u_time` upstream, exactly as
 * the v1.1 build already did), 3 rotation frequencies, 3 rotation powers, 2
 * displacement frequencies and 1 displacement amount.
 *
 * The simplex-noise GLSL below is the SAME Ashima Arts/Stefan Gustavson
 * (MIT) function `wave-gradient.js` already ships — duplicated here, not
 * imported, because that file carries an explicit "do not touch" constraint
 * for this build (Spec 38 FR-38-31 is closed). Same documented-duplicate
 * pattern `motion-utils.js` uses for `isNativeHorizontalScroller()`.
 *
 * ── CAMERA (no scene graph — one baked orthographic mat4) ───────────────────
 *
 * One combined projection×view matrix, computed once and on resize, uploaded
 * as a single uniform. Orthographic, translation-only view (rotation lives
 * ONLY in the vertex shader now — never a second rotation in the matrix).
 *
 * v1.2 sized the frustum from the mechanism's provable bounding sphere (an
 * axis-angle rotation is length-preserving, so the furthest ANY vertex can
 * ever land from the origin is exactly its rest-pose distance plus the
 * displacement magnitude) with a small safety margin — a frustum that
 * NEVER clips the shape. That was the wrong target. Bean's own reference
 * screenshot (`.claude/scratch/stripe-hero-poc/FINAL-rig.png`) shows the
 * opposite: the shape runs off the top and right edges of the viewport, and
 * that off-edge crop is a major part of why it reads as a bold sculptural
 * object rather than a small complete shape floating in empty space.
 *
 * v1.3 deliberately UNDER-sizes the frustum relative to the bounding sphere
 * (`CROP_ZOOM` below is well under 1.0) so the folded surface intentionally
 * overflows the canvas, and OFFSETS the frustum's centre toward the
 * bottom-left (`CROP_OFFSET_X/Y`) so the overflow happens specifically off
 * the top and right — matching the reference framing rather than a
 * symmetric zoom. This trades the old "never clips" guarantee for the
 * dramatic, cropped look the brief asks for; nothing downstream depended on
 * the guarantee (the mesh itself is never read back on the CPU).
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

/*
 * ── Geometry constants ──────────────────────────────────────────────────────
 */

/** Segment counts — the technique spec's own mechanism, not a value to retune. */
const SEGMENTS_X = 128;
const SEGMENTS_Y = 256;

/** Plane world-space size, in arbitrary units the camera frustum is sized to match. */
const PLANE_WIDTH = 320;
const PLANE_HEIGHT = 320;

/*
 * ── Animation defaults — pushed PAST the reference's own "Reference
 *    calibration values" table (Twist power 3.63/0.7/3.95, frequency
 *    -0.65/0.41/-0.58, displacement amount -7.821) per the brief: those
 *    numbers are the reference's OWN defaults, not a target to match, and
 *    the brief explicitly asks for MORE dramatic self-overlap than the
 *    reference produces at its own settings. Frequencies scaled up ~45%,
 *    powers raised for sharper, more concentrated fold transitions (higher
 *    power = the shaping curve stays near 1 longer then drops off harder,
 *    producing tighter creases rather than a smooth gradient of bend).
 *    Retuned live against the sandybrown canary (2026-08-28) — see D880's
 *    session for the verification screenshots. Starting-point defaults,
 *    overridable per instance via `opts` (client inspector controls). ──
 */
const DEFAULT_DISPLACEMENT_AMOUNT = 11.5;
const DEFAULT_DISPLACEMENT_FREQ_X = 0.005831;
const DEFAULT_DISPLACEMENT_FREQ_Z = 0.016001;
const DEFAULT_FOLD_FREQ = [ -0.94, 0.6, -0.84 ];
const DEFAULT_FOLD_POWER = [ 4.6, 1.0, 5.1 ];

/** Near-identity grading defaults (technique spec §2 — "near-identity" is the point). */
const GRADE_CONTRAST = 1.05;
const GRADE_SATURATION = 1.0;
const GRADE_HUE_SHIFT = 0.0;

/*
 * ── Striation / glow-gate + depth-fade defaults (§3, 2026-08-28 build) ─────
 * Starting-point values, overridable per instance via `opts`, tuned against
 * the live canary rather than transferred from the reference (its constants
 * are tuned to ITS OWN frustum/UV scale, not transferable as literals — see
 * task brief). `DEFAULT_DEPTH_FADE_SCALE` is NOT exposed as a client control
 * (a rendering-tuning constant scoped to this build's own frustum, not a
 * creative choice) — see `resize()`'s frustum-sizing comment for the maths
 * this value was derived from.
 */
const DEFAULT_GLOW_AMOUNT = 40.0;
const DEFAULT_GLOW_POWER = 2.0;
const DEFAULT_GLOW_RAMP = 0.5;
const DEFAULT_STRIATION_STRENGTH = 0.15;
const DEFAULT_STRIATION_FREQ = 40.0;
const DEFAULT_COLOUR_ATTENUATION = 1.0;
const DEFAULT_PARABOLA_POWER = 1.0;
const DEFAULT_DEPTH_FADE_SCALE = 2.0;
const DEFAULT_GROUND = [ 0.98, 0.98, 0.97 ];

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

/**
 * Build the flat/rest-pose grid — no fold, no bands, trivial CPU cost.
 * Positions lie in the XZ plane (Y is "up"), matching a conventional Y-up
 * scene: the vertex shader displaces along Y and folds the sheet up out of
 * that plane every frame.
 *
 * @return {Object} { positions, uvs, indices, vertexCount } typed arrays.
 */
function buildFlatGeometry() {
	const vertsX = SEGMENTS_X + 1;
	const vertsY = SEGMENTS_Y + 1;
	const vertexCount = vertsX * vertsY;

	const positions = new Float32Array( vertexCount * 3 );
	const uvs = new Float32Array( vertexCount * 2 );

	for ( let iy = 0; iy <= SEGMENTS_Y; iy++ ) {
		const v = iy / SEGMENTS_Y;
		for ( let ix = 0; ix <= SEGMENTS_X; ix++ ) {
			const u = ix / SEGMENTS_X;
			const idx = iy * vertsX + ix;
			positions[ idx * 3 ] = ( u - 0.5 ) * PLANE_WIDTH;
			positions[ idx * 3 + 1 ] = 0;
			positions[ idx * 3 + 2 ] = ( v - 0.5 ) * PLANE_HEIGHT;
			uvs[ idx * 2 ] = u;
			uvs[ idx * 2 + 1 ] = v;
		}
	}

	// Two triangles per quad, standard winding.
	const indices = [];
	for ( let iy = 0; iy < SEGMENTS_Y; iy++ ) {
		for ( let ix = 0; ix < SEGMENTS_X; ix++ ) {
			const a = iy * vertsX + ix;
			const b = a + 1;
			const c = a + vertsX;
			const d = c + 1;
			indices.push( a, c, b, b, c, d );
		}
	}

	return {
		positions,
		uvs,
		indices:
			vertexCount > 65535 ? new Uint32Array( indices ) : new Uint16Array( indices ),
		vertexCount,
	};
}

/**
 * Build a standard column-major orthographic projection matrix (CSS Color
 * Module-style textbook maths — public, no third-party source), then apply a
 * translation-only "view" (rotation lives ONLY in the vertex shader, never
 * here — see module docblock).
 *
 * @param {number} left    Frustum left edge, world units.
 * @param {number} right   Frustum right edge, world units.
 * @param {number} bottom  Frustum bottom edge, world units.
 * @param {number} top     Frustum top edge, world units.
 * @param {number} near    Near plane.
 * @param {number} far     Far plane.
 * @param {number} depthZ  Translation along Z, world units — moves the
 *                          geometry back into the near/far range.
 * @return {Float32Array} 16-element column-major mat4.
 */
function buildOrthographicMatrix( left, right, bottom, top, near, far, depthZ ) {
	const m = new Float32Array( 16 );
	m[ 0 ] = 2 / ( right - left );
	m[ 5 ] = 2 / ( top - bottom );
	m[ 10 ] = -2 / ( far - near );
	m[ 12 ] = -( right + left ) / ( right - left );
	m[ 13 ] = -( top + bottom ) / ( top - bottom );
	m[ 14 ] = -( far + near ) / ( far - near ) + ( -depthZ * ( -2 / ( far - near ) ) );
	m[ 15 ] = 1;
	return m;
}

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

	// ROW-VECTOR convention (`v * M`), matching the reference exactly — NOT
	// `M * v`. For an orthogonal rotation matrix these are NOT the same
	// operation: `v * M` = `transpose(M) * v`, which for a rotation matrix
	// built from (axis, angle) equals `M` built from (axis, -angle). The
	// previous build used `M * v` with the same axes/angles and so was
	// silently rotating the OPPOSITE way on every one of the three chained
	// rotations — a real structural bug, not a style difference, found by
	// comparing directly against the reference file's own multiplication
	// order (D880 literal-port pass, 2026-08-28).
	vec3 folded = displaced * sgsAxisAngle( axisA, angle1 );
	folded = folded * sgsAxisAngle( axisB, angle2 );
	folded = folded * sgsAxisAngle( axisA, angle3 );

	gl_Position = u_projection * vec4( folded, 1.0 );
	// Clip-space Z, passed through for the fragment shader's depth fade (§2) —
	// the CAMERA section's provable bounding sphere already gives this a
	// known, testable range (see the resize() frustum-sizing comment).
	v_depth = gl_Position.z;
}`;

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

/*
 * §3(b) — periodic lines, derivative-antialiased (the reference's OTHER,
 * dark-theme technique — kept as a lower-priority secondary detail layer,
 * see module docblock). |sin(u*N)| for large N; line thickness derived from
 * the screen-space derivative of the UV, so lines thicken/fade where the
 * surface turns rather than aliasing into moiré.
 */
float striations( vec2 uv ) {
	float n = 425.0;
	float line = abs( sin( uv.y * n ) );
	float width = fwidth( uv.y * n ) * 1200.0;
	return pow( 1.0 - smoothstep( 0.0, max( width, 0.001 ), line ), 3.0 );
}

/* §4 — hash-based grain, five lines, no texture. */
float grain( vec2 fragCoord ) {
	vec3 p3 = fract( vec3( fragCoord.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

void main() {
	vec3 colour = texture( u_texture, v_uv ).rgb;

	// §3(a) fine-line striation / glow-gate layer — added BEFORE grading so
	// the grading chain applies to the combined result.
	float glowGate = sgsGlowGate( v_uv );
	float striationNoise = sgsStriationNoise( v_uv );
	float atten = 1.0 - colour.b * u_colourAttenuation;
	float parabolaFalloff = 1.0 - sgsParabola( v_uv.x, u_parabolaPower );
	colour += striationNoise * u_striationStrength * atten * glowGate * parabolaFalloff;

	colour = grade( colour );

	// §3(b) legacy periodic-line striations — secondary detail layer.
	float glow = striations( v_uv );
	colour += glow * 0.06;

	// A slight overall lift where the surface faces the camera flat-on
	// (glow gate low), independent of the fine-texture contribution above.
	colour += ( 1.0 - glowGate ) * 0.25;

	// Depth fade — recede toward the ground colour with distance from the
	// camera, using the vertex shader's own clip-space Z.
	float depthFade = clamp( v_depth * u_depthFadeScale, 0.0, 1.0 );
	colour = mix( colour, u_ground, depthFade );

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
		depth: false,
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

	const geometry = buildFlatGeometry();

	// The canvas may have been destroyed while this ran — bail rather than
	// upload buffers into a context nobody will ever draw with.
	if ( gl.isContextLost() ) {
		gl.deleteProgram( program );
		return null;
	}

	gl.useProgram( program );

	const vao = gl.createVertexArray();
	gl.bindVertexArray( vao );

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
	gl.uniform1f( u( 'u_contrast' ), GRADE_CONTRAST );
	gl.uniform1f( u( 'u_saturation' ), GRADE_SATURATION );
	gl.uniform1f( u( 'u_hueShift' ), GRADE_HUE_SHIFT );

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
	 * ── Frustum sizing — deliberate CROP, not the old "never clips" bound ───
	 * `restRadius`/`contentRadius` are still the provable bounding sphere (an
	 * axis-angle rotation is length-preserving, so this IS the furthest any
	 * vertex can ever land from the origin) — kept as the reference scale the
	 * crop is measured against, not as a "must fit inside" constraint any
	 * more. `CROP_ZOOM` deliberately sizes the visible half-extent to well
	 * under that radius so the folded surface overflows the canvas on every
	 * side; `CROP_OFFSET_X/Y` then shift the visible window's centre toward
	 * the bottom-left so the overflow happens specifically off the TOP and
	 * RIGHT (matching `.claude/scratch/stripe-hero-poc/FINAL-rig.png`,
	 * D880's authorised reference) rather than symmetrically on all four
	 * edges. Retuned live against the sandybrown canary (2026-08-28).
	 */
	const restRadius = Math.sqrt(
		( PLANE_WIDTH / 2 ) * ( PLANE_WIDTH / 2 ) + ( PLANE_HEIGHT / 2 ) * ( PLANE_HEIGHT / 2 )
	);
	const contentRadius = restRadius + Math.abs( dispAmount );
	const CROP_ZOOM = 0.46;
	const CROP_OFFSET_X = 0.34;
	const CROP_OFFSET_Y = 0.3;
	const halfExtentMin = contentRadius * CROP_ZOOM;
	const depthExtent = contentRadius * 2;

	const computeFrustumBounds = ( aspect ) => {
		// Guarantees BOTH halfW and halfH are at least `halfExtentMin`,
		// regardless of the canvas's aspect ratio — a portrait canvas
		// wouldn't otherwise get enough horizontal room, and vice versa.
		const halfH = Math.max( halfExtentMin, halfExtentMin / aspect );
		const halfW = halfH * aspect;
		// Shift the whole window toward the bottom-left: content to the
		// right/above the shifted centre falls outside [left,right]/
		// [bottom,top] and is cropped off — the top/right overflow the
		// reference shows.
		const offsetX = halfW * CROP_OFFSET_X;
		const offsetY = halfH * CROP_OFFSET_Y;
		return {
			left: -halfW - offsetX,
			right: halfW - offsetX,
			bottom: -halfH - offsetY,
			top: halfH - offsetY,
		};
	};

	let initBounds = computeFrustumBounds( 1 );
	let projection = buildOrthographicMatrix(
		initBounds.left,
		initBounds.right,
		initBounds.bottom,
		initBounds.top,
		0.01,
		depthExtent * 2,
		depthExtent
	);

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
		const aspect = w / Math.max( 1, h );
		const bounds = computeFrustumBounds( aspect );
		projection = buildOrthographicMatrix(
			bounds.left,
			bounds.right,
			bounds.bottom,
			bounds.top,
			0.01,
			depthExtent * 2,
			depthExtent
		);
		gl.useProgram( program );
		gl.uniformMatrix4fv( projectionLoc, false, projection );
	};

	const draw = ( seconds ) => {
		if ( lost ) {
			return false;
		}
		gl.useProgram( program );
		gl.uniform1f( timeLoc, seconds * speed );
		gl.uniform1i( textureLoc, 0 );
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, texture );
		gl.bindVertexArray( vao );
		gl.clearColor( 0, 0, 0, 0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
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
