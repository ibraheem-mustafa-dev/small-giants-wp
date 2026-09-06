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

// SCROLL-RESOLVE (2026-08-21). 0 = the treatment at full chosen strength (the
// resting state); 1 = the untouched source image. The boot module drives this
// from 1 -> 0 as the element scrolls into view, so the treatment DEVELOPS in
// rather than the photograph resolving away — the settled appearance is
// therefore unchanged from before this uniform existed, which is why adding it
// could not regress a look the owner had already approved.
// Preset-agnostic on purpose: one knob, three shaders, one driver.
uniform float uResolve;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

void main() {
	vec4 srcColour = texture( u_image, v_uv );
	float lum = dot( srcColour.rgb, LUMA );

	// STRETCH THE LUMINANCE BEFORE MAPPING IT. Measured on the canary
	// 2026-08-21: feeding raw sRGB luminance straight into the ramp produced
	// a muddy, over-dark result on real client photography, because a
	// mid-key photograph's luminance clusters well below 0.5 — so
	// mix( shadow, highlight, lum ) only ever reached the bottom third of
	// the ramp and the highlight colour was never approached. That reads as
	// "the image got darker", not "the image got art-directed", which fails
	// this phase's own good-by-default bar.
	//
	// smoothstep re-maps the band real photographs actually occupy across
	// the FULL shadow -> highlight range, with an eased roll-off at both
	// ends so clipped blacks and blown highlights do not posterise.
	lum = smoothstep( 0.06, 0.78, lum );

	vec3 duo = mix( uShadow, uHighlight, lum );

	// uMix = 1.0 → full duotone; uMix = 0.0 → untouched source. Blending
	// back toward the original (rather than only exposing intensity via
	// uShadow/uHighlight themselves) is what lets a client "dial the
	// effect back" without having to re-pick both colours.
	vec3 result = mix( srcColour.rgb, duo, uMix );

	// Blend back toward the untouched source by uResolve (see its
	// declaration above). At uResolve = 0 this is a no-op.
	vec3 resolved = mix( result, srcColour.rgb, uResolve );

	fragColour = vec4( clamp( resolved, 0.0, 1.0 ), srcColour.a );
}
`;
