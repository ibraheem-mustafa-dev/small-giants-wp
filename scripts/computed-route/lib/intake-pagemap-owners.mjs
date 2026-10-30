// Which surfaces of a Claude Design export become page-map rows (Spec 48 FR-48-30): each is classified by what it is,
// read from the draft code. WooCommerce's pages keep its slugs, a shop client always has its cart, checkout and
// my-account pages, the order confirmation reached only from checkout is its own `order-confirmation` template row, and
// a surface that makes no row is a part of its owning row.
import { kebab } from './intake-pagemap-surfaces.mjs';

// WooCommerce's own pages keep WooCommerce's slugs: the shop `shop`, the cart and checkout pages `cart` and
// `checkout`, and every page holding a password field (sign-in, register, account details) the one `my-account` page,
// so two such routes collapse into one row through the twin rule. The account page is an ordinary page (Bean,
// 2026-10-26: the theme has no account template and needs none; the hand-built reference shop's account page is the
// theme's page with WooCommerce's account output in it), so it names the `page` template.
export function wooSlugs( rows, accountPages ) {
	for ( const r of rows ) {
		const account = 'page' === r.postType && ! r.template && accountPages.has( r.route );
		const slug = 'shop' === r.postType ? 'shop' : 'page' === r.postType && [ 'cart', 'checkout' ].includes( r.template ) ? r.template : account ? 'my-account' : null;
		if ( slug ) {
			r.slug = slug;
			r.explicit = true;
		}
		if ( account ) {
			r.template = ACCOUNT_TEMPLATE;
		}
	}
}

// The template the WooCommerce account page names: the site's own page copy, as any ordinary page.
export const ACCOUNT_TEMPLATE = 'page';
const isAccount = ( r ) => 'my-account' === r.slug;

// The shop row's title is the label of the first menu item that links to it (WooCommerce's shop page keeps slug `shop`
// and shows the draft's own name for it).
export function shopTitle( row, label ) {
	if ( 'shop' === row.postType && ! row.shopTitled && label ) {
		row.title = label;
		row.shopTitled = true;
	}
}

// The checkout's order confirmation (WooCommerce's order-received endpoint): a route every link to which comes from
// inside the checkout page and that shows the order is confirmed: the checkout's submit leads to it, or its text shows
// an order reference (lib/intake-pagemap-commerce.mjs::commerceFacts `submits`, `orderRef`). A route the checkout only
// links to (its terms page) stays a page. The confirmation is its own row (FR-48-56): postType `template` (it makes no
// post; WooCommerce serves it at the checkout's endpoint), slug and template `order-confirmation`, the draft's title,
// and its links resolve to it. Returns the rows it made.
export function orderConfirmations( rows, route, pageOfTag, home, routeSlug, used, facts = new Map() ) {
	const checkout = rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template );
	const out = [];
	const confirms = ( r ) => !! facts.get( checkout.route )?.submits.has( r.route ) || !! facts.get( r.route )?.orderRef;
	for ( const r of checkout ? [ ...rows ] : [] ) {
		const into = route.links.filter( ( l ) => l.route === r.route );
		if ( r === checkout || r.route === home || ! r.route || 'page' !== r.postType || r.template || ! into.length || ! into.every( ( l ) => pageOfTag( l.from ) === checkout.route ) || ! confirms( r ) ) {
			continue;
		}
		Object.assign( r, { slug: unique( CONFIRMATION, used ), parent: null, template: CONFIRMATION, menus: [], postType: 'template', collection: 'static', flags: [] } );
		routeSlug.set( r.route, r.slug );
		out.push( r );
	}
	return out;
}
const CONFIRMATION = 'order-confirmation';
const unique = ( base, used ) => {
	let s = base;
	for ( let i = 2; used.has( s ); i++ ) {
		s = `${ base }-${ i }`;
	}
	used.add( s );
	return s;
};

// The cart block's own panel: a drawer showing order lines (a loop of currency amounts) whose links lead to the
// checkout page, whatever other links it holds.
const cartPanel = ( s, checkout ) => 'drawer' === s.kind && !! s.orderLines && !! checkout && ( s.reaches || [] ).includes( checkout.route );

// A shop client (a `shop` or `product` row) always has WooCommerce's cart, checkout and my-account pages, since the site
// build points WooCommerce's page settings at them: each the draft gives no route gets a row with WooCommerce's slug.
// The cart takes the label of the cart block's panel when the draft shows one ("Your bag"), else "Cart". The account
// page, given or added, is an ordinary page.
export function wooPages( rows, surfaces, used ) {
	if ( ! rows.some( ( r ) => [ 'shop', 'product' ].includes( r.postType ) ) ) {
		return;
	}
	rows.filter( ( r ) => 'page' === r.postType && ! r.template && isAccount( r ) ).forEach( ( r ) => { r.template = ACCOUNT_TEMPLATE; } );
	const checkout = rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template );
	const panel = surfaces.find( ( s ) => cartPanel( s, checkout ) );
	const wanted = [
		{ slug: 'cart', title: panel?.label || 'Cart', template: 'cart', has: ( r ) => 'cart' === r.template },
		{ slug: 'checkout', title: 'Checkout', template: 'checkout', has: ( r ) => 'checkout' === r.template },
		{ slug: 'my-account', title: 'My account', template: ACCOUNT_TEMPLATE, has: isAccount },
	];
	for ( const w of wanted.filter( ( x ) => ! rows.some( ( r ) => 'page' === r.postType && x.has( r ) ) ) ) {
		used.add( w.slug );
		rows.push( { slug: w.slug, title: w.title, parent: null, template: w.template, menus: [], postType: 'page', collection: 'static', flags: [], id: null } );
	}
}

// A row WooCommerce's own pieces draw (shop, product, cart, checkout, its order confirmation, my account): a form or modal
// inside its page is WooCommerce's (ownedSurfaces), and the skeleton absorbs such a surface into the piece (lib/skeleton-surface-role.mjs).
export const isWooRow = ( r ) => !! r && ( [ 'shop', 'product', 'product_cat' ].includes( r.postType ) || [ 'cart', 'checkout', CONFIRMATION ].includes( r.template ) || isAccount( r ) );
const WOO_ROW = isWooRow;
const LAYOUT_KIND = new Set( [ 'header', 'footer', 'drawer' ] );

// Which surfaces become rows (FR-48-30, by what each is): a site-wide header, footer and nav drawer are the layout
// rows; a header or footer inside a page is that page's own part; a drawer holding no nav is its block's panel (the
// cart block's panel, one showing order lines and leading to checkout, is a part of the cart row; any other is a part of
// the page holding it, else of the site chrome); a form or modal inside a WooCommerce page (shop, product, cart,
// checkout, its order confirmation, my account) is WooCommerce's or its shop block's, while a choice flow there stays its own sgs_choice_flow
// row; a surfaces.json record with no surface in
// the draft code is a part of its page (the code shows nothing to build). Returns { rows: the surfaces that become
// rows, parts: [ { row, part } ] } with `row` the owning row (null for the site chrome).
export function ownedSurfaces( surfaces, rows, routeSlug ) {
	const rowOfPage = ( page ) => ( page ? rows.find( ( r ) => r.slug === routeSlug.get( page ) || ( r.route && kebab( r.route ) === kebab( page ) ) ) : null ) || null;
	const parts = [];
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
		} else if ( WOO_ROW( page ) && 'choice-flow' !== s.kind ) {
			part( 'woocommerce' );
		} else {
			out.push( s );
		}
	}
	return { rows: out, parts };
}
