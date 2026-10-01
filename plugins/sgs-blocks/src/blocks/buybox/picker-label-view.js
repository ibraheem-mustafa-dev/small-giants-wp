/**
 * sgs/buybox — updates the "show the chosen value" text beside a picker
 * label (pickerShowSelectedValue) when the shopper picks a
 * different pill.
 *
 * Self-contained ES module, no @wordpress/interactivity import — mirrors
 * notify-view.js's plain-DOM pattern. sgs/product-card's own Interactivity
 * store (view.js::dispatchVariationChange) announces every resolved combo as
 * a window-level `sgs-variation-change` CustomEvent; its `detail.attributes`
 * is `{ [taxonomy]: slug }` (never a label), so this module re-resolves the
 * slug to a label using the map render.php seeded onto the wrapper as
 * `data-sgs-bb-term-labels` (JSON, `{ [taxonomy]: { [slug]: label } }`).
 * Scoped per instance via `data-sgs-bb-product`, so a page carrying several
 * buyboxes (or a buybox alongside a product-card for a DIFFERENT product)
 * never cross-updates the wrong one.
 *
 * @since 1.19.0
 */

/**
 * Handle a `sgs-variation-change` event: update every matching buybox's
 * selected-value spans.
 *
 * @param {CustomEvent} event
 */
function handleVariationChange( event ) {
	const productId = event?.detail?.productId;
	if ( ! productId ) {
		return;
	}

	const attrs = event.detail.attributes || {};

	document
		.querySelectorAll( '.wp-block-sgs-buybox[data-sgs-bb-product]' )
		.forEach( ( wrapper ) => {
			const wrapperProductId = parseInt(
				wrapper.getAttribute( 'data-sgs-bb-product' ),
				10
			);
			if ( wrapperProductId !== productId ) {
				return;
			}

			let labelMap = {};
			try {
				labelMap = JSON.parse(
					wrapper.getAttribute( 'data-sgs-bb-term-labels' ) || '{}'
				);
			} catch ( error ) {
				return;
			}

			wrapper
				.querySelectorAll( '[data-sgs-bb-axis]' )
				.forEach( ( valueEl ) => {
					const axis = valueEl.getAttribute( 'data-sgs-bb-axis' );
					const slug = attrs[ axis ];
					const label =
						slug && labelMap[ axis ]
							? labelMap[ axis ][ slug ]
							: undefined;
					if ( label !== undefined ) {
						valueEl.textContent = label;
					}
				} );
		} );
}

window.addEventListener( 'sgs-variation-change', handleVariationChange );
