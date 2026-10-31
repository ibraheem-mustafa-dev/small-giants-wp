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
//     a host pattern per provider), only when the cards are painted in that provider's own look (lib/platform-look.mjs:
//     its brand colours, Bean 2026-10-31); a provider-linked loop in the client's own style is the testimonial family
//     (the carousel, or the still slider) and the provider's summary beside it stays its own blocks; a loop with no
//     provider link is left as the draft's own blocks, with a note, since the
//     code names no source for the reviews, unless the loop's holder is a scroll track the draft's script drives (a timer,
//     pointer drag or arrow controls: the `carousels` keys), which is the testimonial slider with a testimonial per card;
//   - testimonials (rules.loopTestimonials): a loop with no provider link and no script moving it whose cards each name the
//     person who wrote them (a short line of a capitalised name or initials, or a name or handle with a date after a
//     separator; never a heading) and show
//     no price, each with a rating and a quote or with a quotation, is the testimonial slider in its still form (no autoplay,
//     arrows or dots, the cards per row at 1440 visible), a testimonial per card; a team or blog grid shows no rating or
//     quotation and a product grid a price, so neither is one.
// Only shown elements count; a loop inside an overlay (a drawer or modal fixed at every width) belongs to that panel, and a
// WooCommerce page's own commerce role (shop, cart, checkout, account) is placed by lib/skeleton-commerce-region.mjs.
// Pure: the inventory model, the page map rows, the catalogue's brands and the rules in, the regions out.

import { templateKey } from './fact-key.mjs';
import { leadsTo } from './skeleton-commerce-region.mjs';

