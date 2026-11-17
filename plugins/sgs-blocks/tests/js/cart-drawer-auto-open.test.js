/**
 * sgs/cart drawer: opening on add is opt-in (data-auto-open-drawer). Without it an add event only refreshes the badge.
 */

'use strict';

jest.mock( '@sgs/nav-store', () => ( {} ) );
jest.mock( '../../src/shared/wishlist-store', () => ( { addWishlistId: jest.fn() } ) );

const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
	}
};
const meta = { currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '' };

const load = async ( extra ) => {
	document.body.innerHTML = `
<div class="wp-block-sgs-cart sgs-cart" data-display-mode="drawer" data-auto-open-on-add="1" ${ extra } data-show-zero-any="true" data-count-pop="off">
	<button data-sgs-cart-trigger aria-label="View your cart"><span data-sgs-cart-count>0</span></button>
	<dialog data-sgs-cart-panel data-sgs-cart-mode="drawer"><div data-sgs-cart-items></div><div data-sgs-cart-footer></div></dialog>
</div>`;
	const trigger = document.querySelector( '[data-sgs-cart-trigger]' );
	const clicks = jest.fn();
	trigger.addEventListener( 'click', clicks );
	jest.isolateModules( () => {
		require( '../../src/blocks/cart/view.js' );
	} );
	await flush();
	clicks.mockClear();
	document.dispatchEvent( new Event( 'wc-blocks_added_to_cart' ) );
	await flush();
	return clicks;
};

beforeEach( () => {
	delete window.sgsCartLive;
	delete window.wp;
	global.fetch = jest.fn( () =>
		Promise.resolve( {
			ok: true,
			headers: { get: () => 'n' },
			json: () => Promise.resolve( { items: [], items_count: 1, totals: { total_items: '0', total_price: '0', ...meta } } ),
		} )
	);
} );

describe( 'drawer open on add', () => {
	it( 'stays closed by default', async () => {
		expect( ( await load( '' ) ).mock.calls.length ).toBe( 0 );
	} );
	it( 'opens through the trigger when the block opted in', async () => {
		expect( ( await load( 'data-auto-open-drawer="1"' ) ).mock.calls.length ).toBe( 1 );
	} );
} );
