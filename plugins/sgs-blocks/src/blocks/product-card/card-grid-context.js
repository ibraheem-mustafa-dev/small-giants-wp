/**
 * Product Card — a card inside an sgs/card-grid is the grid's template: the grid decides which product each card shows.
 *
 * - The card's "Connected product" panel is not offered there (`showsConnectedProduct`).
 * - In the editor canvas each grid item hands its card the product's own source mode through block context
 *   (`card-grid/template-preview.js::itemContext`), so the editable card shows a WooCommerce product as one and an SGS
 *   product post as one, as the page does (`render-delegated.php` resolves the mode per item). The template's stored
 *   source mode is never written (`effectiveSourceMode`).
 */

import { SOURCE_MODE_CONTEXT } from '../card-grid/template-preview';

/** The source modes a grid item can hand its card. */
const ITEM_SOURCE_MODES = [ 'wc-product', 'sgs-cpt' ];

/**
 * The source mode the card renders with: the grid item's, when the card shows one, else its own.
 *
 * @param {Object}           attributes The card's attributes.
 * @param {Object|undefined} context    The card's block context.
 * @return {string} The source mode.
 */
export function effectiveSourceMode( attributes, context ) {
	const fromGrid = context?.[ SOURCE_MODE_CONTEXT ];
	return ITEM_SOURCE_MODES.includes( fromGrid ) ? fromGrid : attributes?.sourceMode;
}

/**
 * Whether the card offers its "Connected product" panel: only outside a card grid.
 *
 * @param {string[]} gridParents The client ids of the card-grid blocks the card sits in.
 * @return {boolean} True outside a grid.
 */
export function showsConnectedProduct( gridParents ) {
	return ! Array.isArray( gridParents ) || gridParents.length === 0;
}
