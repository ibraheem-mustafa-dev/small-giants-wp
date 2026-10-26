// The commerce region of a WooCommerce page surface (Spec 48 FR-48-87, Bean 2026-10-26): the part of the draft that
// WooCommerce's working piece draws, placed in the skeleton as that piece, an ordinary block, the way a navigation block
// draws a WordPress menu (rules.drawsChildren). Everything around the region (headings, steps, summary cards) stays the
// draft's own blocks. The region is found by structure, from the evidence the page map classifies the page by
// (lib/intake-pagemap-commerce.mjs::commerceFacts), read here on the inventory:
//   - cart: the smallest element holding a loop of order lines (an `sc-for` whose items show a currency amount) and a
//     link to the checkout page; WooCommerce's Cart block draws the lines, the totals and the checkout button;
//   - checkout: the smallest element holding every payment field (an `autocomplete="cc-…"` field, or the
//     `inputmode="numeric"` fields) and the order lines; the Checkout block draws the form and the order summary;
//   - account: the smallest element holding every password field; the account block draws the sign-in and account forms;
//   - shop: the element whose children are the items of the product loop (an `sc-for` of a mounted card that shows a
//     currency amount); WooCommerce's product collection draws the products, each in the site's own product card.
// Only shown elements count, so a closed panel (the header's basket drawer) never holds evidence; two candidates for one
// role leave the surface as it is, with a note naming them. Pure: the inventory model in, the region out.

// The commerce role of a surface, by the template it builds (surfaces.json `target.template`), and the checkout page's
// route (a cart's region links to it).
export const COMMERCE_ROLES = { 'archive-product': 'shop', cart: 'cart', checkout: 'checkout', 'page-my-account': 'account' };
export function commerceOf( entry, rows = [] ) {
	const role = COMMERCE_ROLES[ entry?.target?.template ];
	return role ? { role, checkout: rows.find( ( r ) => 'page' === r.postType && 'checkout' === r.template )?.route ?? null } : null;
}

// An attribute as the draft's code writes it: the element's own opening tag (the inventory's `attrs` keeps a few only).
const attr = ( e, name ) => String( e.attrs?.[ name ] ?? new RegExp( `^<[^>]*\\s${ name }="([^"]*)"`, 'i' ).exec( e.snippet || '' )?.[ 1 ] ?? '' );
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
// The loop an element is an item of: its innermost sc-for, keyed by component (a tpl id is numbered per component).
const loopOf = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => `${ e.template }#${ x.tpl }` ).at( -1 ) ?? null;
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
	const found = [];
	if ( 'cart' === commerce.role ) {
		for ( const [ , list ] of moneyLoops ) {
			// The loop with its nearest checkout link: the link giving the lowest element holding both.
			const pairs = checkoutLinks.filter( ( l ) => ! list.includes( l ) ).map( ( l ) => ( { l, at: common( [ ...list, l ] ) } ) ).filter( ( x ) => x.at );
			const near = pairs.sort( ( x, y ) => ancestors( y.at ).length - ancestors( x.at ).length )[ 0 ];
			near && found.push( { region: near.at, evidence: [ `the order lines loop (${ list.length } elements)`, `the checkout link ${ near.l.key }` ] } );
		}
	} else if ( 'checkout' === commerce.role && paymentFields.length ) {
		const lines = moneyLoops.map( ( [ , list ] ) => list ).filter( ( list ) => common( [ ...list, ...paymentFields ] ) );
		const region = lines.length ? common( [ ...paymentFields, ...lines.flat() ] ) : null;
		region && found.push( { region, evidence: [ `${ paymentFields.length } payment field(s)`, `${ lines.length } order lines loop(s)` ] } );
	} else if ( 'account' === commerce.role && passwords.length ) {
		found.push( { region: common( passwords ), evidence: [ `${ passwords.length } password field(s)` ] } );
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
	// A region inside an overlay (an element fixed at every width it shows, the header's basket drawer) is that panel's,
	// never the page's; of the rest, the page's own markup comes before an imported component's.
	const overlay = ( e ) => ancestors( e ).some( ( a ) => shown( a ) && Object.entries( a.visible || {} ).filter( ( [ , v ] ) => v ).every( ( [ w ] ) => 'fixed' === a.position?.[ w ] ) );
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
