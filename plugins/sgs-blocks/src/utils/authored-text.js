/**
 * The words of a typed rich value, for the places markup cannot go (an `aria-label`, a title, a JS string): the twin of
 * `sgs_authored_text_plain()` in includes/helpers-inline-formats.php. A line break becomes a space, tags are removed,
 * entities decoded, white space collapsed.
 *
 * The HTML is parsed into an inert document (DOMParser never runs scripts or loads images), and script and style
 * contents are dropped before the text is read, as WordPress core's strip-html does; core publishes that helper only
 * as `__unstableStripHTML`, so it is not imported.
 *
 * @param {*} value The typed value (HTML string or plain text).
 * @return {string} Plain text.
 */
export function authoredTextPlain( value ) {
	const html = String( value ?? '' ).replace( /<br\s*\/?>/gi, ' ' );
	if ( ! html.includes( '<' ) && ! html.includes( '&' ) ) {
		return html.replace( /\s+/g, ' ' ).trim();
	}
	const doc = new window.DOMParser().parseFromString( html, 'text/html' );
	doc.querySelectorAll( 'script, style, template' ).forEach( ( node ) => node.remove() );
	return ( doc.body.textContent || '' ).replace( /\s+/g, ' ' ).trim();
}
