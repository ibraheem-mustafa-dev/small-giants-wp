/**
 * Editor-canvas mirror of sgs/label's leading dot: the same `::before` rule render.php prints
 * (`dot`, `dotColour`, `dotColourGradient`, `dotSize`, `dotGap`), scoped to the canvas
 * element's own class and printed in an editor `<style>`, since a pseudo-element cannot take
 * an inline style.
 *
 * Every value reaching the rule is checked to be a plain length, preset variable, colour or
 * gradient, so a stored value cannot carry CSS out of the declaration.
 *
 * @package SGS\Blocks
 */
import { colourVar, gapVar, isCssGradient, sgsLengthPreview } from '../../utils';

const SAFE_LENGTH = /^-?(?:\d+|\d*\.\d+)(?:[a-z]+|%)?$/i;
const SAFE_PRESET = /^var\(--wp--preset--spacing--[a-z0-9-]+\)$/i;
const UNSAFE_CHARS = /[{};<>]/;

/**
 * A length safe to print, or ''.
 *
 * @param {string|undefined} value Candidate CSS value.
 * @return {string} The value, or '' when it is not a plain length or spacing preset.
 */
function safeLength( value ) {
	const text = 'string' === typeof value ? value.trim() : '';
	return SAFE_LENGTH.test( text ) || SAFE_PRESET.test( text ) ? text : '';
}

/**
 * The dot's paint declaration: a gradient wins over the flat colour; neither follows the text
 * colour (`currentColor`). Mirrors `sgs_background_paint_decl()` plus render.php's fallback.
 *
 * @param {string} colour   dotColour (palette slug or CSS colour).
 * @param {string} gradient dotColourGradient.
 * @return {string} One declaration, without a trailing semicolon.
 */
function dotPaint( colour, gradient ) {
	if ( isCssGradient( gradient ) && ! UNSAFE_CHARS.test( gradient ) ) {
		return `background-image:${ gradient.trim() }`;
	}
	const flat = colourVar( colour );
	if ( flat && ! UNSAFE_CHARS.test( flat ) ) {
		return `background-color:${ flat }`;
	}
	return 'background-color:currentColor';
}

/**
 * The leading dot's `::before` rule for the editor canvas.
 *
 * @param {string} selector   The canvas element's own selector, e.g. `.sgs-lbl-ed-{clientId}`.
 * @param {Object} attributes Block attributes.
 * @return {string} The CSS rule, or '' when the dot is off.
 */
export function labelDotPreviewCss( selector, attributes = {} ) {
	if ( ! attributes.dot ) {
		return '';
	}
	const size = safeLength( sgsLengthPreview( attributes.dotSize ) ) || '7px';
	const gap = safeLength( gapVar( attributes.dotGap ) ) || '8px';
	const paint = dotPaint( attributes.dotColour, attributes.dotColourGradient );
	return `${ selector }::before{content:"";display:inline-block;flex-shrink:0;width:${ size };height:${ size };border-radius:50%;vertical-align:middle;margin-inline-end:${ gap };${ paint };}`;
}
