/**
 * Pay later message component (src/commerce-blocks/pay-later/component.js) as WooCommerce's checkout mounts it:
 * the key comes from wc.wcSettings.getSetting( 'stripe_data' ) (there is no window.wcSettings there), the total from
 * the cart store, and the Stripe messaging element is created with the block's own settings.
 *
 * Negative control: 'reads the key from wc.wcSettings' fails if the component only looks at window.wcSettings.
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSelect } from '@wordpress/data';
import PayLaterMessage from '../../src/commerce-blocks/pay-later/component';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let keyCount = 0;

// A fresh key each time: the module keeps one Stripe object per key.
function setup( { total = '9900', key = `pk_test_wc_${ ++keyCount }` } = {} ) {
	const element = { mount: jest.fn(), update: jest.fn(), destroy: jest.fn() };
	const elements = { create: jest.fn( () => element ) };
	window.Stripe = jest.fn( () => ( { elements: () => elements } ) );
	window.wc = {
		wcSettings: {
			getSetting: jest.fn( ( name ) => ( name === 'stripe_data' ? { key } : undefined ) ),
		},
	};
	delete window.wcSettings;
	useSelect.mockImplementation( ( fn ) =>
		fn( () => ( {
			getCartTotals: () => ( { total_price: total, currency_code: 'GBP' } ),
			getCustomerData: () => ( { shippingAddress: { country: 'GB' } } ),
		} ) )
	);
	return { element, elements };
}

async function render( props ) {
	const host = document.createElement( 'div' );
	document.body.appendChild( host );
	const root = createRoot( host );
	await act( async () => {
		root.render( <PayLaterMessage { ...props } /> );
	} );
	return { host, root };
}

afterEach( () => {
	document.body.innerHTML = '';
	delete window.Stripe;
	delete window.wc;
} );

it( 'reads the key from wc.wcSettings and mounts the Klarna element with only the options the messaging element accepts', async () => {
	const { element, elements } = setup();
	const config = JSON.stringify( { method: 'klarna', country: 'GB' } );
	const { host } = await render( { config } );
	expect( window.Stripe ).toHaveBeenCalledWith( expect.stringMatching( /^pk_test_wc_/ ) );
	expect( elements.create ).toHaveBeenCalledWith(
		'paymentMethodMessaging',
		expect.objectContaining( {
			amount: 9900,
			currency: 'GBP',
			countryCode: 'GB',
			paymentMethodTypes: [ 'klarna' ],
		} )
	);
	expect( Object.keys( elements.create.mock.calls[ 0 ][ 1 ] ).sort() ).toEqual( [
		'amount',
		'countryCode',
		'currency',
		'paymentMethodTypes',
	] );
	expect( element.mount ).toHaveBeenCalledWith( host.querySelector( '.sgs-pay-later__mount' ) );
	expect( host.querySelector( '.sgs-pay-later__mount' ).hidden ).toBe( false );
} );

it( 'still mounts with the defaults when the block hands over no settings', async () => {
	const { elements } = setup();
	await render( {} );
	expect( elements.create ).toHaveBeenCalledWith(
		'paymentMethodMessaging',
		expect.objectContaining( { paymentMethodTypes: [ 'klarna' ] } )
	);
} );

it( 'stays hidden with no Stripe key', async () => {
	const { elements } = setup( { key: '' } );
	const { host } = await render( {} );
	expect( elements.create ).not.toHaveBeenCalled();
	expect( host.querySelector( '.sgs-pay-later__mount' ).hidden ).toBe( true );
} );
