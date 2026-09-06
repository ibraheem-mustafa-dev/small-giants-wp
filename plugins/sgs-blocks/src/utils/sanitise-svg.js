/**
 * Editor-side SVG sanitiser.
 *
 * WHY THIS EXISTS
 * ---------------
 * Six editor sites mount operator-supplied SVG with `dangerouslySetInnerHTML`
 * while the server runs `wp_kses()` with a strict allowlist. That asymmetry is a
 * privilege escalation, not a cosmetic gap: a Contributor can store markup that
 * never reaches the front end but DOES execute in an admin's browser the moment
 * they open the post in the editor.
 *
 * This closes it by applying the SAME allowlist the server applies, generated
 * from the PHP by `scripts/generate-svg-allowlist.js` so the two cannot drift.
 *
 * ⛔ It is a WHITELIST, not a blacklist. Anything not explicitly permitted is
 * removed. Blacklists lose to encoding tricks and to whatever the author did not
 * think of; the server made the same choice, and matching it is the point.
 *
 * ⚠ This does NOT replace the server's `wp_kses()`. The editor is a second
 * enforcement point, never the only one - a client-side check is bypassable by
 * construction. The server remains the security boundary.
 */

// Extension is explicit so Node's ESM loader can resolve this directly - the
// gate at scripts/tests/test-sanitise-svg.mjs imports the REAL module rather
// than a transformed copy. webpack resolves it either way.
import { SVG_ALLOWLIST } from './svg-allowlist.generated.js';

/**
 * Attribute values that must never survive on a URL-bearing attribute.
 * `wp_kses` protocol-filters these server-side; mirrored here so the editor
 * does not paint something the front end would refuse.
 */
const DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript|data)\s*:/i;

/** Attributes treated as URLs for protocol filtering. */
const URL_ATTRS = [ 'href', 'xlink:href', 'src' ];

/**
 * Sanitise a string of SVG markup against the server's allowlist.
 *
 * @param {string} markup Raw operator-supplied SVG.
 * @return {string} Sanitised markup, safe to mount. Empty string on anything
 *                  unparseable - failing closed, because a parse error means we
 *                  cannot know what we would be mounting.
 */
export function sanitiseSvg( markup ) {
	if ( typeof markup !== 'string' || '' === markup.trim() ) {
		return '';
	}

	// No DOM (SSR, tests, a Node build step): fail CLOSED. Returning the raw
	// markup here would silently disable the sanitiser in exactly the
	// environments least able to notice.
	if ( typeof window === 'undefined' || ! window.DOMParser ) {
		return '';
	}

	let doc;
	try {
		doc = new window.DOMParser().parseFromString(
			`<div>${ markup }</div>`,
			'text/html'
		);
	} catch ( e ) {
		return '';
	}
	if ( ! doc || ! doc.body || ! doc.body.firstChild ) {
		return '';
	}

	const root = doc.body.firstChild;

	// Walk a STATIC list. Removing nodes while iterating a live collection
	// skips siblings - which would leave disallowed elements in place while
	// the function reported success.
	const all = Array.prototype.slice.call( root.querySelectorAll( '*' ) );

	all.forEach( ( el ) => {
		const tag = ( el.tagName || '' ).toLowerCase();
		const allowedAttrs = SVG_ALLOWLIST[ tag ];

		if ( ! allowedAttrs ) {
			// Not permitted. Remove the element AND its subtree - unwrapping
			// would preserve children the parent was the only reason to reject.
			el.parentNode?.removeChild( el );
			return;
		}

		Array.prototype.slice.call( el.attributes ).forEach( ( attr ) => {
			const name = attr.name.toLowerCase();

			// Event handlers are never allowed, on any element, whatever the
			// allowlist says. Belt and braces: the generated list is asserted
			// to contain none, and this holds even if that assertion regresses.
			if ( name.startsWith( 'on' ) ) {
				el.removeAttribute( attr.name );
				return;
			}

			if ( ! allowedAttrs.includes( name ) ) {
				el.removeAttribute( attr.name );
				return;
			}

			if (
				URL_ATTRS.includes( name ) &&
				DANGEROUS_PROTOCOL.test( attr.value )
			) {
				el.removeAttribute( attr.name );
			}
		} );
	} );

	return root.innerHTML;
}

export default sanitiseSvg;
