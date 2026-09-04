/**
 * Shared WCAG 2.1 contrast maths — extracted from the near-duplicate copies
 * that used to live in `blocks/site-header/edit.js` and
 * `blocks/site-footer/edit.js` (both advisory contrast-warning notices).
 * This is the ONE place these functions are defined; every consumer imports
 * from here rather than re-declaring them.
 *
 * `calculateRelativeLuminance` / `calculateContrastRatio` / `meetsWCAG_AA`
 * mirror the PHP `sgs_wcag_relative_luminance()` algorithm — keep both in
 * sync if either changes.
 */
import { getGradientAstWithDefault, getStopCssColor } from '../components/gradient-picker/utils';

/**
 * Compute WCAG 2.1 relative luminance from an sRGB hex, RGB, or CSS variable colour.
 *
 * @param {string}      hex   Colour: '#f3e5ab', 'rgb(243,229,171)', or 'var(--wp--preset--color--primary)'
 * @param {HTMLElement} refEl Reference element for computing CSS variables (optional)
 * @return {number} Relative luminance in [0.0, 1.0], or -1.0 on failure
 */
export function calculateRelativeLuminance( hex, refEl = null ) {
	// Handle CSS variables: resolve via computed style on a probe element
	if ( /^var\(/i.test( hex ) ) {
		if ( ! refEl ) return -1.0;
		const probe = document.createElement( 'div' );
		probe.style.color = hex;
		refEl.appendChild( probe );
		const resolved = getComputedStyle( probe ).color;
		refEl.removeChild( probe );
		hex = resolved;
	}

	// Handle rgb() or rgba() — extract the numeric channels
	const rgbMatch = hex.match( /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/ );
	if ( rgbMatch ) {
		const r = parseInt( rgbMatch[ 1 ], 10 ) / 255.0;
		const g = parseInt( rgbMatch[ 2 ], 10 ) / 255.0;
		const b = parseInt( rgbMatch[ 3 ], 10 ) / 255.0;

		const linearise = ( c ) =>
			c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );

		return 0.2126 * linearise( r ) + 0.7152 * linearise( g ) + 0.0722 * linearise( b );
	}

	// Handle hex: normalise, expand shorthand, parse
	hex = hex.replace( /^#/, '' ).toUpperCase();
	if ( hex.length === 3 ) {
		hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ];
	}
	if ( hex.length !== 6 || ! /^[0-9A-F]+$/.test( hex ) ) {
		return -1.0;
	}

	const r = parseInt( hex.substr( 0, 2 ), 16 ) / 255.0;
	const g = parseInt( hex.substr( 2, 2 ), 16 ) / 255.0;
	const b = parseInt( hex.substr( 4, 2 ), 16 ) / 255.0;

	const linearise = ( c ) =>
		c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );

	return 0.2126 * linearise( r ) + 0.7152 * linearise( g ) + 0.0722 * linearise( b );
}

/**
 * Calculate WCAG 2.1 contrast ratio between two luminance values.
 *
 * @param {number} l1 Luminance of first colour
 * @param {number} l2 Luminance of second colour
 * @return {number} Contrast ratio, or -1 on invalid input
 */
export function calculateContrastRatio( l1, l2 ) {
	if ( l1 < 0 || l2 < 0 ) return -1;
	const lighter = Math.max( l1, l2 );
	const darker = Math.min( l1, l2 );
	return ( lighter + 0.05 ) / ( darker + 0.05 );
}

/**
 * Determine if contrast meets WCAG 2.1 AA thresholds.
 *
 * @param {number}  ratio        Contrast ratio
 * @param {boolean} isLargeText True if text is 18px+ or 14px+ bold
 * @return {boolean} True if contrast meets AA standard
 */
export function meetsWCAG_AA( ratio, isLargeText = false ) {
	if ( ratio < 0 ) return false;
	return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Worst-stop contrast ratio between a CSS gradient and a flat background
 * colour — the cheapest reasonably-accurate gradient contrast check,
 * matching the "worst-stop" method used by the existing flat-colour checks.
 * Parses `gradientValue` via the shared gradient-picker AST parser, resolves
 * every colour stop to a real CSS colour, computes each stop's contrast
 * against `backgroundHex`, and returns the LOWEST ratio found.
 *
 * @param {string}      gradientValue CSS gradient function string (e.g. `linear-gradient(...)`).
 * @param {string}      backgroundHex Colour to contrast every stop against.
 * @param {HTMLElement} [refEl]       Reference element for resolving CSS variables (optional).
 * @return {number} The worst (lowest) contrast ratio across all stops, or -1
 *                   when there is no gradient, it fails to parse, or the
 *                   background is invalid.
 */
export function worstGradientContrastRatio( gradientValue, backgroundHex, refEl = null ) {
	if ( ! gradientValue ) {
		return -1;
	}

	const { gradientAST, hasGradient } = getGradientAstWithDefault( gradientValue );
	if ( ! hasGradient || ! gradientAST?.colorStops?.length ) {
		return -1;
	}

	const backgroundLuminance = calculateRelativeLuminance( backgroundHex, refEl );
	if ( backgroundLuminance < 0 ) {
		return -1;
	}

	let worstRatio = -1;
	gradientAST.colorStops.forEach( ( stop ) => {
		const cssColor = getStopCssColor( stop );
		const stopLuminance = calculateRelativeLuminance( cssColor, refEl );
		const ratio = calculateContrastRatio( backgroundLuminance, stopLuminance );
		if ( ratio < 0 ) {
			return;
		}
		if ( worstRatio < 0 || ratio < worstRatio ) {
			worstRatio = ratio;
		}
	} );

	return worstRatio;
}
