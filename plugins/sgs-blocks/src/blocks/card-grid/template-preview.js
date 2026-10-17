/**
 * Card Grid — the template card a products-mode grid holds, and how the editor previews each product with it.
 *
 * Mirrors the server (includes/class-card-grid-template.php): every product renders as the one template
 * sgs/product-card with that product's identity, and the template's own identity attributes never reach a card. The
 * template exists only in the products modes: the editor adds it there and removes it in the manual and query modes.
 */

/** The block the template is. */
export const TEMPLATE_CARD = 'sgs/product-card';

/** The block context key that hands a grid item's source mode to the card that shows it (product-card usesContext). */
export const SOURCE_MODE_CONTEXT = 'sgs/cardGridSourceMode';

/** The grid sources that render their results through the template card. */
const PRODUCT_SOURCES = [ 'wc-product', 'cpt-collection' ];

/** Template attributes that name one product or one element on the page (Card_Grid_Template::IDENTITY_ATTRS). */
const IDENTITY_ATTRS = [
	'sourceMode',
	'productId',
	'anchor',
	'lock',
	'metadata',
];

/**
 * Whether a grid source renders through the template card.
 *
 * @param {string} source The grid's `source` attribute.
 * @return {boolean} True for the products sources.
 */
export function isProductSource( source ) {
	return PRODUCT_SOURCES.includes( source );
}

/**
 * Whether the grid's own card panels (items, card styling, glyphs, hover effects, title and subtitle text) apply: only
 * where the grid prints its own cards. In the products modes the template card's own panels style every card.
 *
 * @param {string} source The grid's `source` attribute.
 * @return {boolean} True outside the products modes.
 */
export function showsManualCardPanels( source ) {
	return ! isProductSource( source );
}

/**
 * The inner-blocks template a products-mode grid seeds: one card bound to the loop's product, without the per-pack
 * price ladder (a browsing grid shows the price and its per-item note; the card's own toggle turns the ladder on).
 *
 * @param {string} source The grid's `source` attribute.
 * @return {Array} The InnerBlocks template.
 */
export function templateSeed( source ) {
	return [
		[
			TEMPLATE_CARD,
			{
				sourceMode:
					'cpt-collection' === source ? 'sgs-cpt' : 'wc-product',
				showLadder: false,
			},
		],
	];
}

/**
 * The inner blocks the grid should hold for its source, or null when it already holds them: in a products mode its one
 * template card (the existing template kept, with its design; a new one seeded when it has none), elsewhere none.
 *
 * @param {string}   source      The grid's `source` attribute.
 * @param {Array}    innerBlocks The grid's inner blocks.
 * @param {Function} create      Builds a block from a name and attributes (`@wordpress/blocks` createBlock).
 * @return {Array|null} The blocks to set, or null for no change.
 */
export function templateBlocksFor( source, innerBlocks, create ) {
	const blocks = Array.isArray( innerBlocks ) ? innerBlocks : [];
	if ( ! isProductSource( source ) ) {
		return blocks.length === 0 ? null : [];
	}
	const template = blocks.find( ( block ) => block?.name === TEMPLATE_CARD );
	if ( template && blocks.length === 1 ) {
		return null;
	}
	if ( template ) {
		return [ template ];
	}
	const [ [ name, attributes ] ] = templateSeed( source );
	return [ create( name, attributes ) ];
}

/**
 * The block context one product's card reads: the product (sgs/product-card binds to `postId` when its productId is
 * 0) and the source mode it renders with.
 *
 * @param {{id:number, postType:string, sourceMode:string}} item One grid result.
 * @return {Object} The context value.
 */
export function itemContext( item ) {
	return { postId: item.id, postType: item.postType, [ SOURCE_MODE_CONTEXT ]: item.sourceMode };
}

/**
 * The template blocks as one product's preview: the template's design, the product's source mode, no fixed product
 * (so the card binds to the context's postId), none of the template's other identity attributes, and a client id of
 * the preview's own (a block element id is unique in the canvas).
 *
 * @param {Array}                          blocks The grid's inner blocks.
 * @param {{id:number, sourceMode:string}} item   One grid result.
 * @return {Array} New block objects; the grid's own blocks are untouched.
 */
export function previewBlocks( blocks, item ) {
	return blocks.map( ( block ) => {
		if ( TEMPLATE_CARD !== block.name ) {
			return block;
		}
		const attributes = { ...block.attributes };
		IDENTITY_ATTRS.forEach( ( key ) => delete attributes[ key ] );
		return {
			...block,
			clientId: `${ block.clientId }-preview-${ item.id }`,
			attributes: {
				...attributes,
				sourceMode: item.sourceMode,
				productId: 0,
			},
		};
	} );
}
