// A loop of products, brands or reviews on any page is a working block (Spec 48 FR-48-83, Spec 27 FR-24-4, Spec 48A FR-48A-8
// "cloning reads the code", Bean S5): a section's data source comes from the code, from the loop (`sc-for`) and what each
// item shows and links to; the section's heading only supports and never decides (FR-48-30). Read from the inventory:
//   - products: a loop whose items show a currency amount and link to a product page (an `a` whose href leads to the page
//     map's single-product route, or, when the page map holds such a row, an `a` with no destination that runs a handler,
//     the way a card opens its page by script) is the site's product collection, the same block the shop region uses
//     (rules.commerceRegion.roles.shop) with its own query: `inherit` off, as many products as the loop shows;
//   - brands: a loop of links whose labels are the catalogue's brands (two or more distinct) is `sgs/brand-strip` reading the
//     product brands (rules.loopBrands): the items repeat for a marquee, so the count is the distinct labels;
//   - reviews: a loop whose items each show a rating (a run of star glyphs, or a label stating a score out of five) and, in at
//     least half of them, a quote (a text of the item's own, long enough to be one: a rating can stand alone) is the reviews block of the provider its links lead to (rules.loopReviews:
//     a host pattern per provider); a loop with no provider link is left as the draft's own blocks, with a note, since the
//     code names no source for the reviews.
// Only shown elements count; a loop inside an overlay (a drawer or modal fixed at every width) belongs to that panel, and a
// WooCommerce page's own commerce role (shop, cart, checkout, account) is placed by lib/skeleton-commerce-region.mjs.
// Pure: the inventory model, the page map rows, the catalogue's brands and the rules in, the regions out.

import { templateKey } from './fact-key.mjs';
import { leadsTo } from './skeleton-commerce-region.mjs';

