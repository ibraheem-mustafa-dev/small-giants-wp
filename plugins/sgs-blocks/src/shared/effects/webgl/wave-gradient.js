/**
 * SGS motion — wave gradient (Spec 38 FR-38-31). Tier W, second entry.
 *
 * ── 2026-08-27 TECHNIQUE CHANGE — read before touching this file ─────────
 *
 * Bean's verdict on the vertex-displaced-mesh version (kept as history in git,
 * not restated here): it read as "one continuous physical sheet with fingers
 * poking into it", the colour variation read as fake lighting/shadow rather
 * than aurora-style light, and the motion read as viscous ("pudding/custard"),
 * not drifting. Those are not bugs in that technique — they are exactly what
 * that technique IS: an opaque geometric surface, displaced. No amount of
 * colour-maths tuning (the 2026-08-27 morning fixes: post-interpolation
 * sharpening, linear-light blending, fold-over frequency) could reach a
 * translucent-overlapping-light look, because that technique had no
 * transparency anywhere in it.
 *
 * This version is a genuinely different, still-bounded technique, agreed with
 * Bean as "one bounded experiment" before any bigger rebuild:
 *   - NO vertex displacement, NO custom mesh. A single FULLSCREEN TRIANGLE
 *     (`gl_VertexID` trick, zero vertex buffers) — the same shape `renderer.js`
 *     uses, reproduced here rather than shared, so this effect's own risk
 *     never touches the live `surface-treatment` effect that depends on that
 *     file. This is what makes the previous "WHY THIS IS A SIBLING OF
 *     renderer.js" section obsolete: that section's whole reason (needing
 *     custom vertex-stage displacement) no longer applies.
 *   - Colour is computed ENTIRELY per pixel, in the fragment shader: three
 *     independent, slowly DRIFTING (not displaced) soft noise fields, each
 *     with its own spatially-varying ALPHA, composited via standard alpha-OVER
 *     `mix()`, sequentially. ⛔ The first cut of this file used ADDITIVE
 *     (`colour += ...`) and, after live measurement, SCREEN (`1-(1-a)(1-b)`)
 *     blending instead — both are wrong here and were replaced same-day. This
 *     effect's ground is deliberately LIGHT (Phase 1 Step 5), and any
 *     additive-family blend needs headroom below white to show anything: near
 *     white there is almost none, so additive clipped straight to solid WHITE
 *     within a second (verified live) and screen was bounded but nearly
 *     invisible for the identical reason. `mix()` has neither failure mode —
 *     it is bounded to [current colour, layer colour] by construction, and a
 *     high-alpha region reads as the layer's own saturated hue regardless of
 *     how light or dark the base is. Layers still visibly overlap wherever
 *     their soft alpha masks cross, because each is mixed in over whatever
 *     the earlier layers already contributed there.
 *   - Still ONE draw call, ONE pass, no framebuffer, no texture. The
 *     already-rejected technique spec (D794 NO-GO) and the barred blur/grain
 *     post-pass (D791, 70% of frame cost) are UNCHANGED prohibitions — this
 *     experiment does not touch either.
 *
 * `opts.amplitude` is KEPT as the public option name but its MEANING changed:
 * it no longer scales geometric displacement (there is none), it scales how
 * strongly the three layers assert themselves against the base colour. The
 * client-facing inspector control for it is labelled "Wave depth" (this
 * docblock said "Amplitude" until 2026-08-27; the UI never did).
 *
 * ⛔ THIS IS NOT A MODEL OF ANY LIVE COMMERCIAL SITE'S CURRENT TECHNIQUE. It
 * is a from-scratch response to Bean's specific description of what
 * "translucent, overlapping, drifting" should look like, not a port of
 * anything. Read it on its own terms.
 *
 * ⛔ THIS EFFECT IS NOT AN AURORA, AND IS NOT TRYING TO BE (D838).
 * FR-38-31 is a self-contained "flowing gradient" — that is its inspector
 * label and its honest description. It was modelled on stripe.com's hero, and
 * D781 found even THAT reference was the wrong thing. Bean's aurora ask
 * belongs to the separate, unbuilt GENERATIVE BACKGROUND ENGINE:
 *   plan  .claude/plans/2026-08-27-generative-background-engine.md
 *   spec  .claude/reports/2026-08-25-generative-background-engine-technique-spec.md
 * An aurora also needs a NEAR-BLACK ground, which is the opposite of this
 * effect's deliberately light one. Do not do engine work in this file.
 *
 * ── WHY THIS BREAKS TIER W'S FOUNDING INVARIANT, AND WHAT REPLACES IT ─────
 *
 * ⛔ Tier W's premise is that a `null` return IS the fallback: the untouched
 * `<img>` is already the finished state, so there is no second path to keep in
 * sync. THAT ONLY HOLDS BECAUSE THERE IS A SOURCE IMAGE. This effect is
 * GENERATIVE — there is no untouched anything — so it needs a real CSS fallback
 * maintained in parallel, which is exactly the cost Tier W was designed to
 * avoid. This is not "one more shader"; it is a genuine widening, and it is
 * recorded as such in its D-number.
 *
 * The replacement guarantee: `assets/css/fx-wave-gradient.css` paints a static
 * multi-stop gradient from the SAME custom properties the shader reads. With no
 * WebGL, no JS, a failed link, or a lost context that never restores, the block
 * keeps a gradient built from the client's own chosen colours. The canvas only
 * ever REPLACES that, and only after a successful first draw.
 *
 * ── LICENCE PROVENANCE ────────────────────────────────────────────────────
 *
 * The simplex noise below is Ashima Arts / Stefan Gustavson (MIT), used
 * verbatim apart from formatting. Nothing else in this file is derived from a
 * third party — the fullscreen-triangle trick is a standard, widely-published
 * WebGL technique with no single owner (the same shape used by this project's
 * own `renderer.js`), and the additive-layer compositing here was written for
 * this specific brief, not copied from a reference implementation.
 * ⛔ nimitz's Shadertoy "Auroras" is CC BY-NC-SA — NON-COMMERCIAL. It is NOT
 * used here and must not be copied into client work.
 *
 * @package
 */

