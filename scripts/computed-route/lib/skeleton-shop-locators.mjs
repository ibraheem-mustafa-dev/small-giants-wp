// Where the draft's shop parts sit, read from the client's shop parts record (`sites/<client>/build/shop-parts.json`,
// lib/shop-parts.mjs, Spec 48 FR-48-60, FR-48-61): each part carries `locators`, the `<draft file>/<tpl>` stamps the draft
// runtime puts on the elements that make it up. The skeleton finds the part's element in a surface's inventory by that
// stamp (an inventory key is `<template>/<tpl>#<n>`), so a part is placed where the draft's own code put it, never found by
// its words. Pure: the record in, stamp numbers out.

const WOO_SORT = 'wp:woocommerce/catalog-sorting';
const WOO_COUNT = 'wp:woocommerce/product-results-count';
const ADD_TO_BASKET = 'buybox-add-to-basket';

// The stamp number of a locator (`Product/108` is 108), or null.
export const tplOf = ( locator ) => {
	const n = /\/(\d+)$/.exec( String( locator ?? '' ) );
	return n ? Number( n[ 1 ] ) : null;
};

const stamps = ( parts ) => [ ...new Set( parts.flatMap( ( p ) => ( p.locators || [] ).map( tplOf ) ).filter( Number.isInteger ) ) ].sort( ( a, b ) => a - b );
const partsOf = ( record, kind ) => ( record?.surfaces || [] ).filter( ( s ) => kind === s.kind ).flatMap( ( s ) => s.parts || [] );

// { add, sort, count }: the stamps of the buy box's add-to-basket control, of the shop's sort control and of its result
// count. An empty list when the record has no such part.
export function shopPartStamps( record ) {
	return {
		add: stamps( partsOf( record, 'buybox' ).filter( ( p ) => ADD_TO_BASKET === p.id ) ),
		sort: stamps( partsOf( record, 'filter' ).filter( ( p ) => WOO_SORT === p.home?.contains ) ),
		count: stamps( partsOf( record, 'filter' ).filter( ( p ) => WOO_COUNT === p.home?.contains ) ),
	};
}
