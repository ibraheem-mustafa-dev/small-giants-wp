/**
 * SGS Tier W — film-grain fragment shader (Spec 38 §1.2b, D479).
 *
 * A single-pass, per-pixel treatment: no second texture, no previous frame,
 * no loop (this directory's contract — see `../webgl/README.md` "SINGLE PASS
 * ONLY"). Grain is generated analytically from a hash of the UV coordinate
 * (plus `uSeed`) rather than sampled from a noise texture, because a texture
 * upload would be a second GPU resource this single-pass effect has no
 * business owning, and a hash is one ALU op cheaper per pixel than a texture
 * fetch on most mobile GPUs.
 *
 * WHY THE NOISE IS SIGNED, NOT ADDITIVE-ONLY. `hash()` returns `[0, 1)`; if
 * that were added to the source colour directly, every pixel would only ever
 * brighten, and the image would visibly wash out at any non-trivial
 * `uIntensity`. Subtracting 0.5 centres the noise on zero so grain scatters
 * luminance both up and down — the mean stays put, which is what "film
 * grain" means perceptually (texture, not a brightness shift).
 *
 * @package
 */

export const GRAIN_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColour;

uniform sampler2D u_image;
uniform float uIntensity;
uniform float uSeed;
uniform float uContrast;

/**
 * Cheap 2D value hash — no texture lookup, no trig, deterministic per
 * pixel + uSeed so the same seed always paints the same grain (useful for
 * a client comparing two uIntensity values without the pattern itself
 * jumping around).
 */
float hash( vec2 p ) {
	p = fract( p * vec2( 123.34, 456.21 ) );
	p += dot( p, p + 45.32 );
	return fract( p.x * p.y );
}

void main() {
	vec4 srcColour = texture( u_image, v_uv );

	// Signed, zero-centred noise (see module docblock) so grain is
	// luminance-preserving on average rather than a one-directional wash.
	float n = hash( v_uv * 1000.0 + uSeed ) - 0.5;
	vec3 grained = srcColour.rgb + n * uIntensity;

	// Gentle contrast lift around the midpoint — grain alone tends to read
	// as "hazy" rather than "filmic" without a small contrast push.
	vec3 contrasted = ( grained - 0.5 ) * uContrast + 0.5;

	fragColour = vec4( clamp( contrasted, 0.0, 1.0 ), srcColour.a );
}
`;
