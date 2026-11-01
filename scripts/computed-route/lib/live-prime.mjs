// The checkout surface's live priming (Spec 48 §3.6, scripts/parity/lib/prime.mjs): WooCommerce redirects an empty basket's
// checkout to the cart, so the walker's live context first adds one purchasable product through `?add-to-cart=<id>`. The site run
// picks the product from the live site (a read-only query), fill.mjs writes `live.prime` into the walker config of a checkout
// surface only, and a site holding no such product walks unprimed with the reason reported (the root-missing check still fails it).
import { COMMERCE_ROLES } from './skeleton-commerce-region.mjs';

// Prints a JSON array of the published products' facts the picker judges (read-only).
export function primeCandidatesPhp() {
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array() ); return; }
$out = array();
foreach ( wc_get_products( array( 'status' => 'publish', 'limit' => 50, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $p ) {
	$id = $p->get_id();
	$out[] = array(
		'id' => $id,
		'type' => $p->get_type(),
		'title' => $p->get_name(),
		'sku' => (string) $p->get_sku(),
		'categories' => wp_get_post_terms( $id, 'product_cat', array( 'fields' => 'slugs' ) ),
		'fixture' => '' !== (string) get_post_meta( $id, '_sgs_cr_fixture', true ) || '' !== (string) get_post_meta( $id, '_sgs_fixture', true ),
		'purchasable' => (bool) $p->is_purchasable(),
		'inStock' => (bool) $p->is_in_stock(),
		'managed' => (bool) $p->managing_stock(),
		'stock' => $p->managing_stock() ? (int) $p->get_stock_quantity() : null,
	);
}
echo wp_json_encode( $out );
`;
}

const GIFT = /gift/i;

// Why a product cannot prime a basket, or null when it can: a simple, purchasable, in-stock product that is not a gift card or
// a calibration fixture.
export function primeReject( c ) {
	if ( 'simple' !== c.type ) {
		return `${ c.type } product`;
	}
	if ( c.fixture || String( c.sku || '' ).startsWith( 'sgs-fixture-' ) ) {
		return 'calibration fixture';
	}
	if ( GIFT.test( c.title || '' ) || GIFT.test( c.sku || '' ) || ( c.categories || [] ).some( ( s ) => GIFT.test( s ) ) ) {
		return 'gift card';
	}
	if ( ! c.purchasable ) {
		return 'not purchasable';
	}
	if ( ! c.inStock || ( c.managed && ! ( c.stock > 0 ) ) ) {
		return 'out of stock';
	}
	return null;
}

// { id } for the first candidate that passes, else { id: null, why } naming each rejection.
export function pickPrimeProduct( candidates ) {
	const list = Array.isArray( candidates ) ? candidates : [];
	const ok = list.find( ( c ) => null === primeReject( c ) );
	return ok ? { id: ok.id, why: null } : { id: null, why: list.length ? `no simple, purchasable, in-stock product (${ list.slice( 0, 8 ).map( ( c ) => `#${ c.id } ${ primeReject( c ) }` ).join( '; ' ) })` : 'the site has no published product' };
}

// The `live.prime` list for a surface: the add-to-cart URL for a checkout surface with a chosen product, else null.
export function livePrimeFor( { role, base, productId } ) {
	return 'checkout' === role && productId ? [ `${ String( base ).replace( /\/+$/, '' ) }/?add-to-cart=${ productId }` ] : null;
}

// The surface's commerce role from its target template (`checkout` for the checkout template or page).
export const checkoutRole = ( entry, row ) => ( COMMERCE_ROLES[ row?.template ] ?? COMMERCE_ROLES[ entry?.target?.template ] ?? null );
