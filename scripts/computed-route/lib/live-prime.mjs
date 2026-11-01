// The checkout surface's live priming (Spec 48 §3.6, scripts/parity/lib/prime.mjs): WooCommerce redirects an empty basket's
// checkout to the cart, so the walker's live context first adds one purchasable product through `?add-to-cart=<id>`. The site run
// picks the product from the live site (a read-only query), fill.mjs writes `live.prime` into the walker config of a checkout
// surface only, and a site holding no such product walks unprimed with the reason reported (the root-missing check still fails it).
import { COMMERCE_ROLES } from './skeleton-commerce-region.mjs';

// Prints a JSON array of the published products' facts the picker judges (read-only).
export function primeCandidatesPhp() {
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array() ); return; }
// A variable product's first variations with the facts the picker judges; an "any" attribute takes the parent's first option.
function sgs_prime_variations( $parent ) {
	$options = $parent->get_variation_attributes();
	$vars = array();
	foreach ( array_slice( $parent->get_children(), 0, 10 ) as $vid ) {
		$v = wc_get_product( $vid );
		if ( ! $v ) { continue; }
		$attrs = array();
		foreach ( $v->get_variation_attributes() as $key => $value ) {
			$name = 'attribute_' === substr( $key, 0, 10 ) ? substr( $key, 10 ) : $key;
			$first = '' === (string) $value ? ( isset( $options[ $name ] ) && ! empty( $options[ $name ] ) ? reset( $options[ $name ] ) : '' ) : $value;
			$attrs[ $key ] = (string) $first;
		}
		$vars[] = array(
			'id' => $vid,
			'attributes' => $attrs,
			'purchasable' => (bool) $v->is_purchasable(),
			'inStock' => (bool) $v->is_in_stock(),
			'managed' => (bool) $v->managing_stock(),
			'stock' => $v->managing_stock() ? (int) $v->get_stock_quantity() : null,
		);
	}
	return $vars;
}
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
		'variations' => 'variable' === $p->get_type() ? sgs_prime_variations( $p ) : array(),
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

// Why a variable product's variation cannot prime a basket, or null: the parent is no gift card or calibration fixture and the
// variation is purchasable and in stock.
export function variationReject( parent, v ) {
	if ( parent.fixture || String( parent.sku || '' ).startsWith( 'sgs-fixture-' ) ) {
		return 'calibration fixture';
	}
	if ( GIFT.test( parent.title || '' ) || GIFT.test( parent.sku || '' ) || ( parent.categories || [] ).some( ( s ) => GIFT.test( s ) ) ) {
		return 'gift card';
	}
	if ( ! parent.purchasable || ! v.purchasable ) {
		return 'not purchasable';
	}
	if ( ! v.inStock || ( v.managed && ! ( v.stock > 0 ) ) ) {
		return 'out of stock';
	}
	return null;
}

// First eligible variation of a variable product: { parentId, id, attributes }, else null.
function pickVariation( list ) {
	for ( const c of list ) {
		if ( 'variable' !== c.type ) {
			continue;
		}
		const v = ( c.variations || [] ).find( ( x ) => null === variationReject( c, x ) );
		if ( v ) {
			return { parentId: c.id, id: v.id, attributes: v.attributes || {} };
		}
	}
	return null;
}

// { id, variation, why } for the first simple product that passes (variation null), else the first eligible variation of a variable
// product (id is the parent, variation holds its id and attributes), else { id: null, why } naming each rejection.
export function pickPrimeProduct( candidates ) {
	const list = Array.isArray( candidates ) ? candidates : [];
	const ok = list.find( ( c ) => null === primeReject( c ) );
	if ( ok ) {
		return { id: ok.id, variation: null, why: null };
	}
	const variation = pickVariation( list );
	if ( variation ) {
		return { id: variation.parentId, variation, why: null };
	}
	return { id: null, variation: null, why: list.length ? `no simple product or variable product's variation that is purchasable and in stock (${ list.slice( 0, 8 ).map( ( c ) => `#${ c.id } ${ primeReject( c ) }` ).join( '; ' ) })` : 'the site has no published product' };
}

// The `live.prime` list for a surface: the add-to-cart URL for a checkout surface with a chosen product, else null.
// A variation primes through WooCommerce's variable add-to-cart: the parent id, `variation_id` and every `attribute_*` value.
export function livePrimeFor( { role, base, productId, variation } ) {
	if ( 'checkout' !== role || ! productId ) {
		return null;
	}
	const query = new URLSearchParams( { 'add-to-cart': String( productId ) } );
	if ( variation?.id ) {
		query.set( 'variation_id', String( variation.id ) );
		Object.entries( variation.attributes || {} ).forEach( ( [ k, v ] ) => query.set( k, v ) );
	}
	return [ `${ String( base ).replace( /\/+$/, '' ) }/?${ query.toString() }` ];
}

// The surface's commerce role from its target template (`checkout` for the checkout template or page).
export const checkoutRole = ( entry, row ) => ( COMMERCE_ROLES[ row?.template ] ?? COMMERCE_ROLES[ entry?.target?.template ] ?? null );
