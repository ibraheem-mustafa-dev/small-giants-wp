// Where the site run reads and walks the shop templates live (site-run.mjs::surfaceReach and ::liveAddress) and how the checkout
// walk's basket prime reaches the walker config (lib/fill-config.mjs::baseConfigText). Each MUST FAIL test fails when its rule breaks:
// before these rules the shop and product surfaces were walked at the home page and the checkout at an empty basket.
import test from 'node:test';
import assert from 'node:assert/strict';
import { liveAddress, surfaceReach } from '../site-run.mjs';
import { baseConfigText } from '../lib/fill-config.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, postType: 'page', ...o } );
const ROWS = [
	row( { slug: 'shop', route: 'Shop.dc.html', postType: 'shop', template: 'archive-product' } ),
	row( { slug: 'product', route: 'Product.dc.html', postType: 'product', template: 'single-product' } ),
	row( { slug: 'checkout', route: 'Checkout.dc.html', template: 'checkout' } ),
	row( { slug: 'help', route: 'Help.dc.html' } ),
];
const SHOWN = { 'archive-product': '/shop/', 'single-product': '/product/zookies/' };

test( 'MUST FAIL: the shop and product surfaces are read at their own rows', () => {
	assert.equal( surfaceReach( { key: 'shop', entry: { target: { template: 'archive-product' } }, skel: null, rows: ROWS } ).row?.postType, 'shop' );
	assert.equal( surfaceReach( { key: 'product', entry: { target: { template: 'single-product' } }, skel: null, rows: ROWS } ).row?.postType, 'product' );
	assert.equal( surfaceReach( { key: 'help', entry: {}, skel: null, rows: ROWS } ).row?.slug, 'help', 'negative control: a page surface keeps its page row' );
} );

test( 'MUST FAIL: a shop or product row is walked where the live site shows its template, never at the home page', () => {
	assert.equal( liveAddress( ROWS[ 0 ], ROWS, SHOWN ), '/shop/' );
	assert.equal( liveAddress( ROWS[ 1 ], ROWS, SHOWN ), '/product/zookies/' );
	assert.equal( liveAddress( ROWS[ 1 ], ROWS, {} ), null, 'no answer from the site: no address, so the walk is skipped with its note' );
	assert.equal( liveAddress( ROWS[ 3 ], ROWS, SHOWN ), '/help/', 'negative control: a page is its permalink' );
} );

test( 'MUST FAIL: the walker config carries the checkout walk\'s live prime, and only when there is one', () => {
	const prime = [ { url: '/product/zookies/', form: { 'add-to-cart': '257' } } ];
	const text = baseConfigText( { surface: 'template-checkout', draftUrl: 'http://d/', liveUrl: 'http://l/checkout/', prime } );
	assert.match( text, /live: \{ url: "http:\/\/l\/checkout\/", prime: \[\{"url":"\/product\/zookies\/","form":\{"add-to-cart":"257"\}\}\] \}/ );
	assert.doesNotMatch( baseConfigText( { surface: 'shop', draftUrl: 'http://d/', liveUrl: 'http://l/shop/' } ), /prime/, 'negative control: no prime, none written' );
} );
