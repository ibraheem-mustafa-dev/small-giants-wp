/**
 * SGS motion — aurora renderer (Spec 38, Tier W). WebGL2, one pass.
 *
 * ⛔ WHY THIS IS A SHADER AND NOT CSS.
 * Three separate CSS attempts at an aurora were built and rejected, each
 * failing differently: discrete blurred columns read as bars, soft-masked
 * lozenges read as ovals, broad connected bands read as horizontal haze. What
 * makes an aurora read as an aurora is fine vertical striation plus a curtain
 * that folds through itself, and both need per-pixel noise and DOMAIN WARPING
 * — warping one noise field by the output of another. CSS has gradients, blur,
 * masks and transforms; it has no noise primitive and no way to warp one shape
 * by another, so this is a ceiling rather than a tuning problem. The other four
 * background variants stay in CSS precisely because they are soft-light looks
 * that CSS renders honestly.
 *
 * ⛔ NEVER PUT A BACKTICK INSIDE THE GLSL STRINGS BELOW, INCLUDING IN A
 * COMMENT. They are JS template literals; a backtick terminates the string
 * early and the build fails with an unrelated-looking parse error. This file's
 * sibling has broken this way twice.
 *
 * ⚠ ADDITIVE ACCUMULATION IS CORRECT HERE, AND WAS WRONG NEXT DOOR.
 * The sibling wave-gradient effect had additive blending reverted because its
 * ground is deliberately light, leaving no headroom below white. An aurora's
 * ground is near-black by definition, so light adding to darkness is both
 * physically right and numerically safe. A soft Reinhard tone-map still runs
 * before output so three overlapping curtains roll off instead of clipping.
 *
 * Colours arrive from the block's own theme tokens, so a re-themed site
 * re-colours the aurora with no code change.
 *
 * Noise is Ashima / Gustavson simplex (MIT). ⛔ nimitz's Shadertoy "Auroras" is
 * CC BY-NC-SA (NON-COMMERCIAL) and is NOT used, referenced or derived from
 * here — most aurora shaders in the wild descend from it, so check any future
 * reference against its licence before reading it.
 *
 * @package SGS\Blocks
 */

/** Number of curtain layers accumulated per frame. */
export const AURORA_CURTAINS = 3;

