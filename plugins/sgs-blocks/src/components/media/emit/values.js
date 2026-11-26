/**
 * Media value checks (FR-49-12): every stored string that reaches CSS passes one of these. PHP twin:
 * `includes/media/media-values.php`. They sit on the shared helpers (`cssSingleLengthValue`, `resolvedCssValue`,
 * `composeShadow`) and add what those do not check.
 *
 * @package SGS\Blocks
 */

import { cssSingleLengthValue } from '../../../utils/css-length.js';
import { resolvedCssValue } from '../../../utils/resolved-css-value.js';
import { composeShadow } from '../../../utils/shadow-layers.js';
import {
	functionalColourToHex,
	functionalColoursToHex,
} from '../../../utils/colour-hex.js';
import { NAMED_COLOURS } from './named-colours.js';
import { num } from './core.js';

export { functionalColourToHex };

/**
 * @param {*}        raw      Stored value.
 * @param {string[]} keywords Keywords this setting allows.
 * @return {string} A safe length, an allowed keyword, or ''. A bare number is not a length.
 */
export function mediaLength( raw, keywords = [] ) {
	const value = 'string' === typeof raw ? raw.trim() : '';
	if ( keywords.includes( value ) ) {
		return value;
	}
	if ( '' === value || /^[\d.]+$/.test( value ) ) {
		return '';
	}
	return cssSingleLengthValue( value );
}

/**
 * @param {*} raw Stored value.
 * @return {string} An aspect ratio `w / h`, or ''.
 */
export function mediaRatio( raw ) {
	const value = 'string' === typeof raw ? raw.trim() : '';
	return /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test( value ) ? value : '';
}

/**
 * @param {*} raw Stored value.
 * @return {string} A colour safe to print (hex, rgb(), rgba(), hsl(), hsla(), var(), keyword or palette slug), or ''.
 */
export function mediaColour( raw ) {
	const value = 'string' === typeof raw ? raw.trim() : '';
	if ( '' === value ) {
		return '';
	}
	if ( /^(rgb|rgba|hsl|hsla)\(([0-9a-z\s.,%/+-]*)\)$/i.test( value ) ) {
		return value;
	}
	if ( /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test( value ) ) {
		return value;
	}
	if ( /^var\(/i.test( value ) ) {
		return resolvedCssValue( value );
	}
	if ( ! /^[a-z][a-z0-9-]*$/i.test( value ) ) {
		return '';
	}
	if ( NAMED_COLOURS.includes( value.toLowerCase() ) ) {
		return value;
	}
	return `var(--wp--preset--color--${ value
		.toLowerCase()
		.replace( /[^a-z0-9-]/g, '' ) }, currentColor)`;
}

/**
 * @param {*} raw Stored value.
 * @return {string} A gradient safe to print, or ''. Twin of `sgs_css_gradient_value()`.
 */
export function mediaGradient( raw ) {
	const value = 'string' === typeof raw ? raw.trim() : '';
	if ( '' === value ) {
		return '';
	}
	if (
		! /^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#/_-]+\)$/i.test(
			value
		)
	) {
		return '';
	}
	if ( /[;{}]|url\s*\(|<|>|@|expression/i.test( value ) ) {
		return '';
	}
	return value;
}

/**
 * @param {*} shape  Stored shape.
 * @param {*} colour Stored colour text.
 * @return {string} A box-shadow value, or ''. Functional colours are hex, as `sgs_colour_value()` prints them.
 */
export function mediaShadow( shape, colour ) {
	const value = composeShadow(
		'string' === typeof shape ? shape : '',
		'string' === typeof colour ? colour : ''
	);
	return mediaHexColours( value );
}

/**
 * @param {string} value Shadow text that may hold `rgb()`, `rgba()`, `hsl()` or `hsla()` colours.
 * @return {string} The same text with each such colour as hex, as `sgs_colour_value()` prints them.
 */
export function mediaHexColours( value ) {
	return functionalColoursToHex( value );
}

const BLENDS = [
	'normal',
	'multiply',
	'screen',
	'overlay',
	'darken',
	'lighten',
	'color-dodge',
	'color-burn',
	'hard-light',
	'soft-light',
	'difference',
	'exclusion',
	'hue',
	'saturation',
	'color',
	'luminosity',
	'plus-lighter',
];

/**
 * @param {*} raw Stored value.
 * @return {string} A mix-blend-mode keyword, or ''.
 */
export function mediaBlend( raw ) {
	const value = 'string' === typeof raw ? raw.trim().toLowerCase() : '';
	return BLENDS.includes( value ) ? value : '';
}

/** The colour treatment's tone presets, value => `filter` list. Twin of media-values.php::sgs_media_tone_filters(). */
export const TONE_FILTERS = {
	dim: 'saturate(0.8) brightness(0.82)',
	deepen: 'saturate(1.25) contrast(1.2) brightness(0.78)',
	soften: 'brightness(1.05) saturate(0.9)',
	brighten: 'brightness(1.12) saturate(0.95)',
	sepia: 'sepia(0.6)',
};

/**
 * @param {*} colour   Stored treatment.
 * @param {*} strength Greyscale strength 0 to 100; 100 when unset.
 * @return {string} `grayscale(N%)`, `brightness(0) invert(1)`, or '' for Natural.
 */
export function mediaFilter( colour, strength ) {
	if ( 'white' === colour ) {
		return 'brightness(0) invert(1)';
	}
	if (
		'string' === typeof colour &&
		Object.prototype.hasOwnProperty.call( TONE_FILTERS, colour )
	) {
		return TONE_FILTERS[ colour ];
	}
	if ( 'greyscale' !== colour ) {
		return '';
	}
	const n = isNumeric( strength )
		? Math.max( 0, Math.min( 100, Number( strength ) ) )
		: 100;
	return `grayscale(${ num( n ) }%)`;
}

/**
 * @param {*} raw Stored value.
 * @return {string} A URL safe inside `url()` (http, https or site-relative), or ''.
 */
export function mediaUrl( raw ) {
	const value = 'string' === typeof raw ? raw.trim() : '';
	// eslint-disable-next-line no-control-regex
	if ( '' === value || /["'\()<>{};\s]|[\x00-\x1f]/.test( value ) ) {
		return '';
	}
	return /^(https?:\/\/|\/(?!\/))/i.test( value ) ? value : '';
}

/**
 * PHP `is_numeric()` for the values the stores hold: a number, or a string that is one number.
 *
 * @param {*} value Value.
 * @return {boolean} Whether it is numeric.
 */
export function isNumeric( value ) {
	if ( 'number' === typeof value ) {
		return Number.isFinite( value );
	}
	return (
		'string' === typeof value &&
		/^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test( value )
	);
}

/**
 * @param {*}      raw Stored value.
 * @param {number} max Largest allowed pixel number.
 * @return {string} A length that may be a bare number of pixels (clamped 0 to max), or ''.
 */
export function mediaPx( raw, max = 500 ) {
	if (
		'number' === typeof raw ||
		( 'string' === typeof raw && /^\s*\d+(\.\d+)?\s*$/.test( raw ) )
	) {
		return `${ num( Math.max( 0, Math.min( max, Number( raw ) ) ) ) }px`;
	}
	return mediaLength( raw );
}
