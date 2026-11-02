// The commerce region of a WooCommerce page surface (Spec 48 FR-48-87, Bean 2026-10-26): the part of the draft that
// WooCommerce's working piece draws, placed in the skeleton as that piece, an ordinary block, the way a navigation block
// draws a WordPress menu (rules.drawsChildren). Everything around the region (headings, steps, summary cards) stays the
// draft's own blocks. The region is found by structure, from the evidence the page map classifies the page by
// (lib/intake-pagemap-commerce.mjs::commerceFacts), read here on the inventory:
//   - cart: the smallest element holding a loop of order lines (an `sc-for` whose items show a currency amount) and a
//     link to the checkout page; WooCommerce's Cart block draws the lines, the totals and the checkout button;
//   - checkout: the smallest element holding every payment field (an `autocomplete="cc-…"` field, or the
//     `inputmode="numeric"` fields) and the order lines; or, where the draft shows no order lines loop (an empty basket) or
//     no card fields (wallet buttons only), the smallest element holding the checkout's entry fields (rules.commerceRegion.
//     checkoutEntry: enough shown fields, one of them an email, phone, name, address or card field) together with the
//     money-showing block beside it (the order summary); the Checkout block draws the form and the order summary;
//   - account: the smallest element holding every password field; the account block draws the sign-in and account forms.
//     An account page that shows no password field (a signed-out view whose sign-in form sits on another draft page,
//     folded into the account row by the page map) has as its region the shown branch of the condition that holds a link
//     to that page: the account block draws the sign-in form there for a visitor, and the account itself once signed in;
//   - shop: the element whose children are the items of the product loop (an `sc-for` of a mounted card that shows a
//     currency amount); WooCommerce's product collection draws the products, each in the site's own product card.
// Only shown elements count, so a closed panel (the header's basket drawer) never holds evidence; two candidates for one
// role leave the surface as it is, with a note naming them. Pure: the inventory model in, the region out.

import { templateKey } from './fact-key.mjs';
import { isAccountRow } from './site-build-map.mjs';

