/**
 * Pay later message (sgs/pay-later-message): the Stripe Payment Method Messaging Element wrapper
 * (src/commerce-blocks/pay-later/messaging.js).
 *
 * Negative control: 'prints nothing without a key' fails if the wrapper still builds an element
 * when the publishable key is empty.
 */
import {
	buildOptions,
	cartAmount,
	createMessaging,
	stripeFor,
} from '../../src/commerce-blocks/pay-later/messaging';

const settings = { method: 'klarna' };

function stubStripe() {
	const element = { mount: jest.fn(), update: jest.fn(), destroy: jest.fn() };
	const elements = { create: jest.fn( () => element ) };
	const stripe = { elements: jest.fn( () => elements ) };
	return { stripe, elements, element };
}

describe( 'cartAmount', () => {
	it( 'reads the cart total in minor units', () => {
		expect( cartAmount( { total_price: '12345' } ) ).toBe( 12345 );
	} );
	it( 'is 0 for a missing or non-numeric total', () => {
		expect( cartAmount( undefined ) ).toBe( 0 );
		expect( cartAmount( { total_price: 'x' } ) ).toBe( 0 );
	} );
} );

describe( 'buildOptions', () => {
	it( 'asks Stripe for the chosen method with the amount, currency and country', () => {
		const options = buildOptions( settings, {
			amount: 9900,
			currency: 'gbp',
			country: 'GB',
		} );
		expect( options.amount ).toBe( 9900 );
		expect( options.currency ).toBe( 'GBP' );
		expect( options.countryCode ).toBe( 'GB' );
		expect( options.paymentMethodTypes ).toEqual( [ 'klarna' ] );
		expect( Object.keys( options ).sort() ).toEqual( [
			'amount',
			'countryCode',
			'currency',
			'paymentMethodTypes',
		] );
	} );
} );

describe( 'stripeFor', () => {
	afterEach( () => {
		delete window.Stripe;
	} );
	it( 'returns null without a key', () => {
		window.Stripe = jest.fn();
		expect( stripeFor( '' ) ).toBeNull();
		expect( window.Stripe ).not.toHaveBeenCalled();
	} );
	it( 'returns null when Stripe.js is not on the page', () => {
		expect( stripeFor( 'pk_test_1' ) ).toBeNull();
	} );
	it( 'builds one Stripe object per key', () => {
		window.Stripe = jest.fn( () => ( { id: 1 } ) );
		expect( stripeFor( 'pk_test_2' ) ).toBe( stripeFor( 'pk_test_2' ) );
		expect( window.Stripe ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'createMessaging', () => {
	const detail = { amount: 9900, currency: 'GBP', country: 'GB' };

	it( 'prints nothing without a key', () => {
		const { stripe } = stubStripe();
		const box = document.createElement( 'div' );
		const handle = createMessaging( {
			stripe: null,
			container: box,
			settings,
		} );
		handle.update( detail );
		expect( stripe.elements ).not.toHaveBeenCalled();
		expect( box.hidden ).toBe( true );
	} );

	it( 'creates and mounts the element once, then updates it', () => {
		const { stripe, elements, element } = stubStripe();
		const box = document.createElement( 'div' );
		const handle = createMessaging( { stripe, container: box, settings } );
		handle.update( detail );
		handle.update( { ...detail, amount: 15000 } );
		expect( elements.create ).toHaveBeenCalledTimes( 1 );
		expect( elements.create ).toHaveBeenCalledWith(
			'paymentMethodMessaging',
			expect.objectContaining( {
				amount: 9900,
				paymentMethodTypes: [ 'klarna' ],
			} )
		);
		expect( element.mount ).toHaveBeenCalledWith( box );
		expect( element.update ).toHaveBeenCalledWith(
			expect.objectContaining( { amount: 15000 } )
		);
		expect( box.hidden ).toBe( false );
	} );

	it( 'hides and destroys the element when the total drops to zero', () => {
		const { stripe, element } = stubStripe();
		const box = document.createElement( 'div' );
		const handle = createMessaging( { stripe, container: box, settings } );
		handle.update( detail );
		handle.update( { ...detail, amount: 0 } );
		expect( element.destroy ).toHaveBeenCalledTimes( 1 );
		expect( box.hidden ).toBe( true );
	} );

	it( 'destroy() unmounts the element', () => {
		const { stripe, element } = stubStripe();
		const box = document.createElement( 'div' );
		const handle = createMessaging( { stripe, container: box, settings } );
		handle.update( detail );
		handle.destroy();
		expect( element.destroy ).toHaveBeenCalledTimes( 1 );
	} );
} );
