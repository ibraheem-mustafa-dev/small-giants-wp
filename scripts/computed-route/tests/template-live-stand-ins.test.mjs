// lib/template-live-address.mjs::liveFactsPhp run under PHP against a stub shop: the single-product template's live address
// (when the draft names no product) and the checkout's basket product are never a calibration fixture or a gift card
// (restores the rest of 4f2c77669's rule). A fixture is marked by `_sgs_cr_fixture` or `_sgs_fixture` meta or an
// `sgs-fixture-` SKU; a gift card is a product type naming a gift (the plugin's `sgs_gift_card`) or a product named or
// SKU'd "gift card". Negative controls: a product the draft names is read even when it is a gift card, an ordinary product
// named like a gift ("Gift box") is a real product, and a shop of only stand-ins has no address. Needs `php` on PATH.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { liveFactsPhp } from '../lib/template-live-address.mjs';

// The stub shop: WooCommerce's functions over a product list, enough for liveFactsPhp to run outside WordPress.
const PRELUDE = `
const OBJECT = 'OBJECT';
class SgsStubProduct {
	public $d;
	public function __construct( $d ) { $this->d = $d; }
	public function get_id() { return $this->d['id']; }
	public function get_type() { return $this->d['type']; }
	public function get_name() { return $this->d['name']; }
	public function get_sku() { return $this->d['sku'] ?? ''; }
	public function get_status() { return 'publish'; }
	public function get_catalog_visibility() { return 'visible'; }
	public function is_purchasable() { return true; }
	public function is_in_stock() { return true; }
	public function get_parent_id() { return $this->d['parent'] ?? 0; }
	public function get_children() { return $this->d['children'] ?? array(); }
	public function get_variation_attributes() { return array( 'attribute_pa_size' => 'm' ); }
}
class SgsStubCart {
	public function add_to_cart( $pid ) { return 'key'; }
	public function empty_cart() {}
}
function sgs_stub_products() { return $GLOBALS['sgs_stub']; }
function wc_get_product( $id ) { foreach ( sgs_stub_products() as $d ) { if ( $d['id'] === $id ) { return new SgsStubProduct( $d ); } } return null; }
function wc_get_products( $args ) {
	$out = array();
	foreach ( sgs_stub_products() as $d ) {
		if ( ! empty( $d['parent'] ) || ( isset( $args['type'] ) && $args['type'] !== $d['type'] ) ) { continue; }
		$out[] = new SgsStubProduct( $d );
	}
	return $out;
}
function wc_get_page_id( $page ) { return 5; }
function get_permalink( $id ) { if ( 5 === $id ) { return 'https://shop.test/shop/'; } $p = wc_get_product( $id ); return 'https://shop.test/product/' . ( $p ? $p->d['slug'] : $id ) . '/'; }
function wp_make_link_relative( $url ) { return preg_replace( '#^https?://[^/]+#', '', $url ); }
function wp_json_encode( $v ) { return json_encode( $v ); }
function get_page_by_path( $slug ) { foreach ( sgs_stub_products() as $d ) { if ( ( $d['slug'] ?? '' ) === $slug ) { return (object) array( 'ID' => $d['id'] ); } } return null; }
function get_post_meta( $id, $key ) { $p = wc_get_product( $id ); return $p ? (string) ( $p->d['meta'][ $key ] ?? '' ) : ''; }
function wc_load_cart() {}
function WC() { static $wc = null; if ( ! $wc ) { $wc = (object) array( 'cart' => new SgsStubCart() ); } return $wc; }
function apply_filters( $hook, $value ) { return $value; }
function wc_clear_notices() {}
`;

// The facts liveFactsPhp prints for `products` ({ id, type, name, slug, sku?, meta?, parent?, children? }).
function factsFor( products, productSlugs = [] ) {
	const php = liveFactsPhp( { productSlugs } ).replace( /^<\?php/, '' );
	const script = `<?php\n$GLOBALS['sgs_stub'] = json_decode( base64_decode( '${ Buffer.from( JSON.stringify( products ) ).toString( 'base64' ) }' ), true );\n${ PRELUDE }\n${ php }`;
	const r = spawnSync( 'php', [], { input: script, encoding: 'utf8' } );
	assert.equal( r.status, 0, `php failed: ${ r.stderr || r.stdout }` );
	return JSON.parse( r.stdout.trim().split( /\r?\n/ ).pop() );
}

const GIFT_TYPE = { id: 10, type: 'sgs_gift_card', name: 'Mama\'s treat voucher', slug: 'voucher' };
const GIFT_NAMED = { id: 11, type: 'simple', name: 'E-Gift Card', slug: 'e-gift-card' };
const FIXTURE_META = { id: 12, type: 'simple', name: 'Brownie box', slug: 'cr-box', meta: { _sgs_cr_fixture: 'variable-product' } };
const FIXTURE_SKU = { id: 13, type: 'variable', name: 'Frame', slug: 'fx-frame', sku: 'sgs-fixture-eye-care-frame', children: [ 14 ] };
const FIXTURE_SKU_VAR = { id: 14, type: 'variation', name: 'Frame - M', slug: 'fx-frame-m', parent: 13 };
const FIXTURE_FX = { id: 15, type: 'simple', name: 'Toast product', slug: 'toast', meta: { _sgs_fixture: 'mamas:toast' } };
const REAL = { id: 20, type: 'simple', name: 'Zookies', slug: 'zookies' };
const REAL_VARIABLE = { id: 21, type: 'variable', name: 'Aviator frame', slug: 'aviator', children: [ 22 ] };
const REAL_VARIATION = { id: 22, type: 'variation', name: 'Aviator frame - M', slug: 'aviator-m', parent: 21 };

test( 'MUST FAIL: the product address skips gift cards and calibration fixtures and takes the first real product', () => {
	const f = factsFor( [ GIFT_TYPE, GIFT_NAMED, FIXTURE_META, FIXTURE_SKU, FIXTURE_SKU_VAR, FIXTURE_FX, REAL ] );
	assert.equal( f.product, '/product/zookies/' );
	assert.equal( f.shop, '/shop/' );
} );

test( 'MUST FAIL: the basket product skips a calibration fixture\'s variation and a fixture or gift card simple product', () => {
	const f = factsFor( [ GIFT_NAMED, FIXTURE_META, FIXTURE_SKU, FIXTURE_SKU_VAR, FIXTURE_FX, REAL_VARIABLE, REAL_VARIATION ] );
	assert.equal( f.basket.path, '/product/aviator/' );
	assert.equal( f.basket.fields.variation_id, '22' );
	assert.equal( f.product, '/product/aviator/', 'an all-variable shop is read at its first real variable product' );
} );

test( 'negative control: a product the draft names is read even when it is a gift card', () => {
	assert.equal( factsFor( [ GIFT_NAMED, REAL ], [ 'e-gift-card' ] ).product, '/product/e-gift-card/' );
} );

test( 'negative control: a product named like a gift but no gift card is a real product', () => {
	const box = { id: 30, type: 'simple', name: 'Gift box of six', slug: 'gift-box', sku: 'GIFT-6' };
	const f = factsFor( [ box ] );
	assert.equal( f.product, '/product/gift-box/' );
	assert.equal( f.basket.path, '/product/gift-box/' );
} );

test( 'negative control: a shop of only gift cards and fixtures has no product address and no basket product', () => {
	const f = factsFor( [ GIFT_TYPE, GIFT_NAMED, FIXTURE_META, FIXTURE_SKU, FIXTURE_SKU_VAR, FIXTURE_FX ] );
	assert.equal( f.product, null );
	assert.equal( f.basket, null );
} );