const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const tagAttr = ( e, name ) => new RegExp( `^<[^>]*\\s${ name }="([^"]*)"`, 'i' ).exec( e.snippet || '' )?.[ 1 ];
const hrefOf = ( e ) => String( e.attrs?.href ?? tagAttr( e, 'href' ) ?? '' ).trim();
const scriptLink = ( e ) => 'a' === e.tag && [ '', '#' ].includes( hrefOf( e ) ) && /\ssc-camel-on-click=/.test( e.snippet || '' );
const pagePath = ( href ) => ( href.startsWith( '#' ) ? href : href.split( /[?#]/ )[ 0 ] );
const COMMERCE_PAGES = new Set( [ 'shop', 'cart', 'checkout', 'account' ] );

// o: { m, rows (the page map), brands (the catalogue's brand names), commerce, rule (rules.loopBlocks: { products, brands,
// reviews }), money (rules.commerceRegion.money), shop (rules.commerceRegion.roles.shop) }. Returns [ { key, kind, block, attributes, inner, item,
// handover, reason } ] for the holders it places, and `notes` for a loop it recognises but cannot place.
export function loopBlocks( { m, rows = [], brands = [], commerce = null, rule, money: moneySource, shop } ) {
	const out = { regions: [], notes: [] };
	if ( ! rule || ! moneySource || COMMERCE_PAGES.has( commerce?.role ) ) {
		return out;
	}
	const els = m.els.filter( shown );
	const ancestors = ( e ) => {
		const list = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			list.push( p );
		}
		return list;
	};
	const under = ( e, a ) => ancestors( e ).includes( a );
	const overlay = ( e ) => ancestors( e ).some( ( a ) => shown( a ) && Object.entries( a.visible || {} ).filter( ( [ , v ] ) => v ).every( ( [ w ] ) => 'fixed' === a.position?.[ w ] ) );
	const loopOf = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => templateKey( { dc: e.template, tpl: x.tpl } ) ).at( -1 ) ?? null;
	const loops = new Map();
	els.filter( loopOf ).forEach( ( e ) => ( loops.get( loopOf( e ) ) || loops.set( loopOf( e ), [] ).get( loopOf( e ) ) ).push( e ) );
	const money = new RegExp( moneySource );
	const productRoutes = rows.filter( ( r ) => 'single-product' === r.template && r.route ).map( ( r ) => r.route );
	const brandNames = new Set( brands.map( ( b ) => squash( b ).toLowerCase() ).filter( Boolean ) );
	const text = ( e ) => String( e.allText ?? m.words( e ) );
	for ( const [ , list ] of loops ) {
		const items = list.filter( ( e ) => ! list.includes( m.byKey[ e.parentKey ] ) );
		const holders = [ ...new Set( items.map( ( e ) => e.parentKey ) ) ];
		const holder = 1 === holders.length ? m.byKey[ holders[ 0 ] ] : null;
		if ( ! holder || items.length < 2 || holder === m.root || overlay( holder ) ) {
			continue;
		}
		const inside = ( item ) => els.filter( ( e ) => e !== item && under( e, item ) );
		const everyItem = ( test ) => items.every( ( it ) => test( it, [ it, ...inside( it ) ] ) );
		// Products: a currency amount and a link to a product page in every item.
		const toProduct = ( e ) => 'a' === e.tag && productRoutes.some( ( r ) => leadsTo( pagePath( hrefOf( e ) ), r ) );
		if ( everyItem( ( it, all ) => money.test( all.map( text ).join( ' ' ) ) && all.some( ( e ) => toProduct( e ) || ( productRoutes.length && scriptLink( e ) ) ) ) ) {
			const attributes = JSON.parse( JSON.stringify( shop.attributes || {} ) );
			attributes.query = { ...( attributes.query || {} ), inherit: false, perPage: items.length };
			const top = items[ 0 ].box?.[ 1440 ]?.y;
			const row = items.filter( ( k ) => null != top && k.box?.[ 1440 ]?.y === top ).length;
			row > 0 && attributes.displayLayout && ( attributes.displayLayout = { ...attributes.displayLayout, columns: row } );
			out.regions.push( { key: holder.key, kind: 'products', block: shop.block, attributes, inner: shop.inner || null, item: items[ 0 ], reason: `${ rule.products.reason } (a loop of ${ items.length } items showing a price and linking to a product page)` } );
			continue;
		}
		// Brands: links labelled with two or more distinct catalogue brands.
		const labels = items.map( ( it ) => squash( m.words( it ) || text( it ) ).toLowerCase() );
		const named = new Set( labels.filter( ( l ) => brandNames.has( l ) ) );
		if ( named.size >= rule.brands.minMatches && everyItem( ( it, all ) => all.some( ( e ) => 'a' === e.tag ) ) ) {
			out.regions.push( { key: holder.key, kind: 'brands', block: rule.brands.block, attributes: { ...rule.brands.attributes, brandMaxItems: named.size }, inner: null, item: null, reason: `${ rule.brands.reason } (a loop of links labelled with ${ named.size } catalogue brands)` } );
			continue;
		}
		// Reviews: a rating and a quote in every item; the provider is the one its links lead to.
		const rated = new RegExp( rule.reviews.rating, 'i' );
		const quote = ( all ) => all.some( ( e ) => squash( m.words( e ) ).length >= rule.reviews.quoteLength );
		const quoted = items.filter( ( it ) => quote( [ it, ...inside( it ) ] ) ).length;
		if ( everyItem( ( it, all ) => rated.test( all.map( ( e ) => `${ text( e ) } ${ tagAttr( e, 'aria-label' ) ?? '' }` ).join( ' ' ) ) ) && quoted * 2 >= items.length ) {
			const hrefs = items.flatMap( ( it ) => [ it, ...inside( it ) ] ).map( hrefOf ).filter( Boolean );
			const hit = Object.entries( rule.reviews.providers ).find( ( [ , p ] ) => hrefs.some( ( h ) => new RegExp( p.host, 'i' ).test( h ) ) );
			if ( ! hit ) {
				out.notes.push( `${ holder.key }: a loop of ${ items.length } reviews (a rating and a quote in each) links to no review provider, so the code names no source and the draft's own blocks stay` );
				continue;
			}
			const [ name, p ] = hit;
			out.regions.push( { key: holder.key, kind: 'reviews', block: p.block, attributes: { ...( p.attributes || {} ), ...( p.countAttribute ? { [ p.countAttribute ]: items.length } : {} ) }, inner: null, item: null, handover: p.handover, reason: `${ rule.reviews.reason } (${ name }: a loop of ${ items.length } items with a rating and a quote, linking to the provider)` } );
		}
	}
	return out;
}
