/**
 * Basket Stripe hold (Spec 27 FR-27-BASKET-STRIPE-HOLD). `includes/woocommerce/basket-stripe-hold.php` prints this file
 * inline at the top of the basket page's <head> (without this comment) when the site's switch is on.
 *
 * WooCommerce's basket block will not start until every payment method's script has run, so the payment plugin's own
 * scripts cannot be held. What costs the time is the script those plugins inject next: Stripe.js from js.stripe.com,
 * which pulls in Stripe's fraud check, hCaptcha and the wallet frames (about 93 requests and seconds of phone CPU on an
 * empty basket). This holds only that: a <script> added to the page with appendChild or insertBefore whose source is on
 * js.stripe.com is kept aside until the shopper's first scroll, pointer press, key press or touch, then added in the
 * order it arrived, where it was meant to go. The loader that added it waits for its load event as it always does, so
 * the basket renders at once and the wallet buttons appear once Stripe has loaded. Every other node is added at once.
 *
 * @param {Window}   w The window.
 * @param {Document} d The document.
 */
( ( w, d ) => {
	const proto = w.Node && w.Node.prototype;
	if ( ! proto || ! w.URL ) {
		return;
	}
	const HOST = 'js.stripe.com';
	const TRIGGERS = [ 'scroll', 'pointerdown', 'keydown', 'touchstart' ];
	const append = proto.appendChild;
	const insert = proto.insertBefore;
	const held = [];
	let released = false;

	const isStripe = ( node ) => {
		if ( ! node || 'SCRIPT' !== node.nodeName || ! node.src ) {
			return false;
		}
		try {
			return HOST === new w.URL( node.src, d.baseURI ).host;
		} catch ( e ) {
			return false;
		}
	};

	const release = () => {
		if ( released ) {
			return;
		}
		released = true;
		proto.appendChild = append;
		proto.insertBefore = insert;
		TRIGGERS.forEach( ( name ) =>
			w.removeEventListener( name, release, true )
		);
		held.splice( 0 ).forEach( ( [ parent, node, ref ] ) => {
			if ( ref && ref.parentNode === parent ) {
				insert.call( parent, node, ref );
			} else {
				append.call( parent, node );
			}
		} );
	};

	proto.appendChild = function ( node ) {
		if ( ! released && isStripe( node ) ) {
			held.push( [ this, node, null ] );
			return node;
		}
		return append.call( this, node );
	};
	proto.insertBefore = function ( node, ref ) {
		if ( ! released && isStripe( node ) ) {
			held.push( [ this, node, ref ] );
			return node;
		}
		return insert.call( this, node, ref );
	};
	TRIGGERS.forEach( ( name ) =>
		w.addEventListener( name, release, { capture: true, passive: true } )
	);
} )( window, document );
