// The shop's sort control and result count (Spec 48 FR-48-61, FR-48-87): WooCommerce's sorting inside the SGS layout. On the
// shop template's surface the draft's sort control and result count (found by the stamps the shop parts record gives them,
// lib/skeleton-shop-locators.mjs, never by their words) are `woocommerce/catalog-sorting` and
// `woocommerce/product-results-count`, placed in a toolbar row at the top of the product collection (the shape the theme's
// archive-product.html composes, because the count reads its query from the collection around it). The draft's own control
// and count, and the wrappers that held only them (and a bare label), are drawn by those blocks, so they are absorbed.
// WooCommerce's sorting offers a fixed set of orders (rules.shopToolbar.sortOptions: a pattern per order, read against an
// option's value and label); a draft option none of them expresses is a missing feature, listed with the option's key.
// Pure: the inventory model, the commerce facts, the shop region and the rule in, the toolbar out.

const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const INTERACTIVE = new Set( [ 'a', 'button', 'input', 'select', 'textarea' ] );
// An option's value as the draft writes it, through the one element-facts reader (`read`, lib/element-facts.mjs).
const optionValue = ( read, e ) => read.attr( e, 'value' ) ?? '';

export function shopToolbar( { m, commerce, region, rule } ) {
	const stamps = commerce?.toolbar;
	if ( ! stamps || ! region?.key || ! rule ) {
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
	const listing = m.byKey[ region.key ];
	const under = ( e, a ) => ancestors( e ).includes( a );
	const pick = ( list ) => els.find( ( e ) => e.template === m.root.template && ( list || [] ).includes( e.tpl ) && ! under( e, listing ) && ! under( listing, e ) ) || null;
	const sort = pick( stamps.sort );
	const count = pick( stamps.count );
	if ( ! sort && ! count ) {
		return null;
	}
	// The draft's elements the blocks draw: the control and the count, then each parent whose every shown child is already
	// among them or is a bare label (a leaf of plain words, never a link or a control), as long as the parent is not around the listing.
	const taken = new Set( [ sort, count ].filter( Boolean ) );
	const kids = ( p ) => els.filter( ( e ) => e.parentKey === p.key );
	for ( let grown = true; grown; ) {
		grown = false;
		for ( const x of [ ...taken ] ) {
			const p = m.byKey[ x.parentKey ];
			if ( p && p !== m.root && ! taken.has( p ) && ! under( listing, p ) && kids( p ).every( ( k ) => taken.has( k ) || ( ! kids( k ).length && ! INTERACTIVE.has( k.tag ) && squash( m.words( k ) ) ) ) ) {
				taken.add( p );
				grown = true;
			}
		}
	}
	const absorb = [ ...taken ].filter( ( e ) => ! taken.has( m.byKey[ e.parentKey ] ) ).map( ( e ) => e.key );
	const order = [ count && { e: count, name: rule.count }, sort && { e: sort, name: rule.sort } ].filter( Boolean ).sort( ( a, b ) => m.els.indexOf( a.e ) - m.els.indexOf( b.e ) );
	const orders = Object.entries( rule.sortOptions || {} ).map( ( [ name, source ] ) => ( { name, rx: new RegExp( source, 'i' ) } ) );
	const missing = sort ? m.els.filter( ( e ) => 'option' === e.tag && e.parentKey === sort.key ).map( ( o ) => ( { o, value: optionValue( m.read, o ), label: squash( m.words( o ) ) } ) )
		.filter( ( x ) => ! orders.some( ( s ) => s.rx.test( x.value ) || s.rx.test( x.label ) ) )
		.map( ( x ) => ( { key: x.o.key, line: `sort option "${ x.label }" (value ${ x.value }): ${ rule.sort } offers ${ orders.map( ( s ) => s.name ).join( ', ' ) } only`, why: rule.missingReason } ) ) : [];
	return {
		sort: sort?.key ?? null,
		count: count?.key ?? null,
		absorb,
		missing,
		node: { name: rule.block, attributes: { ...rule.attributes }, innerBlocks: order.map( ( x ) => ( { name: x.name, attributes: {}, innerBlocks: [] } ) ), reads: false },
	};
}
