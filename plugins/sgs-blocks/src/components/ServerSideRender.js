/**
 * ServerSideRender: the SGS drop-in for `@wordpress/server-side-render`.
 *
 * Every SGS editor preview that renders through render.php imports THIS module
 * under the name `ServerSideRender`, so call sites keep their JSX unchanged.
 * `scripts/consistency/audit-ssr-http-method.js` fails the build if any other
 * file imports the core component directly.
 *
 * It always sends the preview as a POST. Core's default GET puts every block
 * attribute in the request URL; the host edge answers a URL over 8,192 bytes
 * with 414 and, past roughly 11.5 KB of query, drops the whole HTTP/2
 * connection, which kills the editor's parallel save request too ("Updating
 * failed. Could not get a valid response from the server."). One pasted custom
 * SVG icon was enough to cross it. A POST body has no such limit.
 *
 * It also omits null values. In a query string a null became "", which passed
 * validation for string attributes; in a JSON body a null reaches the
 * block-renderer's schema check and fails every attribute not typed to accept
 * null. An omitted key is never validated and render.php falls back to the
 * attribute default, which is what a null meant.
 */

import CoreServerSideRender from '@wordpress/server-side-render';

/**
 * Deep copy of `value` with every null or undefined removed from objects and
 * arrays.
 *
 * @param {*} value Attribute value.
 * @return {*} The value without nullish members.
 */
export function omitNullish( value ) {
	if ( Array.isArray( value ) ) {
		return value.filter( ( item ) => null !== item && undefined !== item ).map( omitNullish );
	}
	if ( value && 'object' === typeof value ) {
		const out = {};
		Object.keys( value ).forEach( ( key ) => {
			if ( null !== value[ key ] && undefined !== value[ key ] ) {
				out[ key ] = omitNullish( value[ key ] );
			}
		} );
		return out;
	}
	return value;
}

/**
 * @param {Object} props            Every core ServerSideRender prop.
 * @param {Object} props.attributes Block attributes to render.
 * @return {Element} Core ServerSideRender, posting its attributes.
 */
export default function ServerSideRender( { attributes, ...props } ) {
	return (
		<CoreServerSideRender
			{ ...props }
			attributes={ attributes ? omitNullish( attributes ) : attributes }
			httpMethod="POST"
		/>
	);
}
