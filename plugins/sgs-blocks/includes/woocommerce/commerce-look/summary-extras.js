/**
 * Checkout order summary extras: an Edit link beside the summary heading and the product's brand under each line's
 * name. WooCommerce draws the summary in React, so the page runs this once, with the block's settings, and it
 * (re)applies both whenever the summary redraws. The brand comes from the Store API cart line's `extensions.sgs.brand`.
 *
 * `config`: { editLabel: string, editUrl: string, brand: boolean }.
 */
( function ( config, root ) {
	var TITLE = '.wp-block-woocommerce-checkout-order-summary-block .wc-block-components-checkout-order-summary__title';
	var ITEM = '.wc-block-components-order-summary-item';
	var NAME = '.wc-block-components-product-name';

	function cartItems( win ) {
		try {
			var store = win.wp.data.select( 'wc/store/cart' );
			var data = store && store.getCartData ? store.getCartData() : null;
			return data && Array.isArray( data.items ) ? data.items : [];
		} catch ( e ) {
			return [];
		}
	}

	function brandFor( items, link ) {
		var href = link.getAttribute( 'href' ) || '';
		var text = ( link.textContent || '' ).trim();
		for ( var i = 0; i < items.length; i++ ) {
			var item = items[ i ];
			var sameUrl = href && item.permalink && item.permalink === href;
			var sameName = text && item.name && String( item.name ).trim() === text;
			if ( sameUrl || sameName ) {
				return item.extensions && item.extensions.sgs && item.extensions.sgs.brand ? String( item.extensions.sgs.brand ) : '';
			}
		}
		return '';
	}

	function apply() {
		var doc = root.document;
		if ( ! doc ) {
			return;
		}
		if ( config.editLabel && config.editUrl ) {
			var title = doc.querySelector( TITLE );
			if ( title && ! doc.querySelector( '.sgs-checkout-summary-edit' ) ) {
				var a = doc.createElement( 'a' );
				a.className = 'sgs-checkout-summary-edit';
				a.setAttribute( 'href', config.editUrl );
				a.textContent = config.editLabel;
				title.insertAdjacentElement( 'afterend', a );
			}
		}
		if ( config.brand ) {
			var items = cartItems( root );
			doc.querySelectorAll( ITEM ).forEach( function ( row ) {
				if ( row.querySelector( '.sgs-checkout-item-brand' ) ) {
					return;
				}
				var link = row.querySelector( NAME );
				var brand = link ? brandFor( items, link ) : '';
				if ( brand ) {
					var span = doc.createElement( 'span' );
					span.className = 'sgs-checkout-item-brand';
					span.textContent = brand;
					link.insertAdjacentElement( 'beforebegin', span );
				}
			} );
		}
	}

	function start() {
		apply();
		new root.MutationObserver( apply ).observe( root.document.body, { childList: true, subtree: true } );
		if ( root.wp && root.wp.data && root.wp.data.subscribe ) {
			root.wp.data.subscribe( apply );
		}
	}

	if ( 'loading' === root.document.readyState ) {
		root.document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
}( window.sgsCheckoutSummaryExtrasConfig, window ) );
