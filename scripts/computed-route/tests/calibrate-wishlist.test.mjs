// A fixture's `wishlist` (calibration-fixtures.json): sgs/wishlist-panel builds its rows in the browser from the logged-in
// user's saved list (the `_sgs_wishlist` user meta, read through GET /sgs/v1/wishlist), so the block is read a second
// time holding one saved product, and the user's own list is put back afterwards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wishlistPhp, setWishlist } from '../lib/calibrate-wishlist.mjs';

test( 'MUST FAIL: the seed saves one published product for the named user and keeps the user\'s own list to restore', () => {
	const on = wishlistPhp( { customer: "o'brien", on: true } );
	assert.ok( on.includes( "get_user_by( 'login', 'o\\'brien' )" ), 'the login is a quoted PHP string' );
	assert.ok( on.includes( "'_sgs_wishlist'" ) && on.includes( "wc_get_products(" ) );
	assert.ok( on.includes( '_sgs_wishlist_calibration_backup' ), 'the user\'s own list is kept before it is replaced' );
	const off = wishlistPhp( { customer: 'Claude', on: false } );
	assert.ok( off.includes( '_sgs_wishlist_calibration_backup' ) && ! off.includes( 'wc_get_products(' ), 'clearing restores the kept list' );
} );

test( 'MUST FAIL: a seed the site refuses stops the block with the reason; no login refuses before any write', () => {
	assert.throws( () => setWishlist( () => '{"error":"WooCommerce is not active"}', 'Claude', true ), /wishlist: WooCommerce is not active/ );
	const calls = [];
	assert.throws( () => setWishlist( ( php ) => calls.push( php ), '', true ), /no login/ );
	assert.equal( calls.length, 0 );
	assert.deepEqual( setWishlist( () => 'PHP Notice: x\n{"items":1}', 'Claude', true ), { items: 1 }, 'the reply is read by its last JSON line' );
} );

test( 'MUST FAIL: the seed prints the price-drop, stock-chip, bar and share elements and restores every key it touched', () => {
	const on = wishlistPhp( { customer: 'Claude', on: true } );
	assert.ok( on.includes( "'savedPrice' =>" ) && on.includes( 'get_woocommerce_currency()' ), 'a saved price above the current price' );
	assert.ok( on.includes( "'outofstock'" ) && on.includes( "'_stock_status'" ), 'one product is out of stock for the pass' );
	assert.ok( on.includes( "'sgs_wishlist_features'" ) && on.includes( "'sharing' => true" ), 'alerts and sharing are switched on' );
	assert.ok( on.includes( "'_sgs_wishlist_share_on'" ) && on.includes( "'_sgs_wishlist_share_token'" ), 'the share link is on' );
	const off = wishlistPhp( { customer: 'Claude', on: false } );
	for ( const key of [ 'sgs_wishlist_features', '_sgs_wishlist_share_on', '_sgs_wishlist_share_token', '_stock_status', '_sgs_wishlist_calibration_state' ] ) {
		assert.ok( off.includes( key ), `clearing restores ${ key }` );
	}
} );
