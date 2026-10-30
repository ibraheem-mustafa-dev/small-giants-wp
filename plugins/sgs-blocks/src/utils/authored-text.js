/**
 * The words of a typed rich value, for the places markup cannot go (an `aria-label`, a title, a JS string): the twin of
 * `sgs_authored_text_plain()` in includes/helpers-inline-formats.php. A line break becomes a space, tags are removed,
 * entities decoded, white space collapsed.
 *
 * @param {*} value The typed value (HTML string or plain text).
 * @return {string} Plain text.
 */
import { stripHTML } from '@wordpress/dom';

export function authoredTextPlain( value ) {
	const html = String( value ?? '' ).replace( /<br\s*\/?>/gi, ' ' );
	return stripHTML( html ).replace( /\s+/g, ' ' ).trim();
}
