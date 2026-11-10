/**
 * Checkout "Loading payment options" state.
 *
 * WooCommerce's Checkout block shows "There are no payment methods available" as soon as its payment store is
 * initialised with no method, while an express method (Stripe) is still working out whether it can pay. This script
 * marks the checkout root with `sgs-payment-loading` and draws a polite status line while the cart needs payment, no
 * method is available and under LIMIT_MS have passed; the theme stylesheet hides the notice under that class. After
 * the limit WooCommerce's own notice shows, so a genuine no-methods case is never hidden. Without `wp.data` or the
 * stores it does nothing.
 */
( function () {
	'use strict';

	var LIMIT_MS = 20000;
	var ROOT = '.wp-block-woocommerce-checkout';
	var PAYMENT = '.wp-block-woocommerce-checkout-payment-block';
	var CLASS_NAME = 'sgs-payment-loading';
	var STATUS_CLASS = 'sgs-payment-loading__status';

	if ( ! window.wp || ! window.wp.data || typeof window.wp.data.subscribe !== 'function' ) {
		return;
	}
	var data = window.wp.data;
	var text = ( window.sgsPaymentLoading && window.sgsPaymentLoading.text ) || 'Loading payment options…';
	var started = null;
	var timer = 0;
	var expired = false;

	function read() {
		try {
			var payment = data.select( 'wc/store/payment' );
			var cart = data.select( 'wc/store/cart' );
			if ( ! payment || ! cart || typeof payment.getAvailablePaymentMethods !== 'function' || typeof cart.getCartData !== 'function' ) {
				return null;
			}
			var methods = payment.getAvailablePaymentMethods();
			var cartData = cart.getCartData() || {};
			return { needsPayment: !! cartData.needsPayment, hasMethod: !! methods && Object.keys( methods ).length > 0 };
		} catch ( e ) {
			return null;
		}
	}

	function setState( on ) {
		var root = document.querySelector( ROOT );
		if ( ! root ) {
			return;
		}
		root.classList.toggle( CLASS_NAME, on );
		var payment = root.querySelector( PAYMENT );
		var status = root.querySelector( '.' + STATUS_CLASS );
		if ( on && payment && ! status ) {
			status = document.createElement( 'p' );
			status.className = STATUS_CLASS;
			status.setAttribute( 'role', 'status' );
			status.textContent = text;
			payment.insertBefore( status, payment.firstChild );
		} else if ( ! on && status ) {
			status.remove();
		}
	}

	function evaluate() {
		var state = read();
		if ( ! state ) {
			return;
		}
		if ( ! document.querySelector( ROOT ) ) {
			return;
		}
		if ( null === started ) {
			started = Date.now();
			timer = window.setTimeout( function () {
				expired = true;
				evaluate();
			}, LIMIT_MS );
		}
		var loading = state.needsPayment && ! state.hasMethod && ! expired && Date.now() - started < LIMIT_MS;
		setState( loading );
		if ( state.hasMethod || expired ) {
			window.clearTimeout( timer );
			unsubscribe();
		}
	}

	var unsubscribe = data.subscribe( evaluate );
	evaluate();
}() );
