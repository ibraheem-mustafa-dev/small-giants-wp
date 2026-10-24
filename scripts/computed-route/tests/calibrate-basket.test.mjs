// Proves the calibration basket (lib/calibrate-basket.mjs): sgs/cart's footer settings are read with a line in the basket
// and its empty-state settings without, each instance keeping the pass in which its marker shows; the basket is filled
// and emptied through the Store API with the nonce the API returns. Offline: a routed fake Store API in local Chromium.
// Run: node --test scripts/computed-route/tests/calibrate-basket.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { addItemBody, pickPass, markerShows, setBasket } from '../lib/calibrate-basket.mjs';
import { WIDTHS } from '../lib/calibrate-props.mjs';

// A read pass where instance 1 (marked) differs from instance 0 (default) only when `differs`.
const pass = ( differs, missed = [] ) => Object.assign( Object.fromEntries( WIDTHS.map( ( w ) => [ w, [ { '': { color: 'red' } }, { '': { color: differs ? 'blue' : 'red' } } ] ] ) ), { hoverMissed: missed, scrolled: {} } );

test( 'MUST FAIL (cart checkoutBgHover untestable with an empty basket): an instance whose marker shows only with the basket filled keeps the filled pass', () => {
	const empty = pass( false );
	const full = pass( true );
	assert.equal( pickPass( [ empty, full ], 1, 0 ), full );
} );

test( 'MUST FAIL (cart empty-state settings): an instance whose marker shows with the basket empty keeps the empty pass; neither keeps the empty pass', () => {
	const empty = pass( true );
	const full = pass( true );
	assert.equal( pickPass( [ empty, full ], 1, 0 ), empty );
	const none = pass( false );
	assert.equal( pickPass( [ none, pass( false ) ], 1, 0 ), none );
	assert.equal( pickPass( [ none ], 1, 0 ), none, 'one pass: no basket' );
} );

test( 'MUST FAIL (a missed hover is no reading): a state instance whose trigger failed in the empty pass keeps the filled pass where it showed', () => {
	const empty = pass( true, [ 1 ] );
	const full = pass( true );
	assert.equal( pickPass( [ empty, full ], 1, 0 ), full );
	assert.equal( markerShows( pass( false ), 1, 0 ), false );
	assert.equal( markerShows( pass( true ), 1, 0 ), true );
} );

test( 'the add-item body names the product, a quantity of one and each variation attribute', () => {
	assert.deepEqual( addItemBody( { id: '39', variation: { 'pa_cr-colour': 'cr-black', 'pa_cr-size': '50' } } ), { id: 39, quantity: 1, variation: [ { attribute: 'pa_cr-colour', value: 'cr-black' }, { attribute: 'pa_cr-size', value: '50' } ] } );
	assert.deepEqual( addItemBody( { id: 7, quantity: 2 } ), { id: 7, quantity: 2 } );
} );

test( 'MUST FAIL (the basket never fills or never empties): setBasket adds the line and empties it through the Store API, writes carrying the returned nonce', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		let items = [ { key: 'stale' } ];
		const writes = [];
		await page.context().route( 'http://shop.test/**', async ( route ) => {
			const req = route.request();
			const url = req.url();
			if ( ! url.includes( '/wp-json/wc/store/v1/' ) ) {
				return route.fulfill( { contentType: 'text/html', body: '<p>site</p>' } );
			}
			const method = req.method();
			if ( 'GET' !== method ) {
				writes.push( { method, nonce: req.headers().nonce } );
				if ( 'n-1' !== req.headers().nonce ) {
					return route.fulfill( { status: 401, contentType: 'application/json', body: '{"message":"bad nonce"}' } );
				}
				if ( 'DELETE' === method && url.endsWith( '/cart/items' ) ) {
					items = [];
				} else if ( 'POST' === method && url.endsWith( '/cart/add-item' ) ) {
					const body = JSON.parse( req.postData() );
					items = [ ...items, { id: body.id, variation: body.variation } ];
				}
			}
			return route.fulfill( { contentType: 'application/json', headers: { Nonce: 'n-1' }, body: JSON.stringify( { items } ) } );
		} );
		assert.equal( await setBasket( page, 'http://shop.test/', { id: 39, variation: { 'pa_cr-colour': 'cr-black' } } ), 1 );
		assert.deepEqual( items, [ { id: 39, variation: [ { attribute: 'pa_cr-colour', value: 'cr-black' } ] } ], 'the stale line is removed first, then the fixture line added' );
		assert.equal( await setBasket( page, 'http://shop.test', null ), 0 );
		assert.deepEqual( items, [] );
		assert.ok( writes.length >= 3 && writes.every( ( w ) => 'n-1' === w.nonce ) );
	} finally {
		await browser.close();
	}
} );
