/**
 * The editor twins of `includes/helpers-css-safety.php::sgs_css_length_value` and `::sgs_css_single_length_value`,
 * so a canvas preview accepts and rejects exactly what the page prints. `tests/js/icon-shapes-parity.test.js` runs
 * both sides over the same inputs and compares them.
 *
 * @package SGS\Blocks
 */

const FUNCTION_CALL = /\b(?:var|calc|min|max|minmax|clamp|repeat)\(/gi;

/**
 * Remove every var()/calc()/min()/max()/minmax()/clamp()/repeat() call with its balanced body (any nesting depth), as
 * the PHP validator's recursive pattern does. An unbalanced call is left in place for the remainder check to reject.
 *
 * @param {string} value CSS value.
 * @return {string} What is left.
 */
function consumeFunctionCalls( value ) {
	let out = '';
	let index = 0;
	FUNCTION_CALL.lastIndex = 0;
	let match;
	while ( ( match = FUNCTION_CALL.exec( value ) ) !== null ) {
		if ( match.index < index ) {
			continue;
		}
		let depth = 0;
		let close = -1;
		for ( let i = match.index + match[ 0 ].length - 1; i < value.length; i++ ) {
			if ( '(' === value[ i ] ) {
				depth++;
			} else if ( ')' === value[ i ] ) {
				depth--;
				if ( 0 === depth ) {
					close = i;
					break;
				}
			}
		}
		if ( -1 === close ) {
			continue;
		}
		out += value.slice( index, match.index );
		index = close + 1;
		FUNCTION_CALL.lastIndex = index;
	}
	return out + value.slice( index );
}

/**
 * A length-shaped CSS value safe to print, or ''. Twin: sgs_css_length_value(). Digits are px, or a spacing preset
 * when the theme registers that slug; breakout characters, url()/expression()/@import and unbalanced calls are
 * rejected; anything else passes trimmed with whitespace runs collapsed (lists and keywords included).
 *
 * @param {*}        raw         Stored value.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {string} CSS value.
 */
export function cssLengthValue( raw, presetSlugs = [] ) {
	const value = null === raw || undefined === raw ? '' : String( raw );
	if ( '' === value ) {
		return '';
	}
	if ( /^\d+$/.test( value ) ) {
		return presetSlugs.includes( value ) ? `var(--wp--preset--spacing--${ value })` : `${ value }px`;
	}
	if ( /url\s*\(|expression\s*\(|@import/i.test( value ) ) {
		return '';
	}
	if ( /[\\{}<>;=]/.test( value ) || value.includes( '/*' ) ) {
		return '';
	}
	const consumed = consumeFunctionCalls( value );
	if ( /[\\&=}{;<>()]/.test( consumed ) || consumed.includes( '/*' ) ) {
		return '';
	}
	return value.replace( /\s+/g, ' ' ).trim();
}

/**
 * ONE CSS length (safe inside calc(), max() or blur()), or ''. Twin: sgs_css_single_length_value(): a number with one
 * unit or a single var()/calc()/min()/max()/minmax()/clamp() call; lists, keywords and two calls side by side give ''.
 *
 * @param {*}        raw         Stored value.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {string} CSS length.
 */
export function cssSingleLengthValue( raw, presetSlugs = [] ) {
	const value = cssLengthValue( 'string' === typeof raw ? raw : '', presetSlugs );
	if ( '' === value ) {
		return '';
	}
	if ( /^\d+(\.\d+)?[a-z%]+$/i.test( value ) ) {
		return value;
	}
	if ( ! /^(var|calc|min|max|minmax|clamp)\(/i.test( value ) || ! value.endsWith( ')' ) ) {
		return '';
	}
	let depth = 0;
	for ( let i = value.indexOf( '(' ); i < value.length; i++ ) {
		if ( '(' === value[ i ] ) {
			depth++;
		} else if ( ')' === value[ i ] ) {
			depth--;
			if ( 0 === depth ) {
				return value.length - 1 === i ? value : '';
			}
		}
	}
	return '';
}

/**
 * A CSS value split on top-level spaces (`calc(1px + 1px) 0` gives two tokens). Twin: sgs_icon_css_value_tokens().
 *
 * @param {string} value CSS value.
 * @return {string[]} Tokens.
 */
export function cssValueTokens( value ) {
	const tokens = [];
	let current = '';
	let depth = 0;
	for ( const char of String( value ) ) {
		if ( '(' === char ) {
			depth++;
		} else if ( ')' === char ) {
			depth--;
		}
		if ( ' ' === char && 0 === depth ) {
			if ( current ) {
				tokens.push( current );
			}
			current = '';
			continue;
		}
		current += char;
	}
	if ( current ) {
		tokens.push( current );
	}
	return tokens;
}
