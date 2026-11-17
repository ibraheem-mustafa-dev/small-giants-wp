/**
 * sgs/cart item row: where a text-style Remove link sits (itemRemovePlacement).
 *
 * 'under' (the default) keeps Remove in the actions row under the quantity; 'end' moves it to the right of the
 * quantity's own line. Only the text-style link moves, and only when a quantity line is shown.
 */

'use strict';

jest.mock( '@sgs/nav-store', () => ( {} ) );

const { itemRowHtml } = require( '../../src/blocks/cart/item-row-template' );

const meta = { currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '' };
const item = {
	key: 'k1',
	id: 7,
	name: 'Zookie box',
	quantity: 2,
	permalink: 'https://example.test/p/7',
	images: [],
	item_data: [],
	totals: { line_total: '2000', ...meta },
};
const row = ( opts ) => {
	const host = document.createElement( 'div' );
	host.innerHTML = itemRowHtml( item, { total_items: '2000', ...meta }, opts );
	return host;
};

describe( 'text Remove link position', () => {
	it( 'sits in the actions row under the quantity by default', () => {
		const host = row( { removeStyle: 'text', showSave: false } );
		expect( host.querySelector( '.sgs-cart__item-actions .sgs-cart__item-remove--text' ) ).not.toBeNull();
		expect( host.querySelector( '.sgs-cart__item-row .sgs-cart__item-remove--text' ) ).toBeNull();
		expect( row( { removeStyle: 'text', showSave: false, removePlace: 'under' } ).innerHTML ).toBe( host.innerHTML );
	} );

	it( 'moves to the end of the quantity line, and the empty actions row goes', () => {
		const host = row( { removeStyle: 'text', showSave: false, removePlace: 'end' } );
		expect( host.querySelector( '.sgs-cart__item-row .sgs-cart__item-remove--text' ) ).not.toBeNull();
		expect( host.querySelector( '.sgs-cart__item-actions' ) ).toBeNull();
		expect( host.querySelectorAll( '.sgs-cart__item-remove' ).length ).toBe( 1 );
		expect( host.querySelector( '.sgs-cart__item-remove--text' ).getAttribute( 'aria-label' ) ).toBe( 'Remove Zookie box from cart' );
	} );

	it( 'leaves the other actions where they were', () => {
		const host = row( { removeStyle: 'text', showSave: true, removePlace: 'end' } );
		expect( host.querySelector( '.sgs-cart__item-actions .sgs-cart__item-save-for-later' ) ).not.toBeNull();
		expect( host.querySelector( '.sgs-cart__item-actions .sgs-cart__item-remove--text' ) ).toBeNull();
	} );

	it( 'stays under the item when no quantity line is shown, and an x remove is unaffected', () => {
		const noQty = row( { removeStyle: 'text', showQty: false, showSave: false, removePlace: 'end' } );
		expect( noQty.querySelector( '.sgs-cart__item-actions .sgs-cart__item-remove--text' ) ).not.toBeNull();
		const icon = row( { removeStyle: 'icon', removePlace: 'end' } );
		expect( icon.querySelector( '.sgs-cart__item-row .sgs-cart__item-remove' ) ).toBeNull();
		expect( icon.querySelector( '.sgs-cart__item > .sgs-cart__item-remove' ) ).not.toBeNull();
	} );
} );
