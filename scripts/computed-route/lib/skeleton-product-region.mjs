// The product page's hero (Spec 48 FR-48-60, FR-48-56 "one template, many instances", Bean 2026-10-28): the draft page is the
// single-product template, its fixed structure is the template's own design, and the areas that vary per product are the
// working, bound pieces. The buy box is `sgs/buybox`, the one server-rendered composite that draws a product's gallery, price,
// option pickers, stock line and add-to-basket form from the WooCommerce product; the title is a heading bound to the
// product (`sgs-product/field`, key `title`). The Spec 27 parts split that would let the draft's order of parts inside the buy
// box survive is not built (FR-48-60 step 1), so the composite is the stated fallback.
// Found from the draft's code, never from its words:
//   - the buy box region is the lowest element holding the add-to-basket control (the shop parts record's
//     `buybox-add-to-basket` part, lib/skeleton-shop-locators.mjs, found by the draft runtime's stamp) and the page's heading;
//   - the hero is that region, or its parent when a shown sibling of the region holds the product images and none of the
//     buy box (the gallery column of a two-column hero): the composite draws both columns, so the hero is what it replaces.
// Pure: the inventory model, the commerce facts and the rule in, the region out.

const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );

export function productRegion( { m, commerce, rule } ) {
	const spec = rule?.roles?.product;
	const stamps = commerce?.buybox?.add || [];
	if ( ! spec || ! stamps.length ) {
		return null;
	}
	const els = m.els.filter( shown );
	const ancestors = ( e ) => {
		const out = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	const under = ( e, a ) => ancestors( e ).includes( a );
	const add = els.find( ( e ) => e.template === m.root.template && stamps.includes( e.tpl ) );
	const headings = els.filter( ( e ) => 'h1' === e.tag );
	if ( ! add || ! headings.length ) {
		return null;
	}
	const region = ancestors( add ).find( ( a ) => headings.some( ( h ) => under( h, a ) ) );
	const title = region ? headings.find( ( h ) => under( h, region ) ) : null;
	if ( ! region || ! title || region === m.root ) {
		return null;
	}
	const parent = m.byKey[ region.parentKey ];
	const images = ( a ) => els.filter( ( e ) => 'img' === e.tag && under( e, a ) );
	const gallery = parent && parent !== m.root ? els.filter( ( e ) => e.parentKey === parent.key && e !== region && images( e ).length && ! under( add, e ) ) : [];
	const hero = gallery.length ? parent : region;
	const attributes = JSON.parse( JSON.stringify( spec.attributes || {} ) );
	return {
		key: hero.key,
		role: 'product',
		block: spec.block,
		attributes,
		inner: spec.inner || null,
		item: title,
		reason: `${ spec.reason } (the add-to-basket control ${ add.key } and the heading ${ title.key }${ gallery.length ? `, with the gallery column ${ gallery.map( ( g ) => g.key ).join( ', ' ) }` : '' })`,
	};
}
