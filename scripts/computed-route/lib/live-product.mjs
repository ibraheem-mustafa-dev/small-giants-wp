// The live address a `product` surface is read at. Every product uses one single-product template (page-map row postType
// `product`, collection `live`, no post of its own), so the site run reads that template at one real product's permalink.
// The product is chosen deterministically from the live site's published products: the one whose title equals the draft
// product page's main heading, else the first simple, purchasable, in-stock product, else the first purchasable, in-stock
// variable product (its permalink: a page read needs no variation). A calibration fixture or a gift card is never chosen. The query is read-only; site-run.mjs runs it through its WP-CLI runner.
import fs from 'fs';
import path from 'path';
import { primeReject, variationReject } from './live-prime.mjs';

// Prints a JSON array of the published products' facts the picker judges, with each permalink (read-only).
export function liveProductsPhp() {
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array() ); return; }
$out = array();
foreach ( wc_get_products( array( 'status' => 'publish', 'limit' => 100, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $p ) {
	$id = $p->get_id();
	$out[] = array(
		'id' => $id,
		'type' => $p->get_type(),
		'title' => $p->get_name(),
		'sku' => (string) $p->get_sku(),
		'link' => get_permalink( $id ),
		'fixture' => '' !== (string) get_post_meta( $id, '_sgs_cr_fixture', true ) || '' !== (string) get_post_meta( $id, '_sgs_fixture', true ),
		'purchasable' => (bool) $p->is_purchasable(),
	);
}
echo wp_json_encode( $out );
`;
}

const FIXTURE_TITLE = /fixture|calibration|sgs[-_ ]cr\b/i;
const norm = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// Whether a candidate is a calibration fixture, by its marker, its SKU or its title.
const isFixture = ( c ) => !! c.fixture || String( c.sku || '' ).startsWith( 'sgs-fixture-' ) || FIXTURE_TITLE.test( c.title || '' );

// Why a product cannot be read at: a simple product by live-prime.mjs::primeReject, a variable product by
// live-prime.mjs::variationReject over its own purchasable and stock facts (a variable parent is in stock when a variation is);
// any other type is not read at.
const readReject = ( c ) => {
	if ( 'simple' === c.type ) {
		return primeReject( c );
	}
	if ( 'variable' === c.type ) {
		return variationReject( c, { purchasable: c.purchasable, inStock: c.inStock, managed: c.managed, stock: c.stock } );
	}
	return `${ c.type } product`;
};

// The path and query of an absolute permalink, or null for a missing or malformed one.
export function addressOfLink( link ) {
	try {
		const u = new URL( String( link ) );
		return `${ u.pathname }${ u.search }`;
	} catch {
		return null;
	}
}

// { id, address, why } for the product a product surface is read at: `address` is null and `why` names the reason when no
// product qualifies. `heading` is the draft product page's main heading (null: none known).
export function pickLiveProduct( candidates, heading = null ) {
	const list = Array.isArray( candidates ) ? candidates : [];
	const real = list.filter( ( c ) => ! isFixture( c ) && addressOfLink( c.link ) );
	const wanted = norm( heading );
	const buyable = ( c ) => null === readReject( c );
	const notGift = ( c ) => 'gift card' !== variationReject( c, { purchasable: true, inStock: true } );
	const byHeading = wanted ? real.find( ( c ) => norm( c.title ) === wanted && notGift( c ) ) : null;
	const simple = real.find( ( c ) => 'simple' === c.type && buyable( c ) );
	const variable = real.find( ( c ) => 'variable' === c.type && buyable( c ) );
	const chosen = byHeading ?? simple ?? variable ?? null;
	if ( chosen ) {
		return { id: chosen.id, address: addressOfLink( chosen.link ), why: byHeading ? `the product titled like the draft heading "${ heading }"` : simple ? 'the first simple, purchasable product' : 'the first purchasable, in-stock variable product' };
	}
	const reason = ( c ) => ( isFixture( c ) ? 'calibration fixture' : readReject( c ) ?? 'no live link' );
	return { id: null, address: null, why: list.length ? `no published product is titled "${ heading ?? '' }" or is a purchasable, in-stock simple or variable non-fixture, non-gift-card product (${ list.slice( 0, 8 ).map( ( c ) => `#${ c.id } ${ c.title }: ${ reason( c ) }` ).join( '; ' ) })` : 'the site has no published product' };
}

// The first h1's text in a surface's saved inventory (build/intake/inventories/<intakeSurface>.json), or null when the file or
// an h1 is missing.
export function draftHeading( buildDir, intakeSurface ) {
	try {
		const file = path.join( buildDir, 'intake', 'inventories', `${ intakeSurface }.json` );
		const h1 = ( JSON.parse( fs.readFileSync( file, 'utf8' ) ).elements || [] ).find( ( e ) => 'h1' === e.tag && String( e.words || e.allText || '' ).trim() );
		return h1 ? String( h1.words || h1.allText ).trim() : null;
	} catch {
		return null;
	}
}

// Whether a surface is one of WooCommerce's shop or product views: its row is a `shop` or `product` row, or it has no row
// and targets the archive or single-product template. Such a surface is never read at `/`.
export const isLiveWooSurface = ( entry, row ) => [ 'shop', 'product' ].includes( row?.postType ) || ( ! row && [ 'archive-product', 'single-product' ].includes( entry?.target?.template ) );

// Why a surface has no usable live address, or null when it has one (or is no shop or product surface, which may read `/`).
// `pick` is the product choice of a product row (pickLiveProduct's result).
export function liveAddressFailure( { entry, row, address, pick = null } ) {
	if ( address || ! isLiveWooSurface( entry, row ) ) {
		return null;
	}
	return row
		? `no live address for the ${ row.postType } row${ pick ? `: ${ pick.why }` : '' }`
		: `no page-map row for the ${ entry?.target?.template } surface, so no live address (it is never read at the home page)`;
}