const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
// An element's link as the draft writes it, and whether it is a link that leads nowhere and runs a click handler instead,
// read through the one element-facts reader (`read`, lib/element-facts.mjs).
const hrefOf = ( read, e ) => String( read.attr( e, 'href' ) ?? '' ).trim();
const scriptLink = ( read, e ) => 'a' === e.tag && [ '', '#' ].includes( hrefOf( read, e ) ) && !! read.handler( e );
const pagePath = ( href ) => ( href.startsWith( '#' ) ? href : href.split( /[?#]/ )[ 0 ] );
const COMMERCE_PAGES = new Set( [ 'shop', 'cart', 'checkout', 'account' ] );

// o: { m, rows (the page map), brands (the catalogue's brand names), commerce, rule (rules.loopBlocks: { products, brands,
// reviews }), money (rules.commerceRegion.money), shop (rules.commerceRegion.roles.shop), look (lib/platform-look.mjs, or
// null: a provider link then picks its block alone) }. Returns [ { key, kind, block, attributes, inner, item,
// handover, reason } ] for the holders it places, and `notes` for a loop it recognises but cannot place.
export function loopBlocks( { m, rows = [], brands = [], carousels = new Set(), commerce = null, rule, money: moneySource, shop, look = null } ) {
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
		const toProduct = ( e ) => 'a' === e.tag && productRoutes.some( ( r ) => leadsTo( pagePath( hrefOf( m.read, e ) ), r ) );
		if ( everyItem( ( it, all ) => money.test( all.map( text ).join( ' ' ) ) && all.some( ( e ) => toProduct( e ) || ( productRoutes.length && scriptLink( m.read, e ) ) ) ) ) {
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
		// Testimonials: a person's name, initials or handle on a line of its own in the card (rules.loopBlocks.testimonials.person:
		// never a heading, never the quote, a few words at most, optionally followed by a date or place after a separator),
		// and no price; a quotation (a blockquote or q element, or words or a glyph in quotation marks) stands for a rating.
		const T = rule.testimonials;
		const personLine = T && new RegExp( T.person, 'u' );
		const quoteMark = T && new RegExp( T.quotation, 'u' );
		const person = ( it, all ) => !! T && all.some( ( e ) => e !== it && ! /^h[1-6]$/.test( e.tag ) && squash( text( e ) ).length < rule.reviews.quoteLength && squash( text( e ) ).split( ' ' ).length <= T.personMaxWords && personLine.test( squash( text( e ) ) ) );
		const quotation = ( all ) => !! T && all.some( ( e ) => [ 'blockquote', 'q' ].includes( e.tag ) || quoteMark.test( squash( m.words( e ) ) ) );
		const priced = ( all ) => money.test( all.map( text ).join( ' ' ) );
		const ratedItems = everyItem( ( it, all ) => rated.test( all.map( ( e ) => `${ text( e ) } ${ m.read.attr( e, 'aria-label' ) ?? '' }` ).join( ' ' ) ) ) && quoted * 2 >= items.length;
		const quotedPeople = !! T && everyItem( ( it, all ) => quotation( all ) && quote( all ) && person( it, all ) && ! priced( all ) );
		if ( ratedItems || quotedPeople ) {
			const hrefs = items.flatMap( ( it ) => [ it, ...inside( it ) ] ).map( ( x ) => hrefOf( m.read, x ) ).filter( Boolean );
			const linked = Object.entries( rule.reviews.providers ).find( ( [ , p ] ) => hrefs.some( ( h ) => new RegExp( p.host, 'i' ).test( h ) ) );
			// The provider's link picks its block only where the cards are painted in the provider's own look; cards in the
			// client's own style are the testimonial family (Bean 2026-10-31).
			const drawn = linked && look ? look.drawn( items.flatMap( ( it ) => [ it, ...inside( it ) ] ), linked[ 0 ] ) : null;
			const hit = linked && ( ! look || drawn ) ? linked : null;
			const styled = linked && ! hit ? `; it links to ${ linked[ 0 ] }, and ${ look.reason }` : '';
			// A loop of review cards that is a scroll track the draft's script drives (a timer, pointer drag or arrow controls:
			// lib/skeleton-rerun.mjs::carouselKeys) is the testimonial slider, each card a testimonial of it.
			if ( ! hit && rule.carousel && carousels.has( templateKey( { dc: holder.template, tpl: holder.tpl } ) ) ) {
				out.regions.push( { key: holder.key, kind: 'carousel', block: rule.carousel.block, attributes: { ...( rule.carousel.attributes || {} ) }, inner: null, item: null, absorb: false, cards: items.map( ( it ) => it.key ), cardBlock: rule.carousel.cardBlock, handover: null, reason: `${ rule.carousel.reason } (a loop of ${ items.length } review cards in a scroll track the draft's script steps)${ styled }` } );
				continue;
			}
			// A loop of review cards no script moves, each naming the person who wrote it, is the testimonial family in its still
			// form: the slider with no autoplay, arrows or dots, as many cards visible as the draft lays side by side at the
			// widest width; a holder whose cards overflow it on one row at some width is a track the visitor swipes.
			if ( ! hit && T && ( styled || everyItem( ( it, all ) => person( it, all ) && ! priced( all ) ) ) ) {
				// Cards share a row when their boxes overlap by more than half the first one's height (a tilted card's box
				// shifts a little); a track's cards run past the holder's right edge by more than a tenth of a card.
				const sameRow = ( a, b ) => !! a && !! b && Math.min( a.y + a.h, b.y + b.h ) - Math.max( a.y, b.y ) > a.h / 2;
				const row = items.filter( ( k ) => sameRow( items[ 0 ].box?.[ 1440 ], k.box?.[ 1440 ] ) ).length || items.length;
				const track = Object.entries( holder.box || {} ).filter( ( [ , b ] ) => b ).map( ( [ w, hb ] ) => {
					const bs = items.map( ( k ) => k.box?.[ w ] ).filter( Boolean );
					return bs.length >= 2 && bs.every( ( b ) => sameRow( bs[ 0 ], b ) ) && Math.max( ...bs.map( ( b ) => b.x + b.w ) ) > hb.x + hb.w + bs[ 0 ].w / 10 ? w : null;
				} ).filter( Boolean );
				out.regions.push( { key: holder.key, kind: 'testimonials', block: rule.carousel.block, attributes: { ...( T.attributes || {} ), ...( T.perRowAttribute ? { [ T.perRowAttribute ]: row } : {} ) }, inner: null, item: null, absorb: false, cards: items.map( ( it ) => it.key ), cardBlock: rule.carousel.cardBlock, handover: null, reason: `${ T.reason } (a loop of ${ items.length } cards each naming its reviewer, ${ row } side by side at 1440${ track.length ? `, a swiped track at ${ track.join( ' and ' ) }` : '' })${ styled }` } );
				continue;
			}
			if ( ! hit ) {
				out.notes.push( `${ holder.key }: a loop of ${ items.length } reviews (a rating and a quote in each) links to no review provider, so the code names no source and the draft's own blocks stay` );
				continue;
			}
			const [ name, p ] = hit;
			out.regions.push( { key: holder.key, kind: 'reviews', block: p.block, attributes: { ...( p.attributes || {} ), ...( p.countAttribute ? { [ p.countAttribute ]: items.length } : {} ) }, inner: null, item: null, handover: p.handover, reason: `${ rule.reviews.reason } (${ name }: a loop of ${ items.length } items with a rating and a quote, linking to the provider${ drawn ? `, ${ drawn.why }` : '' })` } );
		}
	}
	return out;
}