import { probeSurface } from './capability';

/**
 * Ashima Arts / Stefan Gustavson 3D simplex noise (MIT). Verbatim apart from
 * formatting — do not "tidy" the magic constants, they are the algorithm.
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

/** Number of translucent colour layers composited over the base. */
export const WAVE_LAYERS = 3;

/**
 * Vertex stage. A FULLSCREEN TRIANGLE via `gl_VertexID` — no vertex buffer, no
 * index buffer, no displacement. Three vertices at (-1,-1), (3,-1), (-1,3) in
 * clip space cover the whole viewport once clipped; `v_uv` runs 0..2 on each
 * axis, but only the 0..1 portion is ever visible. This is a standard,
 * widely-published technique (this project's own `renderer.js` uses the same
 * shape) reproduced here rather than shared, so a bug in this experiment can
 * never touch the live `surface-treatment` effect.
 */
const VERTEX_SHADER = `#version 300 es
out vec2 v_uv;
void main() {
	vec2 pos = vec2( float( ( gl_VertexID << 1 ) & 2 ), float( gl_VertexID & 2 ) );
	v_uv = pos;
	gl_Position = vec4( pos * 2.0 - 1.0, 0.0, 1.0 );
}`;

/**
 * Fragment stage. Everything happens here, per pixel:
 *
 * 1. Three independent noise fields, each sampled at its OWN scale and DRIFT
 *    (a slow, constant-velocity translation of the sample coordinates over
 *    time — not a displacement of geometry, so nothing is being "pushed" or
 *    "squished"; the colour simply flows sideways, like light or fog does).
 * 2. Each field's ALPHA varies spatially and softly (`smoothstep` over a WIDE
 *    band, not a sharp threshold) — this is what makes a layer read as
 *    genuinely translucent rather than a hard-edged blob.
 * 3. Layers composite via `mix( colour, layerColour, alpha * layerOpacity *
 *    intensity )`, sequentially — NOT additive, NOT screen. Both were tried
 *    and both failed against this effect's deliberately LIGHT ground (see the
 *    top-of-file note): additive clipped to solid white within a second
 *    (verified live), screen was bounded but nearly invisible for the same
 *    "no headroom near white" reason. `mix()` is bounded by construction
 *    regardless of how light or dark the base is, and still reads as genuine
 *    translucent overlap wherever two layers' soft alpha masks cross.
 *
 * `highp` is required: `pow` and the noise field run per-pixel now, and
 * `mediump` visibly quantises them. GLSL ES 3.00 guarantees `highp` in the
 * fragment stage, so there is no compatibility cost.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_baseColour;
uniform vec3 u_layerColour[ ${ WAVE_LAYERS } ];
uniform vec2 u_layerFreq[ ${ WAVE_LAYERS } ];
uniform vec2 u_layerDrift[ ${ WAVE_LAYERS } ];
uniform float u_layerOpacity[ ${ WAVE_LAYERS } ];
uniform float u_layerSeed[ ${ WAVE_LAYERS } ];
uniform float u_sharpness;
uniform float u_intensity;
in vec2 v_uv;
out vec4 outColour;
${ SIMPLEX_3D }

/**
 * Cheap 2D hash. Feeds the output dither only — it is not a noise field and
 * nothing about the look depends on its exact constants.
 */
