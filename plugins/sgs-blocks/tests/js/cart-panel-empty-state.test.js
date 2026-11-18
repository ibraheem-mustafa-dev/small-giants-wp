/**
 * The drawer's empty state: the server-built template is copied in when the basket is empty, its button adds one product through
 * the Store API and redraws the panel with the new line, and a plain panel keeps its old empty message.
 */
'use strict';

jest.mock( '../../src/blocks/cart/store-api', () => ( {
	fetchCart: jest.fn(),
	addCartItem: jest.fn(),
	addViaProxy: jest.fn(),
	updateCartItem: jest.fn(),
	removeCartItem: jest.fn(),
	formatMoney: jest.fn( () => '£5.00' ),
} ) );
jest.mock( '../../src/shared/wishlist-store', () => ( { addWishlistId: jest.fn() } ) );
jest.mock( '../../src/shared/cart-live', () => ( { publishCart: jest.fn() } ) );

const api = require( '../../src/blocks/cart/store-api' );
const { initPanel } = require( '../../src/blocks/cart/panel-render' );

const base = ( extra ) => `
<div data-sgs-cart-panel>
	<div class="sgs-cart__panel-status" data-sgs-cart-status></div>
	<div data-sgs-cart-items data-empty-message="Empty" data-empty-cta-label="Shop" data-shop-url="/shop"></div>
	${ extra }
	<div data-sgs-cart-footer hidden><span data-sgs-cart-subtotal></span></div>
</div>`;

const template = `<template data-sgs-cart-empty-template>
	<div class="sgs-cart__panel-empty sgs-cart__panel-empty--rich">
		<h3 class="sgs-cart__panel-empty-message">Your basket is empty</h3>
		<button type="button" class="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add" data-sgs-cart-empty-add="12">Add</button>
		<a class="sgs-cart__panel-empty-link" href="/shop">Browse</a>
	</div>
</template>`;

const cartWithOne = {
	items: [ { key: 'k1', id: 12, name: 'Trio', quantity: 1, prices: {}, totals: {}, images: [], variation: [], short_description: '', permalink: '/p/', quantity_limits: { minimum: 1, maximum: 9, multiple_of: 1 } } ],
	totals: { total_items: '500', currency_minor_unit: 2 },
	items_count: 1,
};

const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

