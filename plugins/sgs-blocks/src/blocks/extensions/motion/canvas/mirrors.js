/**
 * Block previews that mirror a block in the editor canvas (Spec 38A §11, FR-38A-8): a products-mode `sgs/card-grid`
 * draws its template `sgs/product-card` once per product, the active product as the real template block and every
 * other as a block preview (`card-grid/components/ProductTemplateCanvas.js`). A block preview runs no motion of its own,
 * so the template block's canvas motion reaches each preview card too: its scoped CSS through
 * `canvas-dom.js::canvasRootSelector( clientId, true )`, its resting markers and its Replay through `mirrorRoots`.
 *
 * @package
 */

/** The attribute a block preview carries to show the block it mirrors (`ProductTemplateCanvas.js`). */
export const MIRROR_ATTR = 'data-sgs-motion-mirror';

/**
 * The block elements that mirror a block in the canvas: inside every element carrying `data-sgs-motion-mirror` with the
 * block's client id (a block preview of the grid's template card, one per product), its first block element. A mirror
 * inside a `[hidden]` element (the active product's own preview) is left out.
 *
 * @param {string}  clientId The mirrored block's client id.
 * @param {Element} rootEl   The mirrored block's element (its document is searched).
 * @return {Element[]} The mirror roots.
 */
export function mirrorRoots( clientId, rootEl ) {
	if ( ! rootEl || typeof clientId !== 'string' || ! /^[A-Za-z0-9-]+$/.test( clientId ) ) {
		return [];
	}
	return [ ...rootEl.ownerDocument.querySelectorAll( `[${ MIRROR_ATTR }="${ clientId }"]` ) ]
		.filter( ( host ) => ! host.closest( '[hidden]' ) )
		.map( ( host ) => host.querySelector( '[data-block]' ) )
		.filter( Boolean );
}
