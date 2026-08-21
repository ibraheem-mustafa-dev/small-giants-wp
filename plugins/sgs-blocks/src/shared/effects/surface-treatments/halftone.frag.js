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

	// Hue-preserving darken toward near-black ink (see module docblock) —
	// scaling the source RGB keeps its ratio, so colour survives.
	vec3 inkTint = srcColour.rgb * 0.08;
	vec3 result = mix( srcColour.rgb, inkTint, dotMask );

	fragColour = vec4( clamp( result, 0.0, 1.0 ), srcColour.a );
}
`;
