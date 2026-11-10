/**
 * Checkout delivery cards (assets/js/checkout-delivery-cards.js): WooCommerce's Ship / Collect toggle gains a price and a
 * description on each card, folds the rate step it duplicates and shows the one pickup address.
 * Negative control: 'folds the pickup step' fails if the single-location test is removed from the script.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const CSS = fs.readFileSync( path.join( __dirname, '../../../../theme/sgs-theme/assets/css/woocommerce.css' ), 'utf8' );

function rate( id, method, price, extra = {} ) {
	return {
		rate_id: id, method_id: method, name: id, description: '', price, selected: false,
		currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '', currency_decimal_separator: '.', currency_thousand_separator: ',',
		meta_data: [], ...extra,
	};
}

function mount( { rates, selected = 0 } ) {
	const listeners = [];
	window.wp = {
		i18n: { __: ( s ) => s },
		data: {
			subscribe: ( cb ) => { listeners.push( cb ); return () => {}; },
			select: () => ( { getCartData: () => ( { shippingRates: [ { shipping_rates: rates } ] } ) } ),
		},
	};
	document.body.innerHTML = '<div class="wp-block-woocommerce-checkout">'
		+ '<fieldset class="wp-block-woocommerce-checkout-shipping-method-block"><div class="wc-block-checkout__shipping-method-container">'
		+ '<div role="radio" aria-checked="' + ( 0 === selected ) + '" class="wc-block-checkout__shipping-method-option"><span class="wc-block-checkout__shipping-method-option-title-wrapper"><span class="wc-block-checkout__shipping-method-option-title">Ship</span></span></div>'
		+ '<div role="radio" aria-checked="' + ( 1 === selected ) + '" class="wc-block-checkout__shipping-method-option"><span class="wc-block-checkout__shipping-method-option-title-wrapper"><span class="wc-block-checkout__shipping-method-option-title">Collect</span></span></div>'
		+ '</div></fieldset>'
		+ '<fieldset class="wp-block-woocommerce-checkout-shipping-methods-block"></fieldset>'
		+ '<fieldset class="wp-block-woocommerce-checkout-pickup-options-block"></fieldset>'
		+ '<div class="wp-block-woocommerce-checkout-order-summary-block"><div class="wc-block-components-totals-shipping"><span class="wc-block-components-totals-item__label">Post it to me</span></div></div></div>';
	jest.isolateModules( () => require( '../../assets/js/checkout-delivery-cards.js' ) );
	return { notify: () => listeners.slice().forEach( ( l ) => l() ) };
}
const q = ( s ) => document.querySelector( s );
const opts = () => document.querySelectorAll( '.wc-block-checkout__shipping-method-option' );

const SHIP = rate( 'free_shipping:5', 'free_shipping', '0', { description: 'Royal Mail Tracked 48. Free over £75.' } );
const PICK = rate( 'pickup_location:0', 'pickup_location', '0', { meta_data: [
	{ key: 'pickup_details', value: "I'll fit and adjust them to you in person." },
	{ key: 'pickup_address', value: '644 Washwood Heath Rd, Birmingham, B8 2HQ' },
] } );

describe( 'checkout delivery cards', () => {
	beforeEach( () => { delete window.sgsDeliveryCards; } );

	it( 'adds Free and the description to each card', () => {
		mount( { rates: [ SHIP, PICK ] } );
		const [ ship, collect ] = opts();
		expect( ship.querySelector( '.sgs-delivery-card__price' ).textContent ).toBe( 'Free' );
		expect( ship.querySelector( '.sgs-delivery-card__description' ).textContent ).toBe( 'Royal Mail Tracked 48. Free over £75.' );
		expect( collect.querySelector( '.sgs-delivery-card__price' ).textContent ).toBe( 'Free' );
		expect( collect.querySelector( '.sgs-delivery-card__description' ).textContent ).toBe( "I'll fit and adjust them to you in person." );
	} );

	it( 'prints a priced rate with its currency and decimals', () => {
		mount( { rates: [ rate( 'flat_rate:4', 'flat_rate', '495' ), PICK ] } );
		expect( opts()[ 0 ].querySelector( '.sgs-delivery-card__price' ).textContent ).toBe( '£4.95' );
	} );

	it( 'folds the rate step on Ship with one rate, and the pickup step on Collect with one location', () => {
		mount( { rates: [ SHIP, PICK ], selected: 0 } );
		expect( q( '.wp-block-woocommerce-checkout-shipping-methods-block' ).classList.contains( 'sgs-delivery-step--folded' ) ).toBe( true );
		expect( q( '.wp-block-woocommerce-checkout-pickup-options-block' ).classList.contains( 'sgs-delivery-step--folded' ) ).toBe( false );
		mount( { rates: [ SHIP, PICK ], selected: 1 } );
		expect( q( '.wp-block-woocommerce-checkout-pickup-options-block' ).classList.contains( 'sgs-delivery-step--folded' ) ).toBe( true );
	} );

	it( 'keeps the pickup step when there are two locations', () => {
		mount( { rates: [ SHIP, PICK, { ...PICK, rate_id: 'pickup_location:1' } ], selected: 1 } );
		expect( q( '.wp-block-woocommerce-checkout-pickup-options-block' ).classList.contains( 'sgs-delivery-step--folded' ) ).toBe( false );
	} );

	it( 'shows the one pickup address under the cards while Collect is chosen', () => {
		window.sgsDeliveryCards = { collectFrom: 'Collect from %s' };
		mount( { rates: [ SHIP, PICK ], selected: 1 } );
		expect( q( '.sgs-delivery-address' ).textContent ).toBe( 'Collect from 644 Washwood Heath Rd, Birmingham, B8 2HQ' );
		mount( { rates: [ SHIP, PICK ], selected: 0 } );
		expect( q( '.sgs-delivery-address' ) ).toBeNull();
	} );

	it( 'renames the summary delivery line per chosen option, and leaves it alone when unset', () => {
		const label = () => q( '.wc-block-components-totals-item__label' ).textContent;
		window.sgsDeliveryCards = { deliveryLabel: 'Delivery', collectionLabel: 'Collection' };
		mount( { rates: [ SHIP, PICK ], selected: 0 } );
		expect( label() ).toBe( 'Delivery' );
		mount( { rates: [ SHIP, PICK ], selected: 1 } );
		expect( label() ).toBe( 'Collection' );
		window.sgsDeliveryCards = {};
		mount( { rates: [ SHIP, PICK ], selected: 0 } );
		expect( label() ).toBe( 'Post it to me' );
	} );

	it( 'does nothing without the toggle', () => {
		mount( { rates: [ SHIP ] } );
		document.body.innerHTML = '<div class="wp-block-woocommerce-checkout"></div>';
		expect( () => jest.isolateModules( () => require( '../../assets/js/checkout-delivery-cards.js' ) ) ).not.toThrow();
		expect( q( '.sgs-delivery-card__price' ) ).toBeNull();
	} );

	it( 'the theme hides a folded step', () => {
		expect( CSS ).toMatch( /\.sgs-delivery-step--folded\s*\{[^}]*display:\s*none/ );
	} );
} );
