/**
 * Checkout order summary extras: an Edit link beside the summary heading and the product's brand under each line's
 * name. WooCommerce draws the summary in React, so the page runs this once, with the block's settings, and it
 * (re)applies both whenever the summary redraws. The brand comes from the Store API cart line's `extensions.sgs.brand`.
 *
 * It also puts `loginPrefix` in a span beside the Log in link (outside it), so only the link is clickable.
 *
 * `config`: { editLabel: string, editUrl: string, brand: boolean, loginPrefix: string }.
 */
( function ( config, root ) {
	var WRAPPER = '.wp-block-woocommerce-checkout';
	var LOGIN = '.wc-block-checkout__login-prompt';
	var TITLE = '.wp-block-woocommerce-checkout-order-summary-block .wc-block-components-checkout-order-summary__title';
	var ITEM = '.wc-block-components-order-summary-item';
	var NAME = '.wc-block-components-product-name';

	function cartItems( win ) {
		try {
			var store = win.wp.data.select( 'wc/store/cart' );
			var data = store && store.getCartData ? store.getCartData() : null;
			return data && Array.isArray( data.items ) ? data.items : EMPTY;
		} catch ( e ) {
			return EMPTY;
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
		if ( config.loginPrefix ) {
			var prompt = doc.querySelector( LOGIN );
			if ( prompt && prompt.parentNode ) {
				if ( ! doc.querySelector( '.sgs-checkout-login-prefix' ) ) {
					// After the link in the DOM: WooCommerce floats the link right, and a second right float lands to
					// its left, so the text reads before the link on screen. The link node itself is never moved.
					var prefix = doc.createElement( 'span' );
					prefix.className = 'sgs-checkout-login-prefix';
					prefix.setAttribute( 'aria-hidden', 'true' );
					prefix.textContent = config.loginPrefix;
					prompt.insertAdjacentElement( 'afterend', prefix );
				}
				// The span is hidden from assistive technology, so the link carries the whole phrase as its name
				// (the visible label stays inside it). Only the attribute is set; React keeps the node.
				var name = config.loginPrefix.trim() + ' ' + ( prompt.textContent || '' ).trim();
				if ( prompt.getAttribute( 'aria-label' ) !== name ) {
					prompt.setAttribute( 'aria-label', name );
				}
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

	var queued = false;
	var EMPTY = [];

	/** One pass per animation frame, however many changes arrive in it. */
	function schedule() {
		if ( queued ) {
			return;
		}
		queued = true;
		root.requestAnimationFrame( function () {
			queued = false;
			apply();
		} );
	}

	function start() {
		var doc = root.document;
		var observer = null;
		var unsubscribe = null;

		// Until the order summary exists the page body is watched for it; from then on only the summary is, and the
		// body watch is disconnected. A summary that React replaces sends the watch back to the body.
		function watchBody() {
			if ( observer ) {
				observer.disconnect();
			}
			observer = new root.MutationObserver( function () {
				if ( watchSummary() ) {
					schedule();
				}
			} );
			observer.observe( doc.body, { childList: true, subtree: true } );
		}

		function watchSummary() {
			var wrapper = doc.querySelector( WRAPPER );
			if ( ! wrapper ) {
				return false;
			}
			if ( observer ) {
				observer.disconnect();
			}
			observer = new root.MutationObserver( function () {
				if ( ! wrapper.isConnected ) {
					watchBody();
				}
				schedule();
			} );
			observer.observe( wrapper, { childList: true, subtree: true } );
			return true;
		}

		apply();
		if ( ! watchSummary() ) {
			watchBody();
		}
		if ( config.brand && root.wp && root.wp.data && root.wp.data.subscribe ) {
			var last = EMPTY;
			unsubscribe = root.wp.data.subscribe( function () {
				var items = cartItems( root );
				if ( items !== last ) {
					last = items;
					schedule();
				}
			} );
		}
		root.addEventListener( 'pagehide', function () {
			if ( observer ) {
				observer.disconnect();
			}
			if ( 'function' === typeof unsubscribe ) {
				unsubscribe();
			}
		} );
	}

	if ( 'loading' === root.document.readyState ) {
		root.document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
}( window.sgsCheckoutSummaryExtrasConfig, window ) );
