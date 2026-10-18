/**
 * The hue helpers behind the narrow-palette warning (D946/1f). Read by the Effects panel.
 *
 * @package
 */

/* global getComputedStyle */
import { resolveColourToken } from '../../../../components';

/*
 * ── Narrow-hue-palette warning (D946/1f) ────────────────────────────────────
 * Bean's approved direction: WARN, don't block. Reuses the exact pattern
 * already shipped for this shape of problem — `sgs/site-header`'s
 * `contrastSafe` mechanism (a computed check against the operator's own
 * colour choices, a non-dismissible `<Notice status="warning">` naming the
 * specific issue) — rather than inventing a second warning mechanism.
 *
 * The CURRENT alpha-composite blob engine's real vulnerability, measured
 * this session, is the OPPOSITE of what the (now-corrected) Colour 2 help
 * text used to say: colours picked too CLOSE together in hue wash out;
 * colours spread wide — even near-opposite ones like navy+gold — work fine.
 */

/**
 * RGB (each 0-255) -> hue, 0-360 degrees. Standard HSL hue formula. A fully
 * achromatic (grey) input has no real hue; it is reported as 0 rather than
 * excluded — a near-grey stop reads as "close to everything" in the
 * plain-English warning anyway, which is the right outcome even though the
 * literal hue value is arbitrary for it.
 *
 * @param {number} r 0-255.
 * @param {number} g 0-255.
 * @param {number} b 0-255.
 * @return {number} Hue, 0-360.
 */
export function rgbToHue( r, g, b ) {
	const rN = r / 255;
	const gN = g / 255;
	const bN = b / 255;
	const max = Math.max( rN, gN, bN );
	const min = Math.min( rN, gN, bN );
	const delta = max - min;
	if ( delta === 0 ) {
		return 0;
	}
	let h;
	if ( max === rN ) {
		h = ( ( gN - bN ) / delta ) % 6;
	} else if ( max === gN ) {
		h = ( bN - rN ) / delta + 2;
	} else {
		h = ( rN - gN ) / delta + 4;
	}
	h *= 60;
	if ( h < 0 ) {
		h += 360;
	}
	return h;
}

/**
 * Circular distance between two hues on the colour wheel, 0-180 degrees
 * (the shorter way around).
 *
 * @param {number} a Hue, 0-360.
 * @param {number} b Hue, 0-360.
 * @return {number} Distance, 0-180.
 */
export function circularHueDistance( a, b ) {
	const diff = Math.abs( a - b ) % 360;
	return diff > 180 ? 360 - diff : diff;
}

/**
 * Resolve a stored `DesignTokenPicker` value (slug, hex, rgb(), var(), …) to
 * a hue, via the SAME probe-element technique `wcag-contrast.js`'s
 * `calculateRelativeLuminance()` already uses for `var()` — the browser's
 * own computed style is the only reliable way to turn an arbitrary CSS
 * colour syntax into concrete channels without re-implementing CSS colour
 * parsing.
 *
 * @param {string} value   Stored colour value.
 * @param {Array}  palette Active theme colour palette ([{ slug, color }]).
 * @return {number|null} Hue, 0-360, or null when the value is empty/unresolvable.
 */
export function resolveHue( value, palette ) {
	const resolved = resolveColourToken( value, palette );
	if ( ! resolved ) {
		return null;
	}
	const probe = document.createElement( 'div' );
	probe.style.color = resolved;
	document.body.appendChild( probe );
	const computed = getComputedStyle( probe ).color;
	document.body.removeChild( probe );
	const m = computed.match( /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/ );
	if ( ! m ) {
		return null;
	}
	return rgbToHue(
		parseInt( m[ 1 ], 10 ),
		parseInt( m[ 2 ], 10 ),
		parseInt( m[ 3 ], 10 )
	);
}

/**
 * Threshold below which the four generative-background colours are flagged
 * as too close together — a conservative starting threshold, not
 * independently re-validated below 30°; revisit if real client feedback
 * disagrees. The investigation's measured data showed genuinely washed
 * palettes at 4-7 degrees spread and healthy results from 100+ degrees.
 *
 * @type {number}
 */
export const FX_GEN_HUE_SPREAD_WARNING_THRESHOLD = 30;
