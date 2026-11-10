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
import { NAMED_COLOURS } from './named-colours.js';
import { num } from './core.js';

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
	return `var(--wp--preset--color--${ value.toLowerCase().replace( /[^a-z0-9-]/g, '' ) }, currentColor)`;
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
	if ( ! /^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#/_-]+\)$/i.test( value ) ) {
		return '';
	}
	if ( /[;{}]|url\s*\(|<|>|@|expression/i.test( value ) ) {
		return '';
	}
	return value;
}

const channel = ( token ) => {
	const t = token.trim();
	const n = t.endsWith( '%' ) ? parseFloat( t ) * 2.55 : parseFloat( t );
	return Math.max( 0, Math.min( 255, phpRound( n ) ) );
};
const alphaByte = ( token ) => {
	const t = token.trim();
	const a = t.endsWith( '%' ) ? parseFloat( t ) / 100 : parseFloat( t );
	return Math.max( 0, Math.min( 255, phpRound( a * 255 ) ) );
};
// PHP round() takes .5 away from zero; the values here are never negative.
const phpRound = ( n ) => Math.round( n );
const hex2 = ( n ) => n.toString( 16 ).toUpperCase().padStart( 2, '0' );

function hslToRgb( hue, sat, light ) {
	const h = ( ( hue % 360 ) + ( hue % 360 < 0 ? 360 : 0 ) ) / 360;
	const s = Math.max( 0, Math.min( 100, sat ) ) / 100;
	const l = Math.max( 0, Math.min( 100, light ) ) / 100;
	if ( 0 === s ) {
		const v = phpRound( l * 255 );
		return [ v, v, v ];
	}
	const q = l < 0.5 ? l * ( 1 + s ) : l + s - l * s;
	const p = 2 * l - q;
	const toRgb = ( t0 ) => {
		let t = t0;
		if ( t < 0 ) {
			t++;
		}
		if ( t > 1 ) {
			t--;
		}
		if ( t < 1 / 6 ) {
			return p + ( q - p ) * 6 * t;
		}
		if ( t < 1 / 2 ) {
			return q;
		}
		if ( t < 2 / 3 ) {
			return p + ( q - p ) * ( 2 / 3 - t ) * 6;
		}
		return p;
	};
	return [ phpRound( toRgb( h + 1 / 3 ) * 255 ), phpRound( toRgb( h ) * 255 ), phpRound( toRgb( h - 1 / 3 ) * 255 ) ];
}

/**
 * Twin of `sgs_functional_colour_to_hex()` for rgb(), rgba(), hsl() and hsla(): the colour as hex, `#RRGGBBAA` when the
 * alpha is below 1. Anything else comes back unchanged.
 *
 * @param {string} value A colour.
 * @return {string} Hex, or the value.
 */
export function functionalColourToHex( value ) {
	const v = value.trim();
	let m = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec( v );
	let rgb = null;
	if ( m ) {
		rgb = [ channel( m[ 1 ] ), channel( m[ 2 ] ), channel( m[ 3 ] ) ];
	} else {
		m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec( v );
		if ( m ) {
			rgb = hslToRgb( parseFloat( m[ 1 ] ), parseFloat( m[ 2 ] ), parseFloat( m[ 3 ] ) );
		}
	}
	if ( ! rgb ) {
		return v;
	}
	let hex = `#${ rgb.map( hex2 ).join( '' ) }`;
	if ( m[ 4 ] ) {
		const a = alphaByte( m[ 4 ] );
		if ( a < 255 ) {
			hex += hex2( a );
		}
	}
	return hex;
}

/**
 * @param {*} shape  Stored shape.
 * @param {*} colour Stored colour text.
 * @return {string} A box-shadow value, or ''. Functional colours are hex, as `sgs_colour_value()` prints them.
 */
export function mediaShadow( shape, colour ) {
	const value = composeShadow( 'string' === typeof shape ? shape : '', 'string' === typeof colour ? colour : '' );
	return value.replace( /(?:rgba?|hsla?)\([^()]*\)/gi, ( token ) => functionalColourToHex( token ) );
}

const BLENDS = [ 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter' ];

/**
 * @param {*} raw Stored value.
 * @return {string} A mix-blend-mode keyword, or ''.
 */
export function mediaBlend( raw ) {
	const value = 'string' === typeof raw ? raw.trim().toLowerCase() : '';
	return BLENDS.includes( value ) ? value : '';
}

/**
 * @param {*} colour   Stored treatment.
 * @param {*} strength Greyscale strength 0 to 100; 100 when unset.
 * @return {string} `grayscale(N%)`, `brightness(0) invert(1)`, or '' for Natural.
 */
export function mediaFilter( colour, strength ) {
	if ( 'white' === colour ) {
		return 'brightness(0) invert(1)';
	}
	if ( 'greyscale' !== colour ) {
		return '';
	}
	const n = isNumeric( strength ) ? Math.max( 0, Math.min( 100, Number( strength ) ) ) : 100;
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
	return 'string' === typeof value && /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test( value );
}

/**
 * @param {*}      raw Stored value.
 * @param {number} max Largest allowed pixel number.
 * @return {string} A length that may be a bare number of pixels (clamped 0 to max), or ''.
 */
export function mediaPx( raw, max = 500 ) {
	if ( 'number' === typeof raw || ( 'string' === typeof raw && /^\s*\d+(\.\d+)?\s*$/.test( raw ) ) ) {
		return `${ num( Math.max( 0, Math.min( max, Number( raw ) ) ) ) }px`;
	}
	return mediaLength( raw );
}
