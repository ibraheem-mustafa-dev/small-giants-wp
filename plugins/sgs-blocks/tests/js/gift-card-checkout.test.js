/**
 * @jest-environment jsdom
 *
 * Gift card panel on the Cart and Checkout blocks (Spec 27, FR-27-GC5): it renders WooCommerce's collapsible coupon
 * panel markup, collapsed behind a real toggle, open while a card is applied or an error shows.
 */
import fs from 'fs';
import path from 'path';
import * as element from '@wordpress/element';
import * as i18n from '@wordpress/i18n';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

global.IS_REACT_ACT_ENVIRONMENT = true;

const source = fs.readFileSync(
	path.join( __dirname, '../../assets/js/gift-card-checkout.js' ),
	'utf8'
);
let render;
let update;

function load() {
	update = jest.fn( () => Promise.resolve() );
	window.wp = {
		element,
		i18n,
		plugins: {
			registerPlugin: ( name, def ) => {
				render = def.render;
			},
		},
	};
	window.wc = {
		blocksCheckout: {
			ExperimentalDiscountsMeta: ( { children } ) => children,
			extensionCartUpdate: update,
		},
	};
	// The script is a plain IIFE, so it runs against the one React copy this test imports.
	// eslint-disable-next-line no-new-func
	new Function( source )();
}

async function mount( extensions ) {
	const host = document.createElement( 'div' );
	document.body.appendChild( host );
	const root = createRoot( host );
	// The Fill passes its slot props to the child; the test does the same.
	const child = render().props.children;
	await act( async () => {
		root.render( { ...child, props: { extensions } } );
	} );
	return host;
}

const data = ( over ) => ( {
	sgs_gift_card: {
		cards: [],
		canApply: true,
		blocked: false,
		terms: '',
		...over,
	},
} );

beforeEach( () => {
	document.body.innerHTML = '';
	load();
} );

test( 'is collapsed by default behind a button with aria-expanded and aria-controls', async () => {
	const host = await mount( data() );
	const root = host.querySelector( '.sgs-gift-card-panel' );
	expect(
		root.classList.contains( 'wc-block-components-totals-coupon' )
	).toBe( true );
	expect( root.classList.contains( 'wc-block-components-panel' ) ).toBe(
		true
	);
	const toggle = host.querySelector(
		'button.wc-block-components-panel__button'
	);
	expect( toggle.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
	const content = document.getElementById(
		toggle.getAttribute( 'aria-controls' )
	);
	expect( content.hidden ).toBe( true );
	expect( toggle.textContent ).toBe( 'Add a gift card' );
	expect( host.querySelector( '[style]' ) ).toBeNull();
} );

test( 'opens to the coupon form structure', async () => {
	const host = await mount( data() );
	const toggle = host.querySelector( '.wc-block-components-panel__button' );
	await act( async () => toggle.click() );
	expect( toggle.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
	expect(
		host.querySelector( '.wc-block-components-panel__content' ).hidden
	).toBe( false );
	const form = host.querySelector(
		'form.wc-block-components-totals-coupon__form'
	);
	const field = form.querySelector(
		'.wc-block-components-text-input.wc-block-components-totals-coupon__input'
	);
	const input = field.querySelector( 'input' );
	expect( field.querySelector( 'label' ).getAttribute( 'for' ) ).toBe(
		input.id
	);
	expect(
		form.querySelector(
			'button.wc-block-components-totals-coupon__button.wc-block-components-button'
		).disabled
	).toBe( true );
} );

test( 'stays open with an applied card, which has a remove button', async () => {
	const host = await mount(
		data( {
			cards: [
				{ id: 7, last4: 'AB12', applied: '5.00', remaining: '10.00' },
			],
		} )
	);
	expect(
		host
			.querySelector( '.wc-block-components-panel__button' )
			.getAttribute( 'aria-expanded' )
	).toBe( 'true' );
	expect(
		host.querySelector( '.wc-block-components-chip' ).textContent
	).toContain( 'AB12' );
	await act( async () =>
		host.querySelector( '.wc-block-components-chip__remove' ).click()
	);
	expect( update ).toHaveBeenCalledWith( {
		namespace: 'sgs_gift_card',
		data: { action: 'remove', card_id: 7 },
	} );
} );

test( 'announces a rejected code and stays open', async () => {
	const host = await mount( data() );
	await act( async () =>
		host.querySelector( '.wc-block-components-panel__button' ).click()
	);
	update.mockImplementation( () => Promise.reject( { message: 'Bad code' } ) );
	const input = host.querySelector( 'input' );
	const setter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		'value'
	).set;
	await act( async () => {
		setter.call( input, 'XYZ' );
		input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
	} );
	await act( async () => {
		host.querySelector( 'form' ).dispatchEvent(
			new Event( 'submit', { bubbles: true, cancelable: true } )
		);
	} );
	expect( update ).toHaveBeenCalledWith( {
		namespace: 'sgs_gift_card',
		data: { action: 'apply', code: 'XYZ' },
	} );
	const alert = host.querySelector( '[role="alert"]' );
	expect( alert.textContent ).toBe( 'Bad code' );
	expect( host.querySelector( 'input' ).getAttribute( 'aria-describedby' ) ).toBe(
		alert.id
	);
	expect(
		host
			.querySelector( '.wc-block-components-panel__button' )
			.getAttribute( 'aria-expanded' )
	).toBe( 'true' );
} );

test( 'renders nothing when a gift card is in the basket', async () => {
	const host = await mount( data( { blocked: true } ) );
	expect( host.querySelector( '.sgs-gift-card-panel' ) ).toBeNull();
} );

test( 'after Apply returns, keyboard focus is on the code field, not lost to the page', async () => {
	const host = await mount( data() );
	await act( async () =>
		host.querySelector( '.wc-block-components-panel__button' ).click()
	);
	const input = host.querySelector( 'input' );
	const setter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		'value'
	).set;
	await act( async () => {
		setter.call( input, 'ABCD' );
		input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
	} );
	host.querySelector( 'button[type="submit"]' ).focus();
	await act( async () => {
		host.querySelector( 'form' ).dispatchEvent(
			new Event( 'submit', { bubbles: true, cancelable: true } )
		);
	} );
	expect( update ).toHaveBeenCalledTimes( 1 );
	expect( document.activeElement ).toBe( host.querySelector( 'input' ) );
} );
