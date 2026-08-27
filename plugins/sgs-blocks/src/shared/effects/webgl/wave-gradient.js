/**
 * SGS motion — wave gradient (Spec 38 FR-38-31). Tier W, second entry.
 *
 * A flowing mesh gradient: a subdivided plane whose VERTICES are displaced by
 * simplex noise. Each colour layer's noise is EVALUATED per-vertex, interpolated
 * across the mesh by the rasteriser, and only then sharpened and blended, in
 * linear light, per pixel. (Until 2026-08-27 the sharpening and the blend also
 * happened per-vertex; interpolating that steep function's OUTPUT is what put
 * visible triangle edges in the result.)
 *
 * ⛔ THIS IS NOT A MODEL OF ANY LIVE COMMERCIAL SITE'S CURRENT TECHNIQUE.
 * Corrected 2026-08-25 — an earlier version of this docblock claimed it matched
 * a specific landing-page's technique; that claim was false and actively
 * misleading.
 *
 * The noise-displaced-plane technique matches a well-known reference
 * implementation circulated widely from roughly 2020-21 (see the licence-
 * provenance note below): raw-noise vertex colour, no texture sampling, no
 * striation field, no angular blur pass — which is what modern production
 * sites of this kind use instead.
 *
 * That gap is the whole reason this effect's look was rejected — so do not
 * read this file as a faithful model of any current commercial
 * implementation.
 *
 * ── WHY THIS IS A SIBLING OF `renderer.js`, NOT AN EXTENSION OF IT ────────
 *
 * `renderer.js` draws ONE FULLSCREEN TRIANGLE — three vertices, a fixed vertex
 * shader, one draw. Its own docblock explains why that shape is deliberate, and
 * the shipped `surface-treatment` effect depends on it. This technique needs the
 * opposite: thousands of vertices and a CUSTOM vertex shader, because the motion
 * IS vertex displacement. Making the geometry and vertex stage configurable
 * would have put a conditional through the core of a live effect for the benefit
 * of a decorative one. A sibling keeps that effect untouched.
 *
 * The cost of that choice, stated rather than hidden: the three Tier W house
 * contracts (context-loss recovery, explicit GPU disposal, power/thermal
 * awareness) are implemented HERE as well as there. They are duplicated
 * deliberately, and any fix to one must be applied to the other.
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
 * The vertex technique (noise-displaced plane + per-vertex layer blending) is
 * modelled on `sa3dany/wave-gradient` (MIT), whose own shader header states it
 * is "based on the original vertex shader used by stripe for their gradient".
 * ⚠ Read that quote as dated, not current: "the original vertex shader" is the
 * ~2020-21 one. It is accurate as licence provenance for OUR lineage (which is
 * what this block is for) and must stay; it is not a claim about stripe.com now.
 * The simplex noise below is Ashima Arts / Stefan Gustavson (MIT).
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

/** Number of colour layers blended on top of the base — matches the reference implementation's layer count (see licence-provenance note above). */
export const WAVE_LAYERS = 3;

/**
 * Vertex stage. The displacement happens here, and so does every noise
 * EVALUATION — but not the colour. The stage emits the RAW per-layer noise
 * values and lets the rasteriser interpolate those; the sharpening and the
 * blend happen per-pixel in the fragment stage.
 *
 * ⛔ Do NOT move the sharpening back here. Interpolating the OUTPUT of a steep
 * nonlinear function (`smoothstep` then `pow`) across a triangle is not the same
 * as applying that function to the interpolated INPUT: the first manufactures a
 * visible crease at every triangle boundary, which is exactly the "visible
 * polygons" defect this shape was written to remove. Interpolating raw noise —
 * smooth by construction — and sharpening afterwards costs ZERO extra noise
 * evaluations; only a handful of cheap smoothstep/pow/mix calls move to
 * per-pixel.
 */
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
uniform float u_time;
uniform float u_amplitude;
uniform vec2 u_layerFreq[ ${ WAVE_LAYERS } ];
uniform float u_layerFlow[ ${ WAVE_LAYERS } ];
uniform float u_layerSeed[ ${ WAVE_LAYERS } ];
out float v_layerNoise[ ${ WAVE_LAYERS } ];
${ SIMPLEX_3D }

