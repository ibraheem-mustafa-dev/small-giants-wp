/**
 * sgs/cart item row: the per-line "finish configuring" link (itemShowAddOptions) shows only on a line whose product links
 * a choice flow (`extensions.sgs.hasChoiceFlow`, includes/cart-item-extensions.php) and that is not yet configured
 * (`extensions.sgs.hasLenses`). Before, any line with a permalink showed it, so Eye Care's "Add my prescription" sat on
 * products with no lens flow.
 */

'use strict';

jest.mock( '@sgs/nav-store', () => ( {} ) );

const { itemRowHtml } = require( '../../src/blocks/cart/item-row-template' );

const meta = { currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '' };
const line = ( sgs ) => ( {
	key: 'k1',
	id: 7,
	name: 'Frame',
	quantity: 1,
	permalink: 'https://example.test/p/7',
	images: [],
	item_data: [],
	totals: { line_total: '2000', ...meta },
	extensions: { sgs },
} );
const link = ( sgs, opts = {} ) => {
	const host = document.createElement( 'div' );
	host.innerHTML = itemRowHtml( line( sgs ), { total_items: '2000', ...meta }, { showAddOptions: true, addOptionsLabel: 'Add my prescription', ...opts } );
	return host.querySelector( '.sgs-cart__item-add-options' );
};

describe( 'add-options link', () => {
	it( 'shows on a line whose product links a choice flow and is not yet configured', () => {
		const el = link( { hasChoiceFlow: true, hasLenses: false } );
		expect( el ).not.toBeNull();
		expect( el.getAttribute( 'href' ) ).toBe( 'https://example.test/p/7' );
		expect( el.textContent ).toBe( 'Add my prescription' );
	} );

	it( 'does not show on a product with no choice flow, though it has a permalink', () => {
		expect( link( { hasChoiceFlow: false, hasLenses: false } ) ).toBeNull();
		expect( link( {} ) ).toBeNull();
	} );

	it( 'hides once the line is configured', () => {
		expect( link( { hasChoiceFlow: true, hasLenses: true } ) ).toBeNull();
	} );

	it( 'stays off when the setting is off or has no label', () => {
		expect( link( { hasChoiceFlow: true }, { showAddOptions: false } ) ).toBeNull();
		expect( link( { hasChoiceFlow: true }, { addOptionsLabel: '' } ) ).toBeNull();
	} );
} );