// The commerce role of a surface, by the template it builds (surfaces.json `target.template`) or, for the account page
// (an ordinary page holding WooCommerce's account piece), the page row its post is; the checkout page's route (a cart's
// region links to it); and, for the account page, `signIn`: the other draft page files holding the account row's own
// WooCommerce forms (its `parts` owned by `woocommerce`, each naming `<file>:<line>:<column> <tag>`), where a signed-out
// view sends its visitor. The shop's role also carries `filters`, what the draft catalogue (sites/<client>/build/catalogue.json,
// FR-48-92) says its filter rail can filter: { facets, brands, categories } (lib/skeleton-filter-rail.mjs).
export const COMMERCE_ROLES = { 'archive-product': 'shop', cart: 'cart', checkout: 'checkout' };
const draftFile = ( s ) => /^([^:?#]+\.dc\.html)(?=[:?#]|$)/i.exec( String( s ?? '' ) )?.[ 1 ] ?? null;
const filtersOf = ( catalogue ) => {
	const kept = ( catalogue?.products || [] ).filter( ( p ) => ! ( catalogue.dropped || [] ).includes( p.draftId ) );
	return { facets: catalogue?.facets || [], brands: [ ...new Set( kept.map( ( p ) => p.brand ).filter( Boolean ) ) ], categories: [ ...new Set( kept.flatMap( ( p ) => p.categories || [] ) ) ] };
};
export function commerceOf( entry, rows = [], catalogue = null ) {
	const page = null != entry?.target?.postId ? rows.find( ( r ) => r.id === entry.target.postId ) : null;
	const role = COMMERCE_ROLES[ entry?.target?.template ] ?? ( page && isAccountRow( page ) ? 'account' : undefined );
	if ( ! role ) {
		return null;
	}
	const checkout = rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template )?.route ?? null;
	const signIn = 'account' === role ? [ ...new Set( ( page.parts || [] ).filter( ( p ) => 'woocommerce' === p.owner ).map( ( p ) => draftFile( p.draftId ) ).filter( ( f ) => f && f !== draftFile( page.route ) ) ) ] : [];
	return { role, checkout, ...( signIn.length ? { signIn } : {} ), ...( 'shop' === role && catalogue ? { filters: filtersOf( catalogue ) } : {} ) };
}

// An attribute as the draft's code writes it: the element's own opening tag (the inventory's `attrs` keeps a few only). The
// draft runtime writes a camel-cased DOM property as `sc-camel-<kebab>` (`autoComplete` is `sc-camel-auto-complete`).
const CAMEL = { autocomplete: 'auto-complete', inputmode: 'input-mode' };
const tagAttr = ( e, name ) => new RegExp( `^<[^>]*\\s${ name }="([^"]*)"`, 'i' ).exec( e.snippet || '' )?.[ 1 ];
const attr = ( e, name ) => String( e.attrs?.[ name ] ?? tagAttr( e, name ) ?? ( CAMEL[ name ] ? tagAttr( e, `sc-camel-${ CAMEL[ name ] }` ) : undefined ) ?? '' );
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
// The loop an element is an item of: its innermost sc-for, keyed by component (a tpl id is numbered per component).
const loopOf = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => templateKey( { dc: e.template, tpl: x.tpl } ) ).at( -1 ) ?? null;
const isEntry = ( e ) => [ 'input', 'select', 'textarea' ].includes( e.tag ) && ! [ 'checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'image', 'file', 'range', 'color' ].includes( attr( e, 'type' ).toLowerCase() );

// Whether an href leads to the route `route` (a page file, `#/<route>`, `#<route>` or a path ending in it).
export function leadsTo( href, route ) {
	if ( ! href || ! route ) {
		return false;
	}
	const h = String( href ).trim();
	const r = String( route ).replace( /^#?\/?/, '' );
	return h === r || h === `#/${ r }` || h === `#${ r }` || h.replace( /\/+$/, '' ).endsWith( `/${ r }` );
}

// A page link without its query string and fragment (`SignIn.dc.html?mode=register` is the SignIn page); a hash link as it is.
const pagePath = ( href ) => ( null == href ? href : String( href ).trim().startsWith( '#' ) ? href : String( href ).split( /[?#]/ )[ 0 ] );

export function commerceRegion( { m, commerce, rule } ) {
	if ( ! commerce?.role || ! rule ) {
		return null;
	}
	const money = new RegExp( rule.money );
	const els = m.els.filter( shown );
	const ancestors = ( e ) => {
		const out = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	// The lowest element holding every element of `list`.
	const common = ( list ) => {
		if ( ! list.length ) {
			return null;
		}
		const first = ancestors( list[ 0 ] );
		return first.find( ( a ) => list.every( ( e ) => ancestors( e ).includes( a ) ) ) || null;
	};
	// The loops whose items show a currency amount: loop tpl -> its member elements.
	const loops = new Map();
	els.filter( loopOf ).forEach( ( e ) => ( loops.get( loopOf( e ) ) || loops.set( loopOf( e ), [] ).get( loopOf( e ) ) ).push( e ) );
	// An element's text with everything below it (an imported card's own elements carry no loop membership).
	const text = ( e ) => String( e.allText ?? m.words( e ) );
	const moneyLoops = [ ...loops.entries() ].filter( ( [ , list ] ) => list.some( ( e ) => money.test( text( e ) ) ) );
	const payment = els.filter( ( e ) => isEntry( e ) && /^cc-/i.test( attr( e, 'autocomplete' ) ) );
	const numeric = els.filter( ( e ) => isEntry( e ) && 'numeric' === attr( e, 'inputmode' ).toLowerCase() );
	const paymentFields = payment.length ? payment : numeric.length >= 2 ? numeric : [];
	const passwords = els.filter( ( e ) => 'input' === e.tag && 'password' === attr( e, 'type' ).toLowerCase() );
	const checkoutLinks = els.filter( ( e ) => leadsTo( e.attrs?.href, commerce.checkout ) );
	// A region inside an overlay (an element fixed at every width it shows, the header's basket drawer) is that panel's,
	// never the page's.
	const overlay = ( e ) => ancestors( e ).some( ( a ) => shown( a ) && Object.entries( a.visible || {} ).filter( ( [ , v ] ) => v ).every( ( [ w ] ) => 'fixed' === a.position?.[ w ] ) );
	// The checkout from its entry fields (rules.commerceRegion.checkoutEntry): the lowest element holding every shown field the
	// visitor types into outside an overlay, when there are enough and one is an identity or card field; then, while the parent
	// holds a block beside it that shows a currency amount (the order summary; it holds no field, the region holds them all),
	// the parent, never the page's root.
	const checkoutEntryRegion = () => {
		const spec = rule.checkoutEntry;
		if ( ! spec ) {
			return null;
		}
		const tokens = new RegExp( spec.autocomplete, 'i' );
		const fields = els.filter( ( e ) => isEntry( e ) && 'password' !== attr( e, 'type' ).toLowerCase() && ! overlay( e ) );
		const identity = fields.some( ( e ) => spec.types.includes( attr( e, 'type' ).toLowerCase() ) || tokens.test( attr( e, 'autocomplete' ) ) ) || numeric.length >= 2;
		let region = fields.length >= spec.minFields && identity ? common( fields ) : null;
		if ( ! region ) {
			return null;
		}
		let summary = false;
		for ( let parent = m.byKey[ region.parentKey ]; parent && parent !== m.root; parent = m.byKey[ region.parentKey ] ) {
			const beside = els.filter( ( e ) => e.parentKey === parent.key && e !== region && money.test( text( e ) ) );
			if ( ! beside.length ) {
				break;
			}
			region = parent;
			summary = true;
		}
		return { region, evidence: [ `${ fields.length } entry field(s)`, summary ? 'the order summary beside them' : 'no order summary beside them' ] };
	};
	const found = [];
	if ( 'cart' === commerce.role ) {
		for ( const [ , list ] of moneyLoops ) {
			// The loop with its nearest checkout link: the link giving the lowest element holding both.
			const pairs = checkoutLinks.filter( ( l ) => ! list.includes( l ) ).map( ( l ) => ( { l, at: common( [ ...list, l ] ) } ) ).filter( ( x ) => x.at );
			const near = pairs.sort( ( x, y ) => ancestors( y.at ).length - ancestors( x.at ).length )[ 0 ];
			near && found.push( { region: near.at, evidence: [ `the order lines loop (${ list.length } elements)`, `the checkout link ${ near.l.key }` ] } );
		}
	} else if ( 'checkout' === commerce.role ) {
		const lines = paymentFields.length ? moneyLoops.map( ( [ , list ] ) => list ).filter( ( list ) => common( [ ...list, ...paymentFields ] ) ) : [];
		const region = lines.length ? common( [ ...paymentFields, ...lines.flat() ] ) : null;
		if ( region ) {
			found.push( { region, evidence: [ `${ paymentFields.length } payment field(s)`, `${ lines.length } order lines loop(s)` ] } );
		} else {
			const entry = checkoutEntryRegion();
			entry && found.push( entry );
		}
	} else if ( 'account' === commerce.role && passwords.length ) {
		found.push( { region: common( passwords ), evidence: [ `${ passwords.length } password field(s)` ] } );
	} else if ( 'account' === commerce.role ) {
		// The signed-out view: each condition (sc-if / sc-else, per component) holding a shown link to a sign-in page; its
		// branch is the topmost shown element under that condition.
		const conditionOf = ( e ) => ( ( c ) => ( c ? `${ e.template }:${ c.tpl }` : null ) )( ( e.membership || [] ).filter( ( x ) => 'sc-if' === x.kind || 'sc-else' === x.kind ).at( -1 ) );
		const under = ( e, c ) => ( e.membership || [] ).some( ( x ) => ( 'sc-if' === x.kind || 'sc-else' === x.kind ) && `${ e.template }:${ x.tpl }` === c );
		const toSignIn = els.filter( ( e ) => ( commerce.signIn || [] ).some( ( f ) => leadsTo( pagePath( e.attrs?.href ), f ) ) );
		for ( const c of new Set( toSignIn.map( conditionOf ).filter( Boolean ) ) ) {
			const branch = els.filter( ( e ) => under( e, c ) && ! ( m.byKey[ e.parentKey ] && under( m.byKey[ e.parentKey ], c ) ) );
			1 === branch.length && found.push( { region: branch[ 0 ], evidence: [ `the signed-out view linking to ${ commerce.signIn.join( ', ' ) }` ] } );
		}
	} else if ( 'shop' === commerce.role ) {
		for ( const [ , list ] of moneyLoops ) {
			// The loop's items are the shown members whose parent is not itself in the loop; their parent is the listing.
			const items = list.filter( ( e ) => ! list.includes( m.byKey[ e.parentKey ] ) );
			const holders = [ ...new Set( items.map( ( e ) => e.parentKey ) ) ];
			// A mounted card: each item holds elements of another component (the draft's card, mounted by dc-import).
			const mounted = items.length > 1 && items.every( ( it ) => m.els.some( ( d ) => d.template !== it.template && ancestors( d ).includes( it ) ) );
			1 === holders.length && mounted && found.push( { region: m.byKey[ holders[ 0 ] ], item: items[ 0 ], evidence: [ `a loop of ${ items.length } mounted cards showing a price` ] } );
		}
	}
	// Of the regions outside an overlay, the page's own markup comes before an imported component's.
	const inPage = found.filter( ( f ) => f.region && f.region !== m.root && ! overlay( f.region ) );
	const own = inPage.filter( ( f ) => f.region.template === m.root.template );
	const regions = own.length ? own : inPage;
	if ( 1 !== regions.length ) {
		return regions.length ? { note: `${ regions.length } elements read as the ${ commerce.role } region (${ regions.map( ( f ) => f.region.key ).join( ', ' ) }), so none is replaced` } : null;
	}
	const { region, evidence, item } = regions[ 0 ];
	const spec = rule.roles[ commerce.role ];
	const attributes = JSON.parse( JSON.stringify( spec.attributes || {} ) );
	// The shop's columns: the cards that share the first card's top edge at 1440.
	if ( item && attributes.displayLayout ) {
		const top = item.box?.[ 1440 ]?.y;
		const row = m.blockKids( region ).filter( ( k ) => null != top && k.box?.[ 1440 ]?.y === top ).length;
		row > 0 && ( attributes.displayLayout.columns = row );
	}
	return { key: region.key, role: commerce.role, block: spec.block, attributes, inner: spec.inner || null, item: item || null, reason: `${ spec.reason } (${ evidence.join( '; ' ) })` };
}
