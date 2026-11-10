/**
 * The one predicate for "this stored value is already a resolved CSS value": exactly one `var()`, `calc()`,
 * `min()`, `max()` or `clamp()` call. A token resolver prints such a value as it is and never wraps it in a preset
 * custom property. PHP twin: `sgs_resolved_css_value()` (includes/helpers-css-safety.php).
 *
 * A value carrying `;`, `{`, `}`, `<`, `>`, `=`, a backslash, a comment opener, `url(`, `expression(` or `@import`,
 * unbalanced parentheses or quotes, or text outside the single call, is refused.
 *
 * @package
 */

/** Matches the start of a value that is written as a CSS function call. */
export const CSS_FUNCTION_START = /^\s*(?:var|calc|min|max|clamp)\(/i;

/**
 * @param {*} value Stored value.
 * @return {string} The trimmed, safe value with whitespace runs collapsed; '' when it is not a single safe CSS function call.
 */
export function resolvedCssValue( value ) {
	if ( 'string' !== typeof value ) {
		return '';
	}
	const text = value.trim();
	if ( ! CSS_FUNCTION_START.test( text ) ) {
		return '';
	}
	if ( /[\\{}<>;=]/.test( text ) || text.includes( '/*' ) || /url\s*\(|expression\s*\(|@import/i.test( text ) ) {
		return '';
	}
	// An open quote would swallow the rest of the declaration, so single and double quotes must pair up.
	let quote = '';
	for ( const ch of text ) {
		if ( '' === quote && ( '"' === ch || "'" === ch ) ) {
			quote = ch;
		} else if ( '' !== quote && ch === quote ) {
			quote = '';
		}
	}
	if ( '' !== quote ) {
		return '';
	}
	// The first call must close at the very last character, with balanced parentheses throughout.
	let depth = 0;
	for ( let i = 0; i < text.length; i++ ) {
		const ch = text[ i ];
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
			if ( depth < 0 || ( 0 === depth && i < text.length - 1 ) ) {
				return '';
			}
		}
	}
	return 0 === depth ? text.replace( /\s+/g, ' ' ) : '';
}
