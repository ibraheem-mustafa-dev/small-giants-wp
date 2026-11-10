/**
 * Checkout delivery cards.
 *
 * With WooCommerce's block Local pickup on, the Checkout block draws a "Ship / Collect" toggle with only a title on
 * each option, then a second step that repeats the chosen rate or location. This script gives each toggle option the
 * rate's price and description (read from the Store API cart in `wc/store/cart`), folds the second step when it holds
 * a single choice (one delivery rate while Ship is chosen, one pickup location while Collect is chosen), and prints the
 * pickup address under the cards while Collect is chosen. The theme stylesheet lays the toggle out as cards and hides a
 * folded step. Without the toggle, `wp.data` or the cart store it does nothing.
 *
 * `window.sgsDeliveryCards`: { collectFrom: string, collectionLabel: string, deliveryLabel: string }; %s in `collectFrom` becomes the address, and
 * `collectionLabel` and `deliveryLabel` (when set) replace the order summary's delivery line while Collect or Ship is chosen.
 */
( function () {
	'use strict';

	var ROOT = '.wp-block-woocommerce-checkout';
	var OPTION = '.wc-block-checkout__shipping-method-option';
	var TITLE_WRAPPER = '.wc-block-checkout__shipping-method-option-title-wrapper';
	var RATE_STEP = '.wp-block-woocommerce-checkout-shipping-methods-block';
	var PICKUP_STEP = '.wp-block-woocommerce-checkout-pickup-options-block';
	var FOLDED = 'sgs-delivery-step--folded';
	var PRICE = 'sgs-delivery-card__price';
	var DESCRIPTION = 'sgs-delivery-card__description';
	var ADDRESS = 'sgs-delivery-address';
	var SUMMARY_LABEL = '.wp-block-woocommerce-checkout-order-summary-block .wc-block-components-totals-shipping .wc-block-components-totals-item__label';

	if ( ! window.wp || ! window.wp.data || typeof window.wp.data.subscribe !== 'function' ) {
		return;
	}
	var data = window.wp.data;
	var config = window.sgsDeliveryCards || {};
	var applying = false;

	function translate( text ) {
		var i18n = window.wp.i18n;
		return i18n && typeof i18n.__ === 'function' ? i18n.__( text, 'woocommerce' ) : text;
	}

	function packageRates() {
		try {
			var store = data.select( 'wc/store/cart' );
			var cart = store && typeof store.getCartData === 'function' ? store.getCartData() : null;
			var packages = cart && Array.isArray( cart.shippingRates ) ? cart.shippingRates : [];
			return packages.length && Array.isArray( packages[ 0 ].shipping_rates ) ? packages[ 0 ].shipping_rates : [];
		} catch ( e ) {
			return [];
		}
	}

	function isPickup( rate ) {
		return 'pickup_location' === rate.method_id || 'local_pickup' === rate.method_id;
	}

	function groupFor( rates, wantPickup ) {
		return rates.filter( function ( rate ) {
			return isPickup( rate ) === wantPickup;
		} );
	}

	function leading( group ) {
		for ( var i = 0; i < group.length; i++ ) {
			if ( group[ i ].selected ) {
				return group[ i ];
			}
		}
		return group[ 0 ] || null;
	}

	function grouped( digits, separator ) {
		return separator ? digits.replace( /\B(?=(\d{3})+(?!\d))/g, separator ) : digits;
	}

	function money( rate ) {
		var minor = parseInt( rate.currency_minor_unit, 10 );
		minor = isNaN( minor ) ? 2 : minor;
		var units = Number( rate.price ) / Math.pow( 10, minor );
		if ( ! isFinite( units ) ) {
			return '';
		}
		if ( 0 === units ) {
			return translate( 'Free' );
		}
		var parts = units.toFixed( minor ).split( '.' );
		var text = grouped( parts[ 0 ], rate.currency_thousand_separator );
		if ( parts[ 1 ] ) {
			text += ( rate.currency_decimal_separator || '.' ) + parts[ 1 ];
		}
		return ( rate.currency_prefix || '' ) + text + ( rate.currency_suffix || '' );
	}

	function meta( rate, key ) {
		var list = Array.isArray( rate.meta_data ) ? rate.meta_data : [];
		for ( var i = 0; i < list.length; i++ ) {
			if ( list[ i ] && list[ i ].key === key && list[ i ].value ) {
				return String( list[ i ].value );
			}
		}
		return '';
	}

	function plain( html ) {
		return String( html || '' ).replace( /<[^>]*>/g, '' ).replace( /\s+/g, ' ' ).trim();
	}

	function describe( rate, pickup ) {
		return plain( pickup ? meta( rate, 'pickup_details' ) || rate.description : rate.description );
	}

	function setPart( option, className, text, parent, tag ) {
		var node = option.querySelector( '.' + className );
		if ( ! text ) {
			if ( node ) {
				node.remove();
			}
			return;
		}
		if ( ! node ) {
			node = document.createElement( tag );
			node.className = className;
			parent.appendChild( node );
		}
		if ( node.textContent !== text ) {
			node.textContent = text;
		}
	}

	function setClass( el, name, on ) {
		if ( el && el.classList.contains( name ) !== on ) {
			el.classList.toggle( name, on );
		}
	}

	function decorate( root ) {
		var options = root.querySelectorAll( OPTION );
		if ( 2 !== options.length ) {
			return;
		}
		var rates = packageRates();
		var delivery = groupFor( rates, false );
		var pickups = groupFor( rates, true );
		var cards = [ [ options[ 0 ], leading( delivery ), false ], [ options[ 1 ], leading( pickups ), true ] ];
		cards.forEach( function ( card ) {
			var option = card[ 0 ];
			var rate = card[ 1 ];
			var wrapper = option.querySelector( TITLE_WRAPPER ) || option;
			setPart( option, PRICE, rate ? money( rate ) : '', wrapper, 'span' );
			setPart( option, DESCRIPTION, rate ? describe( rate, card[ 2 ] ) : '', option, 'span' );
		} );
		var collecting = 'true' === options[ 1 ].getAttribute( 'aria-checked' );
		setClass( root.querySelector( RATE_STEP ), FOLDED, ! collecting && 1 === delivery.length );
		setClass( root.querySelector( PICKUP_STEP ), FOLDED, collecting && 1 === pickups.length );
		var label = root.querySelector( SUMMARY_LABEL );
		var wanted = collecting ? config.collectionLabel : config.deliveryLabel;
		if ( wanted && label && label.textContent !== wanted ) {
			label.textContent = wanted;
		}
		var address = collecting && 1 === pickups.length ? meta( pickups[ 0 ], 'pickup_address' ) : '';
		var line = root.querySelector( '.' + ADDRESS );
		if ( ! address ) {
			if ( line ) {
				line.remove();
			}
			return;
		}
		var text = ( config.collectFrom || 'Collect from %s' ).replace( '%s', plain( address ) );
		if ( ! line ) {
			line = document.createElement( 'p' );
			line.className = ADDRESS;
			options[ 1 ].parentNode.parentNode.appendChild( line );
		}
		if ( line.textContent !== text ) {
			line.textContent = text;
		}
	}

	function apply() {
		var root = document.querySelector( ROOT );
		if ( ! root || applying ) {
			return;
		}
		applying = true;
		try {
			decorate( root );
		} finally {
			applying = false;
		}
	}

	data.subscribe( apply );
	apply();
	if ( 'function' === typeof window.MutationObserver ) {
		new window.MutationObserver( apply ).observe( document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [ 'aria-checked' ] } );
	}
}() );