float hash12( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

void main() {
	// Aspect-correct UV so noise features are round, not stretched, on a wide
	// hero. Origin at centre so u_layerFreq reads as "cycles across the short
	// axis" regardless of viewport shape.
	vec2 uv = v_uv - 1.0;
	float aspect = u_resolution.x / max( u_resolution.y, 1.0 );
	if ( aspect > 1.0 ) {
		uv.x *= aspect;
	} else {
		uv.y /= aspect;
	}

	vec3 colour = u_baseColour;
	for ( int i = 0; i < ${ WAVE_LAYERS }; i++ ) {
		// DRIFT, not displacement: the sample point slides at a constant slow
		// velocity. Nothing about this pushes or deforms anything — it is the
		// coordinate the noise field is read FROM that moves, which is what
		// makes it read as flowing light rather than a physical material.
		vec2 sampleUv = uv * u_layerFreq[ i ] + u_layerDrift[ i ] * u_time;
		float n = snoise( vec3( sampleUv, u_layerSeed[ i ] + u_time * 0.06 ) );

		// WIDE smoothstep band -> a soft, translucent-edged field, not a
		// hard-edged blob. This is the alpha half of "different opacity" —
		// it varies continuously across the field, never a flat fill.
		float alpha = smoothstep( -0.35, 0.55, n );
		alpha = pow( alpha, u_sharpness );

		// SECOND FIX, SAME DAY (2026-08-27) — the first version of this loop
		// used additive compositing: colour += layerColour * alpha * opacity *
		// intensity ("light on light"). Verified live and in isolation:
		// against a LIGHT base (this framework's default ground since Phase 1
		// Step 5, roughly 0.9-0.97 in linear light already) there is almost
		// no headroom before 1.0, so the sum clipped to solid WHITE within
		// the first second — exactly the "turns white while loading" defect
		// Bean reported. SCREEN blend (1-(1-a)*(1-b)) was tried next: it
		// cannot clip past white by construction, but against the SAME light
		// base it is nearly invisible for the identical reason — there is no
		// meaningful "more light" to add near white either way. Both failure
		// modes share one root cause: additive-family blending needs a dark
		// background to show anything, and this effect's ground is
		// deliberately light.
		//
		// Standard alpha-OVER compositing (GLSL mix()) has neither failure
		// mode: it is bounded to the range between colour and layerColour by
		// construction (no clipping possible), and it reads as genuine
		// colour regardless of how light or dark the base is, because a
		// high-alpha region REPLACES toward the layer's own saturated hue
		// rather than trying to brighten past it. Multiple layers still
		// visibly overlap wherever their soft alpha masks cross, because each
		// is mixed in sequentially over whatever the previous layers already
		// contributed there — verified via a sampled grid across both the
		// light and warm palettes: real spatial variation, real motion
		// between timestamps, nothing pinned at either clamp boundary.
		float weight = clamp( alpha * u_layerOpacity[ i ] * u_intensity, 0.0, 1.0 );
		colour = mix( colour, u_layerColour[ i ], weight );
	}

	// Linear light -> sRGB for the framebuffer. Additive mixing above happens
	// in linear light on purpose — see the 2026-08-27 morning fix's reasoning
	// for why blending gamma-encoded values directly is wrong; it applies
	// here too, and matters MORE now that colours are summed rather than
	// interpolated (summing gamma-encoded values is even further from what a
	// human reads as "these two lights combined").
	colour = pow( clamp( colour, 0.0, 4.0 ), vec3( 1.0 / 2.2 ) );

	// Triangular-noise dither, roughly ±half an 8-bit code — same reasoning
	// as the previous version: a light, close-hued palette crosses very few
	// distinct 8-bit values across a wide screen. A few lines inside the SAME
	// fragment invocation, not a second pass.
	float dither = ( hash12( gl_FragCoord.xy ) - hash12( gl_FragCoord.yx + 17.0 ) ) / 255.0;
	outColour = vec4( clamp( colour + dither, 0.0, 1.0 ), 1.0 );
}`;

/**
 * Convert one sRGB (gamma-encoded) colour to linear light.
 *
 * The client's colours arrive as sRGB — that is what a hex swatch is. Adding
 * or blending them AS sRGB reads wrong to a human eye; converting once here
 * and back in the shader keeps the maths honest.
 *
 * `pow(c, 2.2)` is the cheap gamma approximation, not the piecewise sRGB
 * transfer function. For a decorative gradient the difference is well under
 * one 8-bit code and it keeps the shader's inverse a single `pow`.
 *
 * @param {number[]} colour RGB, each channel 0-1.
 * @return {number[]} The same colour in linear light.
 */
function toLinear( colour ) {
	return [
		Math.pow( colour[ 0 ], 2.2 ),
		Math.pow( colour[ 1 ], 2.2 ),
		Math.pow( colour[ 2 ], 2.2 ),
	];
}

/**
 * Compile one shader stage, returning the log rather than throwing.
 *
 * @param {WebGL2RenderingContext} gl     Context.
 * @param {number}                 type   gl.VERTEX_SHADER or gl.FRAGMENT_SHADER.
 * @param {string}                 source GLSL.
 * @return {WebGLShader|null} The shader, or null on failure.
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
 * Create a wave-gradient renderer bound to a canvas.
 *
 * Returns `null` on any failure — no WebGL2, a shader that will not compile, a
 * program that will not link. The caller treats null as "leave the CSS fallback
 * visible", which is the whole fail-open contract.
 *
 * @param {HTMLCanvasElement} canvas   Target canvas.
 * @param {Object}            opts     Options.
 * @param {number[][]}        opts.colours [base, layer1, layer2, layer3] as 0-1 RGB.
 * @param {number}            [opts.amplitude] How strongly the 3 layers assert
 *   against the base colour, 0-1ish (NOT geometric displacement — this effect
 *   has no geometry to displace). Same option name as before for API/inspector
 *   compatibility; its meaning changed with the 2026-08-27 technique change.
 * @param {number}            [opts.sharpness] Layer edge softness exponent,
 *   default 1.6. Lower = softer/more translucent edges; higher = more defined
 *   bands. Kept well below the old vertex-mesh version's exponent because a
 *   soft edge IS the point of this technique.
 * @param {Function}          [opts.onLost]    Called when the GPU context is lost.
 * @return {{draw: Function, resize: Function, destroy: Function}|null} Handle.
 */
export function createWaveGradient( canvas, opts = {} ) {
	if ( ! canvas || typeof canvas.getContext !== 'function' ) {
		return null;
	}
	const colours = opts.colours || [];
	if ( colours.length < WAVE_LAYERS + 1 ) {
		return null;
	}

	// Capability GATE, run before this effect ever opens its own context.
	// `probeSurface()` proves a real program can compile AND link on the
	// actual GPU driver, which context creation alone does not (see
	// capability.js's module docblock) — a blocklisted/software-rendered GPU
	// must be declined here, not discovered later as a dead rectangle.
	if ( ! probeSurface() ) {
		return null;
	}

	const gl = canvas.getContext( 'webgl2', {
		antialias: false,
		alpha: false,
		depth: false,
		// Decorative background effect — low-power is the right steady-state
		// request. Kept alongside the caveat flag below on the reasoning that
		// if low-power genuinely means "runs badly" on this device, context
		// creation itself now fails rather than silently running degraded —
		// but this pairing has NOT been independently measured against a
		// caveat-flagged hybrid-GPU device, so treat it as watched, not
		// assumed correct forever.
		powerPreference: 'low-power',
		// Defence in depth: `probeSurface()` already gated this above using
		// a throwaway context, but the REAL context this effect actually
		// draws with must refuse the same way if the driver's answer
		// differs for any reason.
		failIfMajorPerformanceCaveat: true,
	} );
	if ( ! gl ) {
		return null;
	}

	// amplitude 0..1 -> intensity roughly 0.5..1.6. 0 still shows a visible,
	// gentle effect rather than flattening to the flat base colour; 1 pushes
	// the layers strongly without the additive sum blowing straight to white
	// (that is what the per-layer u_layerOpacity ceilings below are for).
	const amplitude = opts.amplitude === undefined ? 0.28 : opts.amplitude;
	const intensity = 0.5 + Math.max( 0, Math.min( 1, amplitude ) ) * 1.1;

	const vs = compile( gl, gl.VERTEX_SHADER, VERTEX_SHADER );
	const fs = compile( gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER );
	if ( ! vs || ! fs ) {
		return null;
	}
	const program = gl.createProgram();
	gl.attachShader( program, vs );
	gl.attachShader( program, fs );
	gl.linkProgram( program );
	// Shaders are detached and deleted whether or not the link succeeded —
	// they are never needed again, and leaking them on the failure path is the
	// same GPU leak as leaking them on the success path.
	gl.detachShader( program, vs );
	gl.detachShader( program, fs );
	gl.deleteShader( vs );
	gl.deleteShader( fs );
	if ( ! gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
		gl.deleteProgram( program );
		return null;
	}

	// No vertex buffer, no index buffer, no VAO needed — the fullscreen
	// triangle is generated entirely from gl_VertexID in the vertex shader.
	gl.useProgram( program );
	const u = ( name ) => gl.getUniformLocation( program, name );
	gl.uniform3fv( u( 'u_baseColour' ), toLinear( colours[ 0 ] ) );
	gl.uniform1f( u( 'u_intensity' ), intensity );
	// Softness exponent for the per-layer alpha curve. Deliberately low: a
	// soft, translucent edge is the whole point of this technique, unlike the
	// vertex-mesh version's sharpness uniform, which fought a hard-edged mesh.
	gl.uniform1f( u( 'u_sharpness' ), opts.sharpness === undefined ? 1.6 : opts.sharpness );

	// Per-layer scale, drift and ceiling. Three genuinely different fields —
	// different frequency, different drift DIRECTION (not just speed) and a
	// descending opacity ceiling so the layer nearest the base doesn't get
	// visually buried under the other two when they all overlap.
	const LAYER_FREQ = [
		[ 1.1, 1.1 ],
		[ 1.6, 1.4 ],
		[ 0.9, 1.8 ],
	];
	// ⛔ DERIVE these, never eyeball them. A drift constant is NOT a
	// percentage of the screen: `v_uv` runs 0..2 and `uv = v_uv - 1.0`, so uv
	// spans TWO units, and uv.x is further scaled by aspect (see main()).
	// Because sampleUv = uv * freq + drift * t, the fraction of the viewport
	// crossed per second is:
	//
	//     drift / ( 2 * freq * aspect )        [ / (1/aspect) for the y axis ]
	//
	// Reading 0.035 as "3.5% per second" was wrong by ~4x and understated how
	// slow this was — at the old values the default took ~115 SECONDS to cross
	// one screen, which Bean reported as "like watching clouds move" (D838).
	// Raised 3.5x on 2026-08-27: default now ~33s per screen (3.0%/s), and the
	// control's maximum (speed 150 -> rate 3) reaches ~11s (9.1%/s).
	const LAYER_DRIFT = [
		[ 0.1225, 0.042 ],
		[ -0.07, 0.098 ],
		[ 0.0525, -0.084 ],
	];
	const LAYER_OPACITY = [ 0.85, 0.65, 0.55 ];
	for ( let i = 0; i < WAVE_LAYERS; i++ ) {
		gl.uniform3fv( u( `u_layerColour[${ i }]` ), toLinear( colours[ i + 1 ] ) );
		gl.uniform2f( u( `u_layerFreq[${ i }]` ), LAYER_FREQ[ i ][ 0 ], LAYER_FREQ[ i ][ 1 ] );
		gl.uniform2f( u( `u_layerDrift[${ i }]` ), LAYER_DRIFT[ i ][ 0 ], LAYER_DRIFT[ i ][ 1 ] );
		gl.uniform1f( u( `u_layerOpacity[${ i }]` ), LAYER_OPACITY[ i ] );
		gl.uniform1f( u( `u_layerSeed[${ i }]` ), i * 37.4 );
	}
	const timeLoc = u( 'u_time' );
	const resolutionLoc = u( 'u_resolution' );

	let lost = false;
	const onContextLost = ( event ) => {
		// preventDefault() is what makes a restore POSSIBLE at all; without it
		// the context is gone for good.
		event.preventDefault();
		lost = true;
		if ( typeof opts.onLost === 'function' ) {
			opts.onLost();
		}
	};
	canvas.addEventListener( 'webglcontextlost', onContextLost );

	const resize = ( width, height, dpr ) => {
		// DPR is CAPPED, not honoured. This is fillrate-bound: every fragment
		// is cheap but there are millions of them, and a 3x-DPR phone is doing
		// 9x the work of a 1x one for a decorative background. Capping at 1.5
		// is invisible on a gradient with no hard edges.
		const scale = Math.min( dpr || 1, 1.5 );
		const w = Math.max( 1, Math.round( width * scale ) );
		const h = Math.max( 1, Math.round( height * scale ) );
		if ( canvas.width !== w || canvas.height !== h ) {
			canvas.width = w;
			canvas.height = h;
			gl.viewport( 0, 0, w, h );
			gl.useProgram( program );
			gl.uniform2f( resolutionLoc, w, h );
		}
	};

	const draw = ( seconds ) => {
		if ( lost ) {
			return false;
		}
		gl.useProgram( program );
		gl.uniform1f( timeLoc, seconds );
		// Fullscreen triangle: 3 vertices, no buffers, no bound VAO needed.
		gl.drawArrays( gl.TRIANGLES, 0, 3 );
		return true;
	};

	return {
		draw,
		resize,
		destroy: () => {
			canvas.removeEventListener( 'webglcontextlost', onContextLost );
			// GPU objects are NOT garbage-collected like DOM nodes; leaks
			// compound across navigations. Deleted explicitly, in order.
			gl.deleteProgram( program );
			const ext = gl.getExtension( 'WEBGL_lose_context' );
			if ( ext ) {
				ext.loseContext();
			}
		},
	};
}
