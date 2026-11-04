/**
 * The editor canvas for the Cart and Checkout look: the CSS the server writer returns for the block's settings.
 *
 * WooCommerce draws these blocks in React in the editor, so the front-end `render_block` writer never runs there.
 * The canvas asks `GET /sgs/v1/commerce-look/css` (nonce and `edit_posts` checked by the route) with the block's
 * set attributes, 300 ms after the last change, and prints the answer. The last good CSS stays on screen when a
 * request fails. There is no second implementation of the rules in JavaScript.
 *
 * @package SGS\Blocks
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

/** Scope class the route's CSS is written against; the canvas wrapper carries it. */
export const CANVAS_SCOPE = 'sgs-commerce-look-editor';

const DEBOUNCE_MS = 300;

/**
 * The block's set `sgs*` attributes, keyed as stored.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Only the attributes that carry a value.
 */
export function setLookAttributes( attributes ) {
	const set = {};
	Object.entries( attributes || {} ).forEach( ( [ name, value ] ) => {
		const empty = '' === value || null === value || undefined === value || false === value || ( Array.isArray( value ) && 0 === value.length );
		if ( name.startsWith( 'sgs' ) && ! empty ) {
			set[ name ] = value;
		}
	} );
	return set;
}

/**
 * The server CSS for a block's current settings, debounced.
 *
 * @param {string} blockName  'woocommerce/cart' or 'woocommerce/checkout'.
 * @param {Object} attributes Block attributes.
 * @return {string} CSS text ('' until the first answer, or when nothing is set).
 */
export function useCommerceLookCss( blockName, attributes ) {
	const [ css, setCss ] = useState( '' );
	const key = JSON.stringify( setLookAttributes( attributes ) );
	const latest = useRef( 0 );

	useEffect( () => {
		if ( '{}' === key ) {
			setCss( '' );
			return undefined;
		}
		const ticket = ++latest.current;
		const timer = setTimeout( () => {
			apiFetch( { path: addQueryArgs( '/sgs/v1/commerce-look/css', { block: blockName, attributes: key } ) } )
				.then( ( res ) => {
					if ( ticket === latest.current && res && 'string' === typeof res.css ) {
						setCss( res.css );
					}
				} )
				.catch( () => {} );
		}, DEBOUNCE_MS );
		return () => clearTimeout( timer );
	}, [ blockName, key ] );

	return css;
}
