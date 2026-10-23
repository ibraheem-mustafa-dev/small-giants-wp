// Which surfaces of a Claude Design export become page-map rows (Spec 48 FR-48-30): each is classified by what it is,
// read from the draft code. WooCommerce's pages keep its slugs, a shop client always has its cart, checkout and
// my-account pages, a route reached only from checkout is its endpoint, and a surface that makes no row is a part of
// its owning row.
import { kebab } from './intake-pagemap-surfaces.mjs';

// WooCommerce's own pages keep WooCommerce's slugs: the shop `shop`, the cart and checkout pages `cart` and
// `checkout`, and every page holding a password field (sign-in, register, account details) the one `my-account` page,
// so two such routes collapse into one row through the twin rule.
export function wooSlugs( rows, accountPages ) {
	for ( const r of rows ) {
		const slug = 'shop' === r.postType ? 'shop' : 'page' === r.postType && [ 'cart', 'checkout' ].includes( r.template ) ? r.template
			: 'page' === r.postType && ! r.template && accountPages.has( r.route ) ? 'my-account' : null;
		if ( slug ) {
			r.slug = slug;
			r.explicit = true;
		}
	}
}

// The shop row's title is the label of the first menu item that links to it (WooCommerce's shop page keeps slug `shop`
// and shows the draft's own name for it).
export function shopTitle( row, label ) {
	if ( 'shop' === row.postType && ! row.shopTitled && label ) {
		row.title = label;
		row.shopTitled = true;
	}
}

// WooCommerce endpoints of the checkout page (order received): a route every link to which comes from inside the
// checkout page. Each leaves the rows, its links resolve to the checkout row, and it is returned for the checkout
// row's parts.
export function checkoutEndpoints( rows, route, pageOfTag, home, routeSlug ) {
	const checkout = rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template );
	const out = [];
	for ( const r of checkout ? [ ...rows ] : [] ) {
		const into = route.links.filter( ( l ) => l.route === r.route );
		if ( r === checkout || r.route === home || ! r.route || ! into.length || ! into.every( ( l ) => pageOfTag( l.from ) === checkout.route ) ) {
			continue;
		}
		rows.splice( rows.indexOf( r ), 1 );
		routeSlug.set( r.route, checkout.slug );
		out.push( { checkout, part: { kind: 'endpoint', label: r.title, owner: 'woocommerce', draftId: into[ 0 ].from } } );
	}
	return out;
}

// The cart block's own panel: an overlay holding no nav whose links lead to the checkout page.
const cartPanel = ( s, checkout ) => 'drawer' === s.kind && ! s.nav && !! checkout && ( s.reaches || [] ).includes( checkout.route );

// A shop client (a `shop` or `product` row) always has WooCommerce's cart, checkout and my-account pages, since the site
// build points WooCommerce's page settings at them: each the draft gives no route gets a row with WooCommerce's slug.
// The cart takes the label of the cart block's panel when the draft shows one ("Your bag"), else "Cart".
export function wooPages( rows, surfaces, used ) {
	if ( ! rows.some( ( r ) => [ 'shop', 'product' ].includes( r.postType ) ) ) {
		return;
	}
	const checkout = rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template );
	const panel = surfaces.find( ( s ) => cartPanel( s, checkout ) );
	const wanted = [
		{ slug: 'cart', title: panel?.label || 'Cart', template: 'cart', has: ( r ) => 'cart' === r.template },
		{ slug: 'checkout', title: 'Checkout', template: 'checkout', has: ( r ) => 'checkout' === r.template },
		{ slug: 'my-account', title: 'My account', template: null, has: ( r ) => 'my-account' === r.slug },
	];
	for ( const w of wanted.filter( ( x ) => ! rows.some( ( r ) => 'page' === r.postType && x.has( r ) ) ) ) {
		used.add( w.slug );
		rows.push( { slug: w.slug, title: w.title, parent: null, template: w.template, menus: [], postType: 'page', collection: 'static', flags: [], id: null } );
	}
}

const WOO_ROW =( r ) => r && ( [ 'shop', 'product', 'product_cat' ].includes( r.postType ) || [ 'cart', 'checkout' ].includes( r.template ) || 'my-account' === r.slug );
const LAYOUT_KIND = new Set( [ 'header', 'footer', 'drawer' ] );

// Which surfaces become rows (FR-48-30, by what each is): a site-wide header, footer and nav drawer are the layout
// rows; a header or footer inside a page is that page's own part; a drawer holding no nav is its block's panel (the
// cart block's panel, one leading to checkout, is a part of the cart row; any other is a part of the page holding it,
// else of the site chrome); a form, modal or choice flow inside a WooCommerce page (shop,
// product, cart, checkout, my account) is WooCommerce's or its shop block's; a surfaces.json record with no surface in
// the draft code is a part of its page (the code shows nothing to build). Returns { rows: the surfaces that become
// rows, parts: [ { row, part } ] } with `row` the owning row (null for the site chrome).
export function ownedSurfaces( surfaces, rows, endpoints, routeSlug ) {
	const rowOfPage = ( page ) => ( page ? rows.find( ( r ) => r.slug === routeSlug.get( page ) || ( r.route && kebab( r.route ) === kebab( page ) ) ) : null ) || null;
	const parts = endpoints.map( ( e ) => ( { row: e.checkout, part: e.part } ) );
	const checkout = rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template );
	const cart = rows.find( ( r ) => 'page' === r.postType && 'cart' === r.template ) || null;
	const out = [];
	for ( const s of surfaces ) {
		const hintOnly = s.draftId.startsWith( 'surfaces.json ' );
		const page = rowOfPage( s.page ?? ( hintOnly ? s.route : null ) );
		const part = ( owner, row = page ) => parts.push( { row, part: { kind: s.kind, label: s.label, owner, draftId: s.draftId } } );
		if ( hintOnly ) {
			part( 'draft-notes' );
		} else if ( LAYOUT_KIND.has( s.kind ) && page ) {
			part( WOO_ROW( page ) ? 'woocommerce' : 'page' );
		} else if ( cartPanel( s, checkout ) ) {
			part( 'block', cart || page );
		} else if ( 'drawer' === s.kind && ! s.nav ) {
			part( 'block' );
		} else if ( WOO_ROW( page ) ) {
			part( 'woocommerce' );
		} else {
			out.push( s );
		}
	}
	return { rows: out, parts };
}
