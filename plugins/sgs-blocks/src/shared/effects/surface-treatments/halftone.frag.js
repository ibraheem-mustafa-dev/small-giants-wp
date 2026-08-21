/**
 * SGS Tier W — halftone (dot-screen) fragment shader (Spec 38 §1.2b, D479).
 *
 * Single-pass, per-pixel: `v_uv` is rotated by `uAngle` and tiled by
 * `uScale` to lay out a dot-screen grid, then each pixel's distance from its
 * cell centre is compared against a radius DERIVED FROM THE SOURCE
 * LUMINANCE at that pixel — darker source content produces a larger dot,
 * which is how a real halftone print encodes tone with a single ink colour.
 * No lookup texture, no previous frame; the grid is pure trigonometry so it
 * stays perfectly sharp at any `uScale` with no aliasing beyond what
 * `smoothstep( )`/`uSoftness` already controls.
 *
 * WHY HUE IS PRESERVED RATHER THAN OUTPUTTING BLACK/WHITE DOTS. A literal
 * halftone print substitutes a single ink colour; naively doing that here
 * (mixing toward pure black) would discard the source's colour entirely and
 * read as a generic threshold/posterize effect, not "halftone applied to a
 * photo". Multiplying the source colour toward near-black (rather than
 * mixing toward a fixed ink colour) keeps every dot's RGB ratio identical to
 * its source pixel — the hue survives, only the value drops — while still
 * reading as "ink" rather than "the image got darker".
 *
 * @package
 */

export const HALFTONE_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColour;

uniform sampler2D u_image;
uniform float uScale;
uniform float uAngle;
uniform float uSoftness;

// SCROLL-RESOLVE (2026-08-21). 0 = the treatment at full chosen strength (the
// resting state); 1 = the untouched source image. The boot module drives this
// from 1 -> 0 as the element scrolls into view, so the treatment DEVELOPS in
// rather than the photograph resolving away — the settled appearance is
// therefore unchanged from before this uniform existed, which is why adding it
// could not regress a look the owner had already approved.
// Preset-agnostic on purpose: one knob, three shaders, one driver.
uniform float uResolve;

// The DOT COLOUR. Was hard-coded to a near-black scaling of the source,
// which is why the owner saw 'just a black diagonal line pattern' and asked
// where the colour options were - a fair question, since a halftone's ink is
// the single most brand-expressive thing about it. Defaults to a deepened
// palette colour so an untouched halftone is already on-brand.
uniform vec3 uInk;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

/** Standard 2D rotation matrix application, inlined (no mat2 uniform — this
 * substrate supports only float/vecN uniforms, so uAngle is a plain float
 * and the rotation happens here, not via an uploaded matrix). */
vec2 rotate( vec2 p, float a ) {
	float s = sin( a );
	float c = cos( a );
	return vec2( p.x * c - p.y * s, p.x * s + p.y * c );
}

void main() {
	vec4 srcColour = texture( u_image, v_uv );
	float lum = dot( srcColour.rgb, LUMA );

	vec2 rotated = rotate( v_uv, uAngle ) * uScale;
	vec2 cell = fract( rotated ) - 0.5;
	float dist = length( cell );

	// Darker source → larger dot. 0.75 keeps the largest dot inside its
	// cell (max possible distance to a cell corner is ~0.707) so shadows
	// still show a visible gap between dots rather than solid-filling.
	float radius = ( 1.0 - lum ) * 0.75;
	float dotMask = 1.0 - smoothstep(
		radius - uSoftness * 0.5,
		radius + uSoftness * 0.5,
		dist
	);

	// The ink is the client's colour, modulated by the source luminance so
	// the print still reads as tonal rather than as a flat stencil: a dot
	// over a dark region prints denser than one over a light region.
	// Retaining a little of the source keeps the image legible under the
	// screen rather than obliterated by it.
	vec3 ink = uInk * ( 0.55 + 0.45 * lum );
	vec3 result = mix( srcColour.rgb, ink, dotMask );

	// Blend back toward the untouched source by uResolve (see its
	// declaration above). At uResolve = 0 this is a no-op.
	vec3 resolved = mix( result, srcColour.rgb, uResolve );

	fragColour = vec4( clamp( resolved, 0.0, 1.0 ), srcColour.a );
}
`;
