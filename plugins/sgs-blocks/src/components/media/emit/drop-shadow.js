/**
 * A composed `box-shadow` value as a `filter` value, one `drop-shadow()` per layer. Twin of
 * `includes/helpers-shadow-filter.php::sgs_shadow_value_to_drop_shadow()`. A theme preset reference
 * (`var(--wp--preset--shadow--x)`) draws nothing here: the theme's preset list is read on the server only.
 *
 * @package SGS\Blocks
 */

import { formatLength, parseLayer, splitTop } from '../../../utils/shadow-layers.js';

/**
 * @param {string} composed Value from `composeShadow()`.
 * @return {string} Filter value, or '' when there is nothing a filter can draw.
 */
export function dropShadow( composed ) {
	const text = composed.trim();
	if ( '' === text || 'none' === text || /^var\(--wp--preset--shadow--[a-z0-9-]+\)$/.test( text ) ) {
		return '';
	}
	const filters = [];
	for ( const layer of splitTop( text, ',' ) ) {
		const fields = parseLayer( layer );
		if ( ! fields || fields.inset || null === fields.colour ) {
			continue;
		}
		filters.push( `drop-shadow(${ formatLength( fields.x ) } ${ formatLength( fields.y ) } ${ formatLength( fields.blur ) } ${ fields.colour })` );
	}
	return filters.join( ' ' );
}

/**
 * @return {string} The nested forced-colours rule a shadow's declaration list carries. Twin: `sgs_shadow_forced_colours_decl()`.
 */
export function shadowForcedColoursDecl() {
	return '@media (forced-colors:active){&:not(:focus-visible){outline:1px solid CanvasText;outline-offset:-1px}}';
}