void main() {
	float time = u_time * 0.3;

	// VERTEX DISPLACEMENT. Faded to zero at the top and bottom edges so the
	// plane still covers its box exactly — without this the mesh tears away
	// from the edge and shows the page behind it.
	//
	// ⛔ The Y multiplier is 1.5, NOT 4.0, and it is not a taste setting. At 64
	// segments a mesh row is 2/64 ≈ 0.03125 clip units from its neighbour; at
	// 4.0 the noise gradient between adjacent rows could exceed that spacing, so
	// rows crossed over one another. The context is created with depth:false, so
	// there is no depth buffer to sort them and a folded triangle painted a
	// hard, un-interpolated seam over its neighbour — hard creases, not
	// waviness. The FREQUENCY is
	// what fixes that: do not "restore" 4.0, and do not compensate by cutting
	// u_amplitude, which only shrinks the motion.
	float noise = snoise( vec3(
		a_position.x * 3.0 + time * 0.3,
		a_position.y * 1.5,
		time
	) );
	noise *= 1.0 - pow( abs( a_position.y ), 2.0 );

	gl_Position = vec4(
		a_position.x,
		a_position.y + noise * u_amplitude,
		0.0,
		1.0
	);

	// RAW per-layer noise — one evaluation per layer per vertex, the same count
	// as before. Each layer keeps its own frequency, flow and seed so the layers
	// are genuinely different fields rather than one field in three colours.
	// ⚠ These are the COLOUR frequencies (u_layerFreq) and are unrelated to the
	// displacement frequency above; changing one never implies changing the other.
	for ( int i = 0; i < ${ WAVE_LAYERS }; i++ ) {
		v_layerNoise[ i ] = snoise( vec3(
			a_position.x * u_layerFreq[ i ].x + time * u_layerFlow[ i ],
			a_position.y * u_layerFreq[ i ].y,
			time * 0.6 + u_layerSeed[ i ]
		) );
	}
}`;

/**
 * Fragment stage. Sharpens the interpolated raw noise, blends the layers IN
 * LINEAR LIGHT, converts the result back to sRGB, and dithers.
 *
 * ⛔ The blend is linear-light on purpose. Mixing gamma-encoded (sRGB) channel
 * values directly darkens every colour crossing by an amount nobody authored.
 * There is no lighting model anywhere in this effect, so any shadow-like edge
 * between two colours WAS that bug. The four colours arrive already converted to
 * linear by the JS upload (`pow(c, 2.2)`); this stage converts back with
 * `pow(c, 1.0/2.2)`. Convert in both places or in neither — one alone is worse
 * than the original.
 *
 * `highp` is required here, not merely preferred: `pow(n, u_sharpness)` now runs
 * per-pixel, and `mediump` quantises it into visible steps. GLSL ES 3.00
 * guarantees `highp` in the fragment stage (unlike ES 1.00), so there is no
 * compatibility cost.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec3 u_baseColour;
uniform vec3 u_layerColour[ ${ WAVE_LAYERS } ];
uniform float u_sharpness;
in float v_layerNoise[ ${ WAVE_LAYERS } ];
out vec4 outColour;

/** Normal alpha blend, matching the reference implementation's blendNormal. */
vec3 blendNormal( vec3 base, vec3 blend, float opacity ) {
	return blend * opacity + base * ( 1.0 - opacity );
}

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
	// Sharpening lives HERE, applied to the interpolated raw noise. The exponent
	// is a uniform rather than a literal so it can be tuned without a shader
	// edit; the old hardcoded 4.0 was over-cranked and contributed to the harsh
	// look this pass removed.
	vec3 colour = u_baseColour;
	for ( int i = 0; i < ${ WAVE_LAYERS }; i++ ) {
		float n = smoothstep( 0.1, 0.9, v_layerNoise[ i ] * 0.5 + 0.5 );
		colour = blendNormal( colour, u_layerColour[ i ], pow( n, u_sharpness ) );
	}

	// Linear light -> sRGB for the framebuffer.
	colour = pow( max( colour, 0.0 ), vec3( 1.0 / 2.2 ) );

	// Triangular-noise dither, roughly ±half an 8-bit code. The palette is light
	// and its hues sit close together, so the gradient crosses very few distinct
	// 8-bit values across a wide screen and banding shows. Two hashes subtracted
	// give a triangular distribution, which dithers far more evenly than one
	// uniform sample. This is a few lines inside the SAME fragment invocation —
	// not a second pass, not a framebuffer, not a grain texture.
	float dither = ( hash12( gl_FragCoord.xy ) - hash12( gl_FragCoord.yx + 17.0 ) ) / 255.0;
	outColour = vec4( clamp( colour + dither, 0.0, 1.0 ), 1.0 );
}`;

/**
 * Build an indexed subdivided plane in clip space (-1..1 on both axes).
 *
 * Resolution is a real trade-off, not a default: every vertex evaluates
 * (1 + WAVE_LAYERS) simplex-noise calls every frame. 64x64 is ~4k vertices and
 * ~16k noise evaluations per frame, which a phone handles; doubling it
 * quadruples that for a difference nobody can see at this smoothness.
 *
 * @param {number} segments Subdivisions per axis.
 * @return {{positions: Float32Array, indices: Uint16Array}} Geometry.
 */
