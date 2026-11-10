/**
 * Checkout payment loading state (assets/js/checkout-payment-loading.js).
 * Negative control: 'class off after 20s' fails if the limit is removed.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const CSS = fs.readFileSync( path.join( __dirname, '../../../../theme/sgs-theme/assets/css/woocommerce.css' ), 'utf8' );

function stub( state ) {
	const listeners = [];
	window.wp = {
		data: {
			subscribe: ( cb ) => { listeners.push( cb ); return () => listeners.splice( listeners.indexOf( cb ), 1 ); },
			select: ( s ) => s === 'wc/store/payment'
				? { getAvailablePaymentMethods: () => state.methods }
				: { getCartData: () => ( { needsPayment: state.needsPayment } ) },
		},
	};
	return { notify: () => listeners.slice().forEach( ( l ) => l() ) };
}
function load() {
	jest.isolateModules( () => require( '../../assets/js/checkout-payment-loading.js' ) );
}
const root = () => document.querySelector( '.wp-block-woocommerce-checkout' );

describe( 'checkout payment loading', () => {
	beforeEach( () => {
		jest.useFakeTimers();
		document.body.innerHTML = '<div class="wp-block-woocommerce-checkout"><div class="wp-block-woocommerce-checkout-payment-block"></div></div>';
		delete window.sgsPaymentLoading;
	} );
	afterEach( () => jest.useRealTimers() );

	it( 'class and status line on while the methods are empty', () => {
		window.sgsPaymentLoading = { text: 'Loading payment options…' };
		const state = { methods: {}, needsPayment: true };
		stub( state );
		load();
		expect( root().classList.contains( 'sgs-payment-loading' ) ).toBe( true );
		const s = document.querySelector( '[role="status"]' );
		expect( s.textContent ).toBe( 'Loading payment options…' );
	} );

	it( 'off the moment a method arrives', () => {
		const state = { methods: {}, needsPayment: true };
		const h = stub( state );
		load();
		state.methods = { card: {} };
		h.notify();
		expect( root().classList.contains( 'sgs-payment-loading' ) ).toBe( false );
		expect( document.querySelector( '[role="status"]' ) ).toBeNull();
	} );

	it( 'off after 20s', () => {
		stub( { methods: {}, needsPayment: true } );
		load();
		jest.advanceTimersByTime( 19000 );
		expect( root().classList.contains( 'sgs-payment-loading' ) ).toBe( true );
		jest.advanceTimersByTime( 1500 );
		expect( root().classList.contains( 'sgs-payment-loading' ) ).toBe( false );
	} );

	it( 'off when the cart needs no payment', () => {
		stub( { methods: {}, needsPayment: false } );
		load();
		expect( root().classList.contains( 'sgs-payment-loading' ) ).toBe( false );
	} );

	it( 'does not throw without wp.data', () => {
		delete window.wp;
		expect( load ).not.toThrow();
		window.wp = { data: { subscribe: () => () => {}, select: () => { throw new Error( 'no store' ); } } };
		expect( load ).not.toThrow();
	} );

	it( 'the notice is hidden only under the loading class', () => {
		const rules = CSS.match( /[^{}]*no-payment-methods-notice[^{}]*\{[^}]*\}/g ) || [];
		expect( rules.length ).toBeGreaterThan( 0 );
		rules.forEach( ( r ) => expect( r ).toContain( '.sgs-payment-loading' ) );
	} );
} );
