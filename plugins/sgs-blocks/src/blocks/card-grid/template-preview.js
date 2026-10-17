/**
 * Card Grid — the template card a products-mode grid holds, and how the editor previews each product with it.
 *
 * Mirrors the server (includes/class-card-grid-template.php): every product renders as the one template
 * sgs/product-card with that product's identity, and the template's own identity attributes never reach a card.
 */

/** The block the template is. */
export const TEMPLATE_CARD = 'sgs/product-card';

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
 * The inner-blocks template a products-mode grid seeds: one card bound to the loop's product.
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
			},
		],
	];
}

/**
 * The block context one product's card reads (sgs/product-card binds to `postId` when its productId is 0).
 *
 * @param {{id:number, postType:string}} item One grid result.
 * @return {{postId:number, postType:string}} The context value.
 */
export function itemContext( item ) {
	return { postId: item.id, postType: item.postType };
}

/**
 * The card settings the grid forwards to every card under the template's own (render-delegated.php's
 * $card_forwarded), each with the server's default.
 *
 * @param {Object} settings The grid's source and card-setting attributes.
 * @return {Object} The forwarded card attributes.
 */
export function forwardedCardSettings( {
	source,
	showPickers,
	ctaBehaviour,
	showLadder,
	productShowLadder,
} ) {
	if ( 'cpt-collection' === source ) {
		return {
			showPickers: undefined === showPickers ? true : !! showPickers,
			ctaBehaviour: ctaBehaviour || 'learn-more',
			showLadder: !! showLadder,
		};
	}
	return { showLadder: !! productShowLadder };
}

/**
 * The template blocks as one product's preview: the grid-forwarded settings, the template's design over them, the
 * product's source mode, no fixed product (so the card binds to the context's postId) and none of the template's
 * other identity attributes.
 *
 * @param {Array}               blocks The grid's inner blocks.
 * @param {{sourceMode:string}} item   One grid result.
 * @param {Object}              forwarded The grid-forwarded card settings (forwardedCardSettings()).
 * @return {Array} New block objects; the grid's own blocks are untouched.
 */
export function previewBlocks( blocks, item, forwarded = {} ) {
	return blocks.map( ( block ) => {
		if ( TEMPLATE_CARD !== block.name ) {
			return block;
		}
		const attributes = { ...block.attributes };
		IDENTITY_ATTRS.forEach( ( key ) => delete attributes[ key ] );
		return {
			...block,
			attributes: {
				...forwarded,
				...attributes,
				sourceMode: item.sourceMode,
				productId: 0,
			},
		};
	} );
}
