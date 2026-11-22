/**
 * The drawer's after-rows pieces (F-62): a gift box placed after the items and the upsell row sit inside the scrolling item
 * list under the basket lines, survive every redraw of the lines as the same nodes (so a typed note and focus stay), and go
 * back out of the list before the empty state replaces it. The upsell row shows only while the basket has lines and none of
 * them is its product; its button adds the product through the same path as the empty state's button.
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

const gift = ( after ) =>
	`<div class="sgs-cart__panel-gift" data-sgs-cart-gift${ after ? ' data-sgs-cart-after-rows' : '' } hidden><input class="sgs-cart__panel-gift-checkbox" type="checkbox" /><div class="sgs-cart__panel-gift-fields" hidden><textarea class="sgs-cart__panel-gift-message"></textarea></div></div>`;
const upsell = '<div class="sgs-cart__panel-upsell" data-sgs-cart-upsell="30" data-sgs-cart-after-rows hidden><p class="sgs-cart__panel-upsell-title">Trio</p><button type="button" class="sgs-cart__panel-upsell-add" data-sgs-cart-empty-add="30">Add</button></div>';
const base = ( extra ) => `
<div data-sgs-cart-panel>
	<div class="sgs-cart__panel-status" data-sgs-cart-status></div>
	<div data-sgs-cart-items data-empty-message="Empty" data-empty-cta-label="Shop" data-shop-url="/shop"></div>
	${ extra }
	<div data-sgs-cart-footer hidden><span data-sgs-cart-subtotal></span></div>
</div>`;

const line = ( key, id, parent = 0 ) => ( { key, id, parent_id: parent, name: 'Zookies', quantity: 1, prices: {}, totals: {}, images: [], item_data: [], permalink: '/p/', quantity_limits: { minimum: 1, maximum: 9, multiple_of: 1 } } );
const cart = ( ...items ) => ( { items, totals: { total_items: '500', currency_minor_unit: 2 }, items_count: items.length } );
const items = () => document.querySelector( '[data-sgs-cart-items]' );

describe( 'after-rows pieces in the drawer', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	test( 'an after-items gift box and the upsell row sit inside the list, under the lines, in that order', async () => {
		document.body.innerHTML = base( gift( true ) + upsell );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ), line( 'k2', 6 ) ) );
		await initPanel( document.querySelector( '[data-sgs-cart-panel]' ) ).refresh();
		const kids = [ ...items().children ].map( ( el ) => el.className.split( ' ' )[ 0 ] );
		expect( kids ).toEqual( [ 'sgs-cart__item', 'sgs-cart__item', 'sgs-cart__panel-gift', 'sgs-cart__panel-upsell' ] );
		expect( items().querySelector( '.sgs-cart__panel-upsell' ).hidden ).toBe( false );
	} );

	test( 'a redraw keeps the same gift box node with its typed note and focus', async () => {
		document.body.innerHTML = base( gift( true ) );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ) ) );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		const box = items().querySelector( '.sgs-cart__panel-gift' );
		const note = box.querySelector( 'textarea' );
		note.value = 'Happy birthday';
		note.focus();
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ), line( 'k2', 6 ) ) );
		await panel.refresh();
		expect( items().querySelector( '.sgs-cart__panel-gift' ) ).toBe( box );
		expect( items().querySelectorAll( '.sgs-cart__item' ) ).toHaveLength( 2 );
		expect( items().lastElementChild ).toBe( box );
		expect( note.value ).toBe( 'Happy birthday' );
		expect( document.activeElement ).toBe( note );
	} );

	test( 'the empty basket moves the pieces back out of the list and shows its own state', async () => {
		document.body.innerHTML = base( gift( true ) + upsell );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ) ) );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		api.fetchCart.mockResolvedValue( cart() );
		await panel.refresh();
		expect( items().querySelector( '.sgs-cart__panel-gift, .sgs-cart__panel-upsell' ) ).toBeNull();
		expect( items().querySelector( '.sgs-cart__panel-empty' ) ).not.toBeNull();
		expect( items().nextElementSibling.classList.contains( 'sgs-cart__panel-gift' ) ).toBe( true );
		expect( document.querySelector( '.sgs-cart__panel-upsell' ).hidden ).toBe( true );
		// And back in under the lines once the basket fills again.
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ) ) );
		await panel.refresh();
		expect( items().lastElementChild.classList.contains( 'sgs-cart__panel-upsell' ) ).toBe( true );
	} );

	test( 'the upsell row hides while its product, or a variation of it, is in the basket', async () => {
		document.body.innerHTML = base( upsell );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 30 ) ) );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		expect( document.querySelector( '.sgs-cart__panel-upsell' ).hidden ).toBe( true );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 31, 30 ) ) );
		await panel.refresh();
		expect( document.querySelector( '.sgs-cart__panel-upsell' ).hidden ).toBe( true );
	} );

	test( 'the upsell button adds its product and redraws the basket', async () => {
		document.body.innerHTML = base( upsell );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ) ) );
		api.addCartItem.mockResolvedValue( cart( line( 'k1', 5 ), line( 'k2', 30 ) ) );
		const panel = initPanel( document.querySelector( '[data-sgs-cart-panel]' ) );
		await panel.refresh();
		items().querySelector( 'button[data-sgs-cart-empty-add="30"]' ).click();
		await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
		expect( api.addCartItem.mock.calls[ 0 ].slice( 0, 2 ) ).toEqual( [ 30, 1 ] );
		expect( items().querySelectorAll( '.sgs-cart__item' ) ).toHaveLength( 2 );
		expect( document.querySelector( '.sgs-cart__panel-upsell' ).hidden ).toBe( true );
	} );

	test( 'control: a footer gift box stays outside the list', async () => {
		document.body.innerHTML = base( gift( false ) );
		api.fetchCart.mockResolvedValue( cart( line( 'k1', 5 ) ) );
		await initPanel( document.querySelector( '[data-sgs-cart-panel]' ) ).refresh();
		expect( items().querySelector( '.sgs-cart__panel-gift' ) ).toBeNull();
		expect( items().nextElementSibling.classList.contains( 'sgs-cart__panel-gift' ) ).toBe( true );
	} );
} );
