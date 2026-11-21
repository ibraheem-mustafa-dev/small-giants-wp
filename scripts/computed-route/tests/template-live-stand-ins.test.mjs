// lib/template-live-address.mjs::liveFactsPhp run under PHP against a stub shop: the single-product template's live address
// (when the draft names no product) and the checkout's basket product are never a calibration fixture or a gift card
// (restores the rest of 4f2c77669's rule). A fixture is marked by `_sgs_cr_fixture` or `_sgs_fixture` meta or an
// `sgs-fixture-` SKU; a gift card is a product type naming a gift (the plugin's `sgs_gift_card`) or a product named or
// SKU'd "gift card". Negative controls: a product the draft names is read even when it is a gift card, an ordinary product
// named like a gift ("Gift box") is a real product, and a shop of only stand-ins has no address. Needs `php` on PATH.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { liveFactsPhp, productAddressPhp } from '../lib/template-live-address.mjs';

// The stub shop: WooCommerce's functions over a product list, enough for liveFactsPhp to run outside WordPress.
const PRELUDE = `
const OBJECT = 'OBJECT';
class SgsStubProduct {
	public $d;
	public function __construct( $d ) { $this->d = $d; }
	public function get_id() { return $this->d['id']; }
	public function get_type() { return $this->d['type']; }
	public function is_type( $t ) { return $this->d['type'] === $t; }
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
function get_posts( $args ) { $ids = array(); foreach ( sgs_stub_products() as $d ) { if ( empty( $d['parent'] ) && isset( $d['meta'][ $args['meta_key'] ] ) ) { $ids[] = $d['id']; } } sort( $ids ); return $ids; }
`;

// The facts liveFactsPhp prints for `products` ({ id, type, name, slug, sku?, meta?, parent?, children? }).
function factsFor( products, productSlugs = [], make = () => liveFactsPhp( { productSlugs } ) ) {
	const php = make().replace( /^<\?php/, '' );
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

// part-look's product page (productAddressPhp with flowLinked): a draft that draws a choice flow's opener is checked on a real
// product linked to a flow, never on a calibration fixture that carries the link (Eye Care's copy links its fixtures too).
const FLOW = { _sgs_choice_flow: 'lens-flow' };
const FIXTURE_LINKED = { id: 40, type: 'simple', name: 'Fixture simple product', slug: 'fixture-simple-product', sku: 'sgs-fixture-simple', meta: FLOW };
const REAL_UNLINKED = { id: 41, type: 'simple', name: 'Lens cloth', slug: 'lens-cloth' };
const REAL_EMPTY_LINK = { id: 39, type: 'variable', name: 'Case', slug: 'case', meta: { _sgs_choice_flow: '' } };
const REAL_LINKED = { id: 42, type: 'variable', name: 'Aviator Classic', slug: 'aviator-classic', meta: FLOW };
const addressOf = ( products, opts ) => factsFor( products, [], () => productAddressPhp( opts ) ).product;

test( 'MUST FAIL: with flowLinked the product address is the first real product linked to a flow, not a linked fixture or an unlinked product', () => {
	assert.equal( addressOf( [ FIXTURE_LINKED, REAL_UNLINKED, REAL_LINKED ], { flowLinked: true } ), '/product/aviator-classic/' );
	assert.equal( addressOf( [ REAL_EMPTY_LINK, REAL_LINKED ], { flowLinked: true } ), '/product/aviator-classic/', 'an emptied link is no link' );
} );

test( 'negative control: without flowLinked the product address is the first real product, as the site run reads it', () => {
	assert.equal( addressOf( [ FIXTURE_LINKED, REAL_UNLINKED, REAL_LINKED ], {} ), '/product/lens-cloth/' );
} );

test( 'negative control: a product the draft names wins over a flow-linked one, and a shop with no real linked product falls back to the first real product', () => {
	assert.equal( addressOf( [ REAL_UNLINKED, REAL_LINKED ], { productSlugs: [ 'lens-cloth' ], flowLinked: true } ), '/product/lens-cloth/' );
	assert.equal( addressOf( [ FIXTURE_LINKED, REAL_UNLINKED ], { flowLinked: true } ), '/product/lens-cloth/' );
} );

// A simple product's buy box returns before the .sgs-buybox wrapper and prints core's own Add to Cart (render.php, the
// `! $product->is_type( 'variable' )` branch: sgs_buybox_simple_keep_flow_html / sgs_buybox_simple_linked_flow_html), which none of
// the buy box's addToCart* settings styles; a variable product prints the styled `.sgs-buybox .buybox__add-to-cart`.
const SIMPLE_LINKED = { id: 38, type: 'simple', name: 'Lens engraving', slug: 'lens-engraving', meta: FLOW };
const SIMPLE_LINKED_LATER = { id: 44, type: 'simple', name: 'Lens tint', slug: 'lens-tint', meta: FLOW };
const VARIABLE_LINKED_LATER = { id: 43, type: 'variable', name: 'Wayfarer', slug: 'wayfarer', meta: FLOW };

test( 'MUST FAIL: with flowLinked a variable product linked to a flow is preferred over a lower-ID simple one, whose Add to Cart the buy box does not style', () => {
	assert.equal( addressOf( [ SIMPLE_LINKED, REAL_LINKED ], { flowLinked: true } ), '/product/aviator-classic/' );
	assert.equal( addressOf( [ SIMPLE_LINKED, REAL_LINKED, VARIABLE_LINKED_LATER ], { flowLinked: true } ), '/product/aviator-classic/', 'the lowest-ID variable one, so the pick is deterministic' );
	assert.equal( addressOf( [ FIXTURE_LINKED, SIMPLE_LINKED, { ...FIXTURE_SKU, meta: FLOW }, REAL_LINKED ], { flowLinked: true } ), '/product/aviator-classic/', 'a linked variable fixture is no choice' );
} );

test( 'negative control: with no real linked variable product, flowLinked falls back to the first real linked product of any type', () => {
	assert.equal( addressOf( [ REAL_UNLINKED, SIMPLE_LINKED ], { flowLinked: true } ), '/product/lens-engraving/' );
	assert.equal( addressOf( [ SIMPLE_LINKED_LATER, SIMPLE_LINKED ], { flowLinked: true } ), '/product/lens-engraving/', 'the lowest-ID one, so the fallback is deterministic' );
	assert.equal( addressOf( [ { ...FIXTURE_SKU, meta: FLOW }, SIMPLE_LINKED ], { flowLinked: true } ), '/product/lens-engraving/', 'a linked variable fixture is never picked, even as the fallback' );
	assert.equal( addressOf( [ SIMPLE_LINKED, REAL_LINKED ], { productSlugs: [ 'lens-engraving' ], flowLinked: true } ), '/product/lens-engraving/', 'a product the draft names still wins' );
} );

test( 'the product address PHP tries no basket and writes nothing', () => {
	const php = productAddressPhp( { flowLinked: true } );
	assert.doesNotMatch( php, /add_to_cart|wc_load_cart|->save\(|update_post_meta|update_option/ );
} );