describe( 'the drawer empty state', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	test( 'an empty basket shows the template markup: heading, button and link', async () => {
		document.body.innerHTML = base( template );
		api.fetchCart.mockResolvedValue( { items: [], totals: {} } );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		const items = document.querySelector( '[data-sgs-cart-items]' );
		expect( items.querySelector( 'h3.sgs-cart__panel-empty-message' ).textContent ).toBe( 'Your basket is empty' );
		expect( items.querySelector( 'button[data-sgs-cart-empty-add="12"]' ) ).not.toBeNull();
		expect( items.querySelector( 'a.sgs-cart__panel-empty-link' ).getAttribute( 'href' ) ).toBe( '/shop' );
		expect( document.querySelector( '[data-sgs-cart-footer]' ).hidden ).toBe( true );
	} );

	test( 'with no template the old empty message and button stay', async () => {
		document.body.innerHTML = base( '' );
		api.fetchCart.mockResolvedValue( { items: [], totals: {} } );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		const items = document.querySelector( '[data-sgs-cart-items]' );
		expect( items.querySelector( 'p.sgs-cart__panel-empty-message' ).textContent ).toBe( 'Empty' );
		expect( items.querySelector( 'a.sgs-cart__panel-empty-cta' ).textContent ).toBe( 'Shop' );
	} );

	test( 'the button adds its product once, shows the line, moves focus into the list and says so', async () => {
		document.body.innerHTML = base( template );
		api.fetchCart.mockResolvedValue( { items: [], totals: {} } );
		api.addCartItem.mockResolvedValue( cartWithOne );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		const button = document.querySelector( 'button[data-sgs-cart-empty-add]' );
		button.click();
		button.click();
		await settle();
		expect( api.addCartItem ).toHaveBeenCalledTimes( 1 );
		expect( api.addCartItem.mock.calls[ 0 ].slice( 0, 2 ) ).toEqual( [ 12, 1 ] );
		expect( document.querySelector( '.sgs-cart__item' ) ).not.toBeNull();
		expect( document.querySelector( '[data-sgs-cart-footer]' ).hidden ).toBe( false );
		expect( document.querySelector( '[data-sgs-cart-status]' ).textContent ).toBe( 'Added to your basket.' );
		expect( document.querySelector( '[data-sgs-cart-items]' ).contains( document.activeElement ) ).toBe( true );
	} );

	test( 'focus lands on the first control of the new line that can take it, not on a disabled minus button', async () => {
		document.body.innerHTML = base( template ).replace( 'data-sgs-cart-items ', 'data-sgs-cart-items data-qty-style="stepper" ' );
		api.fetchCart.mockResolvedValue( { items: [], totals: {} } );
		api.addCartItem.mockResolvedValue( cartWithOne );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		const button = document.querySelector( 'button[data-sgs-cart-empty-add]' );
		button.focus();
		button.click();
		await settle();
		const minus = document.querySelector( '.sgs-cart__item-qty-step--minus' );
		expect( minus.disabled ).toBe( true ); // quantity 1 is the minimum, so the first button in the line is off
		expect( document.activeElement ).not.toBe( document.body );
		expect( document.activeElement.disabled ).not.toBe( true );
		expect( document.querySelector( '.sgs-cart__item' ).contains( document.activeElement ) ).toBe( true );
	} );

	test( 'with nothing in the new line able to take focus, the panel itself takes it, inside the open drawer', async () => {
		jest.resetModules();
		jest.doMock( '../../src/blocks/cart/item-row-template', () => ( {
			escapeHtml: ( text ) => String( text ),
			itemRowHtml: () => '<div class="sgs-cart__item"><span>Trio</span></div>',
		} ) );
		const isolated = require( '../../src/blocks/cart/panel-render' );
		const isolatedApi = require( '../../src/blocks/cart/store-api' );
		document.body.innerHTML = '<dialog open data-sgs-cart-panel><div data-sgs-cart-status></div><div data-sgs-cart-items></div>' + template + '<div data-sgs-cart-footer hidden></div></dialog>';
		isolatedApi.fetchCart.mockResolvedValue( { items: [], totals: {} } );
		isolatedApi.addCartItem.mockResolvedValue( cartWithOne );
		const panel = isolated.initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		document.querySelector( 'button[data-sgs-cart-empty-add]' ).click();
		await settle();
		expect( document.activeElement ).toBe( document.querySelector( 'dialog' ) );
		jest.dontMock( '../../src/blocks/cart/item-row-template' );
	} );

	describe( 'removing the last line', () => {
		const twoLines = { ...cartWithOne, items: [ cartWithOne.items[ 0 ], { ...cartWithOne.items[ 0 ], key: 'k2' } ] };
		const closeButton = '<button type="button" class="sgs-cart__panel-close" data-sgs-nav-close>x</button>';

		test( 'focus moves to the empty state button, not the page', async () => {
			document.body.innerHTML = base( template + closeButton );
			api.fetchCart.mockResolvedValue( cartWithOne );
			api.removeCartItem.mockResolvedValue( { items: [], totals: {} } );
			const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
			await panel.refresh();
			const remove = document.querySelector( 'button.sgs-cart__item-remove' );
			remove.focus();
			remove.click();
			await settle();
			expect( document.querySelector( 'button[data-sgs-cart-empty-add]' ) ).not.toBeNull();
			expect( document.activeElement ).toBe( document.querySelector( 'button[data-sgs-cart-empty-add]' ) );
		} );

		test( 'with no empty state button, focus goes to the drawer close button', async () => {
			const headingOnly = '<template data-sgs-cart-empty-template><div class="sgs-cart__panel-empty"><h3>Your basket is empty</h3></div></template>';
			document.body.innerHTML = base( headingOnly + closeButton );
			api.fetchCart.mockResolvedValue( cartWithOne );
			api.removeCartItem.mockResolvedValue( { items: [], totals: {} } );
			const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
			await panel.refresh();
			const remove = document.querySelector( 'button.sgs-cart__item-remove' );
			remove.focus();
			remove.click();
			await settle();
			expect( document.activeElement ).toBe( document.querySelector( '.sgs-cart__panel-close' ) );
		} );

		test( 'removing a line while others remain moves focus to the line now in its place', async () => {
			document.body.innerHTML = base( template + closeButton );
			api.fetchCart.mockResolvedValue( twoLines );
			api.removeCartItem.mockResolvedValue( cartWithOne );
			const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
			await panel.refresh();
			const remove = document.querySelector( 'button.sgs-cart__item-remove' );
			remove.focus();
			remove.click();
			await settle();
			expect( document.activeElement ).not.toBe( document.body );
			expect( document.querySelector( '.sgs-cart__item' ).contains( document.activeElement ) ).toBe( true );
		} );

		test( 'a cart read that returns after a newer drawing is dropped', async () => {
			document.body.innerHTML = base( template + closeButton );
			api.fetchCart.mockResolvedValueOnce( twoLines );
			const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
			await panel.refresh();
			expect( document.querySelectorAll( '.sgs-cart__item' ) ).toHaveLength( 2 );

			let deliverLateRead;
			api.fetchCart.mockReturnValueOnce(
				new Promise( ( resolve ) => {
					deliverLateRead = resolve;
				} )
			);
			const lateRead = panel.refresh();
			api.removeCartItem.mockResolvedValue( cartWithOne );
			document.querySelector( 'button.sgs-cart__item-remove' ).click();
			await settle();
			expect( document.querySelectorAll( '.sgs-cart__item' ) ).toHaveLength( 1 );

			deliverLateRead( twoLines );
			await lateRead;
			expect( document.querySelectorAll( '.sgs-cart__item' ) ).toHaveLength( 1 );
		} );
	} );

	test( 'a refused add keeps the button, says why and gives focus back to it', async () => {
		document.body.innerHTML = base( template );
		api.fetchCart.mockResolvedValue( { items: [], totals: {} } );
		api.addCartItem.mockRejectedValue( new Error( 'Sold out.' ) );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		const button = document.querySelector( 'button[data-sgs-cart-empty-add]' );
		button.click();
		await settle();
		expect( document.querySelector( '[data-sgs-cart-status]' ).textContent ).toBe( 'Sold out.' );
		expect( button.disabled ).toBe( false );
		expect( document.activeElement ).toBe( button );
	} );
	test( 'a button with a body adds through the cart proxy with the nonce, then reads the cart and shows the line', async () => {
		const body = { id: 21, quantity: 1, variation: [ { attribute: 'pa_pack', value: 'pack-of-3' } ], picks: { flavour: [ { slug: 'vanilla', count: 0 } ] } };
		const withBody = template.replace( 'data-sgs-cart-empty-add="12"', `data-sgs-cart-empty-add="21" data-rest-url="/wp-json/sgs/v1/cart/add-item" data-nonce="n9" data-add-body='${ JSON.stringify( body ) }'` );
		document.body.innerHTML = base( withBody );
		api.fetchCart.mockResolvedValueOnce( { items: [], totals: {} } ).mockResolvedValueOnce( cartWithOne );
		api.addViaProxy.mockResolvedValue( { added: true } );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		document.querySelector( 'button[data-sgs-cart-empty-add]' ).click();
		await settle();
		expect( api.addViaProxy ).toHaveBeenCalledWith( '/wp-json/sgs/v1/cart/add-item', 'n9', body );
		expect( api.addCartItem ).not.toHaveBeenCalled();
		expect( document.querySelector( '.sgs-cart__item' ) ).not.toBeNull();
	} );
} );
