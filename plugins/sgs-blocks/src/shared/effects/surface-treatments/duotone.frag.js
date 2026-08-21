/**
 * SGS Tier W — duotone fragment shader (Spec 38 §1.2b, D479).
 *
 * Single-pass, per-pixel: Rec. 709 luminance drives a `mix()` between
 * `uShadow` and `uHighlight`, then the result is blended back toward the
 * untouched source by `uMix` so a client can dial the treatment's strength
 * rather than it being all-or-nothing. Rec. 709 (0.2126/0.7152/0.0722) is
 * used rather than the naive average or Rec. 601 weights because it matches
 * what `getComputedStyle`-driven contrast tooling elsewhere in this
 * framework already assumes for sRGB content — using a different weighting
 * here would make this treatment's "shadow"/"highlight" split disagree with
 * the framework's own idea of what counts as dark vs light.
 *
 * @package
 */

export const DUOTONE_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColour;

uniform sampler2D u_image;
uniform vec3 uShadow;
uniform vec3 uHighlight;
uniform float uMix;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

void main() {
	vec4 srcColour = texture( u_image, v_uv );
	float lum = dot( srcColour.rgb, LUMA );

	vec3 duo = mix( uShadow, uHighlight, lum );

	// uMix = 1.0 → full duotone; uMix = 0.0 → untouched source. Blending
	// back toward the original (rather than only exposing intensity via
	// uShadow/uHighlight themselves) is what lets a client "dial the
	// effect back" without having to re-pick both colours.
	vec3 result = mix( srcColour.rgb, duo, uMix );

	fragColour = vec4( clamp( result, 0.0, 1.0 ), srcColour.a );
}
`;