function buildPlane( segments ) {
	const positions = [];
	for ( let y = 0; y <= segments; y++ ) {
		for ( let x = 0; x <= segments; x++ ) {
			positions.push( ( x / segments ) * 2 - 1, ( y / segments ) * 2 - 1 );
		}
	}
	const indices = [];
	const stride = segments + 1;
	for ( let y = 0; y < segments; y++ ) {
		for ( let x = 0; x < segments; x++ ) {
			const a = y * stride + x;
			indices.push( a, a + 1, a + stride, a + 1, a + stride + 1, a + stride );
		}
	}
	return {
		positions: new Float32Array( positions ),
		indices: new Uint16Array( indices ),
	};
}

/**
 * Convert one sRGB (gamma-encoded) colour to linear light.
 *
 * The client's colours arrive as sRGB — that is what a hex swatch is. Blending
 * them AS sRGB is the bug this removes: linear interpolation between two
 * gamma-encoded values lands darker than the colour a human reads as halfway,
 * which is why crossings looked like shadows in an effect that has no lights in
 * it at all. Converted once here on upload rather than per-fragment; the shader
 * converts the blended result back.
 *
 * `pow(c, 2.2)` is the cheap gamma approximation, not the piecewise sRGB
 * transfer function. For a decorative gradient the difference is well under one
 * 8-bit code and it keeps the shader's inverse a single `pow`.
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
 * @param {number}            [opts.amplitude] Displacement, clip-space units.
 * @param {number}            [opts.segments]  Plane subdivisions per axis.
 * @param {number}            [opts.sharpness] Layer-sharpening exponent, default 2.5.
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

	const segments = Math.max( 8, Math.min( 128, opts.segments || 64 ) );
	const amplitude = opts.amplitude === undefined ? 0.28 : opts.amplitude;

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

	const { positions, indices } = buildPlane( segments );
	const vao = gl.createVertexArray();
	gl.bindVertexArray( vao );

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW );
	const loc = gl.getAttribLocation( program, 'a_position' );
	gl.enableVertexAttribArray( loc );
	gl.vertexAttribPointer( loc, 2, gl.FLOAT, false, 0, 0 );

	const indexBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW );
	gl.bindVertexArray( null );

	gl.useProgram( program );
	const u = ( name ) => gl.getUniformLocation( program, name );
	gl.uniform3fv( u( 'u_baseColour' ), toLinear( colours[ 0 ] ) );
	gl.uniform1f( u( 'u_amplitude' ), amplitude );
	// Sharpening exponent for pow(n, x) in the fragment stage. 2.5 still gives
	// distinct colour bands; the 4.0 this replaced was over-cranked and read as
	// harsh once the sharpening moved to per-pixel.
	gl.uniform1f( u( 'u_sharpness' ), opts.sharpness === undefined ? 2.5 : opts.sharpness );
	for ( let i = 0; i < WAVE_LAYERS; i++ ) {
		gl.uniform3fv( u( `u_layerColour[${ i }]` ), toLinear( colours[ i + 1 ] ) );
		// Each layer gets a DIFFERENT frequency, flow and seed. Identical
		// values would make every layer the same field in a different colour,
		// which is the "three shapes moving together" failure this replaces.
		gl.uniform2f( u( `u_layerFreq[${ i }]` ), 2.0 + i * 1.3, 3.0 + i * 0.9 );
		gl.uniform1f( u( `u_layerFlow[${ i }]` ), 0.18 + i * 0.11 );
		gl.uniform1f( u( `u_layerSeed[${ i }]` ), i * 37.4 );
	}
	const timeLoc = u( 'u_time' );

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
		}
	};

	const draw = ( seconds ) => {
		if ( lost ) {
			return false;
		}
		gl.useProgram( program );
		gl.bindVertexArray( vao );
		gl.uniform1f( timeLoc, seconds );
		gl.drawElements( gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0 );
		gl.bindVertexArray( null );
		return true;
	};

	return {
		draw,
		resize,
		destroy: () => {
			canvas.removeEventListener( 'webglcontextlost', onContextLost );
			// GPU objects are NOT garbage-collected like DOM nodes; leaks
			// compound across navigations. Deleted explicitly, in order.
			gl.deleteBuffer( positionBuffer );
			gl.deleteBuffer( indexBuffer );
			gl.deleteVertexArray( vao );
			gl.deleteProgram( program );
			const ext = gl.getExtension( 'WEBGL_lose_context' );
			if ( ext ) {
				ext.loseContext();
			}
		},
	};
}