const VERTEX_SHADER = `#version 300 es
// Fullscreen triangle straight from gl_VertexID: no vertex buffer, no index
// buffer, no VAO. The three vertices overshoot the viewport so the clipped
// triangle covers it exactly once.
out vec2 v_uv;
void main() {
	vec2 pos = vec2( float( ( gl_VertexID << 1 ) & 2 ), float( gl_VertexID & 2 ) );
	v_uv = pos;
	gl_Position = vec4( pos * 2.0 - 1.0, 0.0, 1.0 );
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColour;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;
uniform vec3  u_base;
uniform vec3  u_low;
uniform vec3  u_mid;
uniform vec3  u_high;

// Ashima / Gustavson 2D simplex noise (MIT).
vec3 permute( vec3 x ) { return mod( ( ( x * 34.0 ) + 1.0 ) * x, 289.0 ); }

float snoise( vec2 v ) {
	const vec4 C = vec4( 0.211324865405187, 0.366025403784439,
	                    -0.577350269189626, 0.024390243902439 );
	vec2 i  = floor( v + dot( v, C.yy ) );
	vec2 x0 = v - i + dot( i, C.xx );
	vec2 i1 = ( x0.x > x0.y ) ? vec2( 1.0, 0.0 ) : vec2( 0.0, 1.0 );
	vec4 x12 = x0.xyxy + C.xxzz;
	x12.xy -= i1;
	i = mod( i, 289.0 );
	vec3 p = permute( permute( i.y + vec3( 0.0, i1.y, 1.0 ) )
	                        + i.x + vec3( 0.0, i1.x, 1.0 ) );
	vec3 m = max( 0.5 - vec3( dot( x0, x0 ), dot( x12.xy, x12.xy ),
	                          dot( x12.zw, x12.zw ) ), 0.0 );
	m = m * m; m = m * m;
	vec3 x  = 2.0 * fract( p * C.www ) - 1.0;
	vec3 h  = abs( x ) - 0.5;
	vec3 ox = floor( x + 0.5 );
	vec3 a0 = x - ox;
	m *= 1.79284291400159 - 0.85373472095314 * ( a0 * a0 + h * h );
	vec3 g;
	g.x  = a0.x  * x0.x  + h.x  * x0.y;
	g.yz = a0.yz * x12.xz + h.yz * x12.yw;
	return 130.0 * dot( m, g );
}

// Five octaves is where the filaments stop looking like smoke and start
// looking like rays. Four is visibly too smooth at this scale.
float fbm( vec2 p ) {
	float v = 0.0;
	float a = 0.5;
	for ( int i = 0; i < 5; i++ ) {
		v += a * snoise( p );
		p *= 2.02;
		a *= 0.5;
	}
	return v;
}

void main() {
	// v_uv runs 0..2 across the viewport, so halve it for 0..1. y increases
	// upward, which is what lets "green low, violet high" be written directly.
	vec2 uv = v_uv * 0.5;
	float aspect = u_resolution.x / max( u_resolution.y, 1.0 );
	vec2 p = vec2( uv.x * aspect, uv.y );
	float t = u_time * 0.06;

	vec3 col = u_base;

	// GROUND-ADAPTIVE COMPOSITING.
	// Emissive light only reads on a dark ground: adding to a near-white base
	// just pushes it to white, which is exactly how the sibling effect died at
	// D828. Rather than forbid light palettes - the client picks every colour
	// from theme tokens, so we must not trap them - the curtains ADD on a dark
	// ground and DARKEN on a light one. Smoothstep, not a branch, so a mid
	// ground crossfades instead of snapping.
	float baseLum = dot( u_base, vec3( 0.2126, 0.7152, 0.0722 ) );
	float onLight = smoothstep( 0.18, 0.45, baseLum );

	for ( int i = 0; i < 3; i++ ) {
		float fi = float( i );
		float scale = 1.4 + fi * 0.7;

		// DOMAIN WARP. Sampling fbm at a coordinate that is itself displaced by
		// fbm is what folds the curtain through itself. This is the one step
		// CSS cannot express, and the whole reason this variant is a shader.
		vec2 q = vec2(
			fbm( p * scale + vec2( 0.0, t ) ),
			fbm( p * scale + vec2( 3.7, -t * 0.8 ) )
		);
		float w = fbm( p * scale + q * 1.6 + vec2( t * 0.5, 0.0 ) );

		// The curtain's centre line sways and is bent by the warp, so it never
		// reads as a straight bar.
		// ⛔ EACH CURTAIN IS ANCHORED TO ITS OWN THIRD OF THE FRAME, and the
		// sway plus warp are bounded to keep it there. An earlier version used
		// one shared centre with a +-0.34 swing plus 0.30*warp, which let the
		// centre reach 1.14: every curtain drifted off-frame together and the
		// whole effect faded to black a couple of seconds after load.
		float anchor = 0.22 + fi * 0.28;
		float centre = anchor + 0.11 * sin( t * 0.37 + fi * 2.1 ) + 0.09 * w;
		float d = uv.x - centre;
		float band = exp( -d * d * ( 26.0 - fi * 6.0 ) );

		// Fine vertical striation - the rays. High frequency in x only, so the
		// structure runs up the curtain rather than across it.
		float rays = 0.55 + 0.45 * snoise( vec2( uv.x * 90.0 + w * 6.0, t * 0.7 + fi ) );
		rays = mix( 1.0, rays, 0.65 );

		// Soft top and bottom ends; the top edge itself ripples with the warp.
		float top = 0.86 - 0.16 * w;
		float hmask = smoothstep( 0.02, 0.42, uv.y )
		            * ( 1.0 - smoothstep( top - 0.34, top, uv.y ) );

		// Real aurora colour ordering: oxygen green low, nitrogen violet high.
		float g = clamp( ( uv.y - 0.05 ) / 0.75, 0.0, 1.0 );
		vec3 c = mix( u_low, u_mid, smoothstep( 0.0, 0.55, g ) );
		c = mix( c, u_high, smoothstep( 0.45, 1.0, g ) );

		float weight = band * rays * hmask * u_intensity * ( 0.9 - fi * 0.18 );

		// Dark ground: light adds into the headroom below white.
		vec3 emissive = col + c * weight;
		// Light ground: the curtain reads as pigment settling into the page, so
		// it composites TOWARDS its own colour, darkening rather than blowing out.
		vec3 pigment = mix( col, c * 0.72, clamp( weight, 0.0, 1.0 ) );

		col = mix( emissive, pigment, onLight );
	}

	// Soft Reinhard roll-off, applied only to the emissive case. Overlapping
	// curtains would otherwise clip to white and lose the hue information in
	// the overlap. On a light ground nothing is being added, so tone-mapping
	// there would only wash the page out.
	col = mix( col / ( 1.0 + col * 0.55 ), col, onLight );

	outColour = vec4( col, 1.0 );
}
`;

