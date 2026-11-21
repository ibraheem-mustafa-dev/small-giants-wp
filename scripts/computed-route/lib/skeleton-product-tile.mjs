// Product tiles on a page that is not the shop (data/skeleton-decisions.json `rules.productTile`): a loop of tiles that
// show a price, each naming one product of the draft catalogue (sites/<client>/build/catalogue.json, Spec 48 FR-48-92),
// is one sgs/product-card per tile, bound to that product. The shop's own listing is WooCommerce's product collection
// (rules.commerceRegion, lib/skeleton-commerce-region.mjs); a best-seller row on the home page shows the same products,
// so its tiles are the same card, each bound to the product the site build made for it (its id a carried id:
// lib/skeleton-carried.mjs::carriedIds `product`). A tile binds by its words: one of its elements' own words are exactly
// the product's name, and the tile also shows the product's brand when the catalogue gives one. Every tile of the loop
// must bind, each to a different product, or no tile is a card (a tile with no product to show would print an empty
// card): the loop stays as the draft's own blocks and a note says which tile names no product.
// Never on a WooCommerce surface (the shop, product, basket, checkout and account pages and their templates): those
// surfaces' pieces draw their own products. Pure: the inventory model and the catalogue in, the tiles out.
import { templateKey } from './fact-key.mjs';

// The WooCommerce templates whose surfaces draw products through WooCommerce's own pieces (template-copies.mjs's shop
// templates), where a product tile is never placed as a card.
export const SHOP_TEMPLATES = [ 'archive-product', 'single-product', 'product-search-results', 'taxonomy-product_attribute', 'taxonomy-product_cat', 'taxonomy-product_tag', 'cart', 'checkout', 'order-confirmation' ];

const norm = ( s ) => String( s ?? '' ).normalize( 'NFKC' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
// The loop an element is an item of: its innermost sc-for, keyed by component (a tpl id is numbered per component).
const loopOf = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => templateKey( { dc: e.template, tpl: x.tpl } ) ).at( -1 ) ?? null;

// The catalogue products a surface's tiles may bind to: the kept products (a product dropped in the intake review was
// never made), or null on a surface where no tile is a card (a WooCommerce surface, or no catalogue).
export function tileProducts( { catalogue, template = null, commerce = null } ) {
	if ( ! catalogue?.products?.length || commerce?.role || SHOP_TEMPLATES.includes( template ) ) {
		return null;
	}
	const dropped = new Set( catalogue.dropped || [] );
	return catalogue.products.filter( ( p ) => ! dropped.has( p.draftId ) && p.name ).map( ( p ) => ( { draftId: p.draftId, name: p.name, brand: p.brand || null } ) );
}

// { tiles: Map( item key -> { draftId, name, brand } ), listings: Set( key ), notes: [ text ] } for one surface; a listing is
// the element whose block children are all one loop's bound tiles, which stays the layout container (rules.productTile.listing)
// rather than a block that accepts only product cards, such as the wishlist panel, which draws its own products. `products` is tileProducts's
// list (null: none), `money` the currency pattern a tile's price matches (rules.commerceRegion.money).
export function productTiles( { m, products, money } ) {
	const tiles = new Map();
	const listings = new Set();
	const notes = [];
	if ( ! products?.length || ! money ) {
		return { tiles, listings, notes };
	}
	const price = new RegExp( money );
	const kidsOf = new Map();
	m.els.forEach( ( e ) => ( kidsOf.get( e.parentKey ) || kidsOf.set( e.parentKey, [] ).get( e.parentKey ) ).push( e ) );
	const below = ( e ) => {
		const out = [];
		const walk = ( x ) => ( kidsOf.get( x.key ) || [] ).forEach( ( k ) => out.push( k ) && walk( k ) );
		walk( e );
		return out;
	};
	const ancestors = ( e ) => {
		const out = [];
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	// An element fixed at every width it shows (a basket drawer, a sticky bar) is an overlay's, never the page's listing.
	const overlay = ( e ) => [ e, ...ancestors( e ) ].some( ( a ) => shown( a ) && Object.entries( a.visible || {} ).filter( ( [ , v ] ) => v ).every( ( [ w ] ) => 'fixed' === a.position?.[ w ] ) );
	const loops = new Map();
	m.els.filter( ( e ) => shown( e ) && loopOf( e ) ).forEach( ( e ) => ( loops.get( loopOf( e ) ) || loops.set( loopOf( e ), [] ).get( loopOf( e ) ) ).push( e ) );
	for ( const [ loop, list ] of loops ) {
		// The loop's tiles are the shown members whose parent is not itself in the loop.
		const items = list.filter( ( e ) => ! list.includes( m.byKey[ e.parentKey ] ) );
		if ( items.length < 2 || items.some( overlay ) ) {
			continue;
		}
		const inside = items.map( ( it ) => [ it, ...below( it ) ].filter( shown ) );
		if ( ! inside.every( ( els ) => els.some( ( d ) => price.test( m.words( d ) ) ) ) ) {
			continue;
		}
		const bound = inside.map( ( els ) => {
			const own = new Set( els.map( ( d ) => norm( m.words( d ) ) ).filter( Boolean ) );
			const hits = products.filter( ( p ) => own.has( norm( p.name ) ) && ( ! p.brand || own.has( norm( p.brand ) ) ) );
			return 1 === hits.length ? hits[ 0 ] : null;
		} );
		const unbound = items.filter( ( it, i ) => ! bound[ i ] );
		if ( unbound.length ) {
			// A loop none of whose tiles names a product is some other priced list (plans, order lines): no note.
			unbound.length < items.length && notes.push( `the loop ${ loop }'s tiles ${ unbound.map( ( it ) => it.key ).join( ', ' ) } name no single catalogue product (by name, with its brand), so no tile of the loop is a product card` );
			continue;
		}
		if ( new Set( bound.map( ( p ) => p.draftId ) ).size !== bound.length ) {
			notes.push( `the loop ${ loop }'s tiles name the same catalogue product twice, so no tile of the loop is a product card` );
			continue;
		}
		items.forEach( ( it, i ) => tiles.set( it.key, bound[ i ] ) );
		// The element whose block children are all the loop's tiles is the listing that lays the cards out.
		const holders = [ ...new Set( items.map( ( it ) => it.parentKey ) ) ];
		1 === holders.length && m.byKey[ holders[ 0 ] ] && m.blockKids( m.byKey[ holders[ 0 ] ] ).every( ( k ) => items.includes( k ) ) && listings.add( holders[ 0 ] );
	}
	return { tiles, listings, notes };
}
