/**
 * The drawer's empty state: the server-built template is copied in when the basket is empty, its button adds one product through
 * the Store API and redraws the panel with the new line, and a plain panel keeps its old empty message.
 */
'use strict';

jest.mock( '../../src/blocks/cart/store-api', () => ( {
	fetchCart: jest.fn(),
	addCartItem: jest.fn(),
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
} );