/**
 * Convert an sRGB 0-255 triple to linear light 0-1.
 *
 * Blending in gamma space muddies overlapping colour; every mix in the shader
 * assumes linear input.
 *
 * @param {number[]} rgb Colour as [ r, g, b ] in 0-255.
 * @return {number[]} The same colour in linear light.
 */
function toLinear( rgb ) {
	return rgb.map( ( channel ) => {
		const c = channel / 255;
		return c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
	} );
}

/**
 * Compile one shader stage.
 *
 * @param {WebGL2RenderingContext} gl     Context.
 * @param {number}                 type   Stage constant.
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
 * Create an aurora renderer bound to a canvas.
 *
 * Mirrors createWaveGradient's handle exactly, so the boot module can drive
 * either renderer through the same three calls.
 *
 * @param {HTMLCanvasElement} canvas         Target canvas.
 * @param {Object}            [opts]         Options.
 * @param {number[][]}        [opts.colours] [ base, low, mid, high ] as 0-255 triples.
 * @param {number}            [opts.amplitude] 0-1; scales how strongly curtains assert.
 * @param {Function}          [opts.onLost]  Called when the GL context is lost.
 * @return {{draw: Function, resize: Function, destroy: Function}|null} Handle, or null.
 */
export function createAurora( canvas, opts = {} ) {
	const gl = canvas.getContext( 'webgl2', {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		// Decline rather than run badly on a software rasteriser: a per-pixel
		// five-octave fbm is exactly the workload that makes an unaccelerated
		// context crawl.
		failIfMajorPerformanceCaveat: true,
		powerPreference: 'default',
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
	// Shader objects are reference-counted by the program once attached, so
	// they can be released immediately after a successful link.
	gl.deleteShader( vs );
	gl.deleteShader( fs );
	if ( ! gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
		gl.deleteProgram( program );
		return null;
	}

	const colours = opts.colours && opts.colours.length >= 4
		? opts.colours
		: [ [ 8, 12, 26 ], [ 61, 224, 160 ], [ 79, 210, 232 ], [ 180, 107, 220 ] ];

	gl.useProgram( program );
	const u = ( name ) => gl.getUniformLocation( program, name );
	gl.uniform3fv( u( 'u_base' ), toLinear( colours[ 0 ] ) );
	gl.uniform3fv( u( 'u_low' ), toLinear( colours[ 1 ] ) );
	gl.uniform3fv( u( 'u_mid' ), toLinear( colours[ 2 ] ) );
	gl.uniform3fv( u( 'u_high' ), toLinear( colours[ 3 ] ) );

	const amplitude = opts.amplitude === undefined ? 0.45 : opts.amplitude;
	gl.uniform1f( u( 'u_intensity' ), 0.6 + Math.max( 0, Math.min( 1, amplitude ) ) * 1.3 );

	const timeLoc = u( 'u_time' );
	const resolutionLoc = u( 'u_resolution' );

	let lost = false;
	const onContextLost = ( event ) => {
		// preventDefault() is what makes a restore possible at all; without it
		// the context is gone for good.
		event.preventDefault();
		lost = true;
		if ( typeof opts.onLost === 'function' ) {
			opts.onLost();
		}
	};
	canvas.addEventListener( 'webglcontextlost', onContextLost );

	const resize = ( width, height, dpr ) => {
		// A five-octave fbm per pixel makes fillrate the binding cost, so the
		// device ratio is capped: a 3x buffer is 9x the work for a decorative
		// background with no hard edges to sharpen.
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
		gl.drawArrays( gl.TRIANGLES, 0, 3 );
		return true;
	};

	return {
		draw,
		resize,
		destroy: () => {
			canvas.removeEventListener( 'webglcontextlost', onContextLost );
			// GPU objects are not garbage-collected like DOM nodes; leaks
			// compound across navigations, so they are deleted explicitly.
			gl.deleteProgram( program );
			const ext = gl.getExtension( 'WEBGL_lose_context' );
			if ( ext ) {
				ext.loseContext();
			}
		},
	};
}
