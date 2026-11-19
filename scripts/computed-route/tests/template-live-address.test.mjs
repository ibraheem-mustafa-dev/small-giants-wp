// lib/template-live-address.mjs: where the shop templates show on the live site and the checkout walk's basket prime. Each
// MUST FAIL test fails when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { draftProductSlugs, liveFactsPhp, readLiveFacts, templateAddresses, livePrimeFor } from '../lib/template-live-address.mjs';

const BASKET = { path: '/product/zookies/', fields: { 'add-to-cart': '257', variation_id: '258', 'sgs_picks[pa_flavour][0]': 'vanilla' } };

test( 'MUST FAIL: the product archive shows at the shop page and the single-product template at a product', () => {
	assert.deepEqual( templateAddresses( { shop: '/shop/', product: '/product/zookies/', basket: null } ), { 'archive-product': '/shop/', 'single-product': '/product/zookies/' } );
	assert.deepEqual( templateAddresses( { shop: null, product: null } ), {}, 'negative control: a site with no shop page and no product answers no address' );
} );

test( 'MUST FAIL: a checkout walk is primed by posting the basket product as its own form', () => {
	assert.deepEqual( livePrimeFor( 'checkout', { basket: BASKET } ), [ { url: '/product/zookies/', form: BASKET.fields } ] );
	assert.equal( livePrimeFor( 'cart', { basket: BASKET } ), null, 'negative control: only the checkout is primed' );
	assert.equal( livePrimeFor( 'checkout', { basket: null } ), null, 'a site with no basket product walks unprimed' );
} );

test( 'MUST FAIL: the facts are the last JSON line the PHP printed, and a basket without fields is no basket', () => {
	const out = `PHP Warning: touch(): denied\n{"shop":"/old/"}\n{"shop":"/shop/","product":"/product/zookies/","basket":${ JSON.stringify( BASKET ) }}\n`;
	assert.deepEqual( readLiveFacts( out ), { shop: '/shop/', product: '/product/zookies/', basket: BASKET } );
	assert.equal( readLiveFacts( '{"shop":"/shop/","basket":{"path":"/p/"}}' ).basket, null );
	assert.deepEqual( readLiveFacts( 'no json here' ), { shop: null, product: null, basket: null } );
} );

test( 'MUST FAIL: a product surface\'s draft route names the product the template is read at', () => {
	assert.deepEqual( draftProductSlugs( [ 'Product.dc.html?id=zookies', 'Shop.dc.html', 'Product.dc.html?id=zookies', 'Product.dc.html?x=1&id=trio' ] ), [ 'zookies', 'trio' ] );
	assert.deepEqual( draftProductSlugs( [ null, 'Product.dc.html' ] ), [] );
} );

test( 'MUST FAIL: the facts PHP names the draft\'s products in order, escapes them, and saves nothing', () => {
	const php = liveFactsPhp( { productSlugs: [ 'zookies', "it's" ] } );
	assert.match( php, /foreach \( array\( 'zookies', 'it\\'s' \) as \$sgs_slug \)/ );
	assert.match( php, /WC\(\)->cart->empty_cart\(\)/, 'the basket the product is tried in is emptied' );
	assert.doesNotMatch( php, /->save\(|wc_create_order|update_option|wp_insert_post|update_post_meta/, 'the query writes nothing' );
	assert.match( php, /'\\SGS\\Blocks\\Configurator_Groups'/, 'the pick groups are read through the plugin\'s own class' );
	assert.match( liveFactsPhp(), /foreach \( array\(  \) as \$sgs_slug \)/, 'no slugs: the first visible product is used' );
} );
