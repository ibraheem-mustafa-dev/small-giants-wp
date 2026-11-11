/**
 * The editor canvas for the Cart and Checkout look: the CSS the server writer returns for the block's settings.
 *
 * WooCommerce draws these blocks in React in the editor, so the front-end `render_block` writer never runs there.
 * The canvas asks `POST /sgs/v1/commerce-look/css` (nonce and `edit_posts` checked by the route) with the block's
 * set attributes in the request body, 300 ms after the last change, and prints the answer. An answer that arrives
 * after a newer change, or after every setting was cleared, is dropped. The last good CSS stays on screen when a
 * request fails, and the failure is written to the editor console. There is no second implementation of the rules in
 * JavaScript.
 *
 * @package SGS\Blocks
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

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
		// Every change takes a new ticket, the clearing change included, so no request already in flight can answer for it.
		const ticket = ++latest.current;
		if ( '{}' === key ) {
			setCss( '' );
			return undefined;
		}
		const timer = setTimeout( () => {
			apiFetch( { path: '/sgs/v1/commerce-look/css', method: 'POST', data: { block: blockName, attributes: key } } )
				.then( ( res ) => {
					if ( ticket === latest.current && res && 'string' === typeof res.css ) {
						setCss( res.css );
					}
				} )
				.catch( ( error ) => {
					// eslint-disable-next-line no-console
					console.warn( 'SGS commerce-look: the editor canvas CSS request failed; the last good CSS stays.', error && ( error.code || error.message ) );
				} );
		}, DEBOUNCE_MS );
		return () => clearTimeout( timer );
	}, [ blockName, key ] );

	return css;
}
