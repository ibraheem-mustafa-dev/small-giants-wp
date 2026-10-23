// Which routes of a Claude Design export are WooCommerce's shop, cart and checkout pages (Spec 48 FR-48-30), decided by
// what each page is, read from the draft code, never from the words in its name or title:
//   - checkout: a page holding payment fields (an `autocomplete="cc-…"` field, or two or more numeric-keypad fields,
//     `inputmode="numeric"`) and order lines (a loop of currency amounts, lib/shop-parts-logic.mjs::moneyBinding);
//   - cart: any other page holding order lines and a link to a checkout page, with no password field;
//   - shop: a filtered product listing, that is a loop of a mounted card that shows products (an add-to-basket control
//     or a currency amount) whose items the page's own controls narrow (lib/shop-parts-logic.mjs::selectionReads); of
//     two or more, the one a single-product page links to.
// The embedded manifest's own declaration (`wp.type` or `kind` naming a product archive, a cart or a checkout) is
// taken as written. Words in a route's key or title are a hint only: a hint the structure does not bear out is a gap
// row and the route stays a page.
import { attrOf, isFn, keyName, readBinding } from './intake-ast.mjs';
import { elementTree, descendants, ancestors, pageOf, showsOrderLines, innerText } from './intake-pagemap-surfaces.mjs';
import { effectOf, logicOf, moneyBinding, selectionReads } from './shop-parts-logic.mjs';

const ENTRY = new Set( [ 'input', 'select', 'textarea' ] );
const NOT_ENTRY = new Set( [ 'checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'image', 'file', 'range', 'color' ] );
const CONTROL = new Set( [ 'button', 'a', 'select', 'textarea', 'input' ] );
const ORDER_REF = /(^|[^\w])([A-Z]{2,}-?\d{3,}|#\d{3,})([^\w]|$)/;
const strip = ( v ) => String( v || '' ).replace( /^\s*\{\{\s*|\s*\}\}\s*$/g, '' ).trim();
const handlerOf = ( t ) => strip( attrOf( t, 'onClick' ) || attrOf( t, 'onChange' ) || attrOf( t, 'onInput' ) || '' );
const isEntry = ( t ) => ENTRY.has( t.name ) && ! NOT_ENTRY.has( String( attrOf( t, 'type' ) || '' ).toLowerCase() );
const isPayment = ( t ) => isEntry( t ) && ( /^cc-/i.test( attrOf( t, 'autocomplete' ) || '' ) || 'numeric' === String( attrOf( t, 'inputmode' ) || '' ).toLowerCase() );
const paymentFields = ( nodes ) => nodes.filter( isPayment );
const hasPayment = ( nodes ) => nodes.some( ( t ) => /^cc-/i.test( attrOf( t, 'autocomplete' ) || '' ) ) || paymentFields( nodes ).length >= 2;
const tagKey = ( id ) => /^(.+?:\d+:\d+)(\s|$)/.exec( id )?.[ 1 ];
const logicLine = ( id ) => /^(.+?):(\d+) \(logic\)/.exec( id );

// The [ startLine, endLine ] spans of the functions a binding's name gives in the logic.
function fnSpans( L, value ) {
	let name = null;
	try {
		const b = value ? readBinding( value ) : null;
		name = b?.expr && ( b.expr.property?.name || b.expr.name );
	} catch {
		name = null;
	}
	if ( ! L || ! name ) {
		return [];
	}
	return L.all.filter( ( n ) => ( ( 'ObjectProperty' === n.type || 'ClassProperty' === n.type ) && keyName( n ) === name && isFn( n.value ) ) || ( /ClassMethod|ObjectMethod/.test( n.type ) && keyName( n ) === name ) )
		.map( ( n ) => ( isFn( n ) ? n : n.value ) ).map( ( fn ) => [ L.line( fn ), L.line( { loc: { start: fn.loc.end } } ) ] );
}

// What each routed page of the export shows: Map( route -> { payment, orderLines, password, listing, reaches, submits,
// orderRef } ). `reaches` are the routes the page links to; `submits` those its submit leads to (a link from a form's
// submit, a submit button, a button beside the payment fields, or a line of the logic inside a form's submit handler;
// never a plain link);
// `orderRef` says the page's text shows an order reference (`EC-10482`, `#10482`).
export function commerceFacts( exp, routeKeys, links ) {
	const facts = new Map();
	const fact = ( route ) => {
		if ( ! facts.has( route ) ) {
			facts.set( route, { payment: false, orderLines: false, password: false, listing: false, reaches: new Set(), submits: new Set(), orderRef: false } );
		}
		return facts.get( route );
	};
	const drafts = exp.drafts.filter( ( d ) => ! d.error );
	const logic = new Map( drafts.map( ( d ) => [ d.file, logicOf( d.text ) ] ) );
	const trees = new Map( drafts.map( ( d ) => [ d.file, elementTree( d ) ] ) );
	// A mounted card shows products when it holds an add-to-basket control or a currency amount.
	const showsProducts = ( name ) => {
		const file = `${ name }.dc.html`;
		const tree = trees.get( file );
		const L = logic.get( file );
		return !! tree && !! L && ( tree.nodes.some( ( t ) => /^(button|a)$/.test( t.name ) && handlerOf( t ) && effectOf( L, handlerOf( t ) ).appends )
			|| [ ...tree.text.slice( tree.root.index, tree.root.close ).matchAll( /\{\{\s*([\w$.]+)\s*\}\}/g ) ].some( ( m ) => moneyBinding( L, m[ 1 ] ) ) );
	};
	const pageAt = new Map();
	for ( const d of drafts ) {
		const tree = trees.get( d.file );
		const L = logic.get( d.file );
		const byRoute = new Map();
		for ( const t of tree.nodes ) {
			const route = pageOf( d, t, routeKeys );
			pageAt.set( `${ d.file }:${ t.line }:${ t.col }`, { route, t, d } );
			if ( route ) {
				( byRoute.get( route ) || byRoute.set( route, [] ).get( route ) ).push( t );
			}
		}
		for ( const [ route, mine ] of byRoute ) {
			const f = fact( route );
			f.payment ||= hasPayment( mine );
			f.password ||= mine.some( ( t ) => 'input' === t.name && 'password' === String( attrOf( t, 'type' ) || '' ).toLowerCase() );
			f.orderLines ||= mine.some( ( t ) => 'sc-for' === t.name && showsOrderLines( d.text, L, t ) );
			f.orderRef ||= mine.some( ( t ) => /^(h[1-6]|p)$/.test( t.name ) && ORDER_REF.test( innerText( d.text, t ) ) );
			for ( const loop of mine.filter( ( t ) => 'sc-for' === t.name && descendants( t ).some( ( x ) => 'dc-import' === x.name && showsProducts( attrOf( x, 'name' ) ) ) ) ) {
				const keys = selectionReads( L, strip( attrOf( loop, 'list' ) ) );
				f.listing ||= keys.size > 0 && mine.some( ( x ) => CONTROL.has( x.name ) && x !== loop && ! ancestors( x ).includes( loop ) && handlerOf( x )
					&& effectOf( L, handlerOf( x ) ).sets.some( ( k ) => keys.has( k ) ) );
			}
			const forms = mine.filter( ( t ) => 'form' === t.name );
			f.submitSpans = [ ...( f.submitSpans || [] ), ...forms.flatMap( ( t ) => fnSpans( L, attrOf( t, 'onSubmit' ) ).map( ( s ) => ( { file: d.file, s } ) ) ) ];
		}
	}
	// A button beside the payment fields: inside the nearest form or section, which holds a payment field.
	const besidePayment = ( t ) => {
		const box = ancestors( t ).find( ( u ) => /^(form|section)$/.test( u.name ) );
		return !! box && descendants( box ).some( isPayment );
	};
	for ( const l of links.filter( ( x ) => x.route ) ) {
		const at = pageAt.get( tagKey( l.from ) );
		const ln = logicLine( l.from );
		const route = at ? at.route : ln && routeKeys.has( ln[ 1 ] ) ? ln[ 1 ] : null;
		if ( ! route || ! facts.has( route ) ) {
			continue;
		}
		const f = facts.get( route );
		f.reaches.add( l.route );
		const submits = at ? 'form' === at.t.name || ( 'button' === at.t.name && ( 'submit' === String( attrOf( at.t, 'type' ) || '' ).toLowerCase() || besidePayment( at.t ) ) )
			: ( f.submitSpans || [] ).some( ( x ) => x.file === ln[ 1 ] && x.s[ 0 ] <= Number( ln[ 2 ] ) && Number( ln[ 2 ] ) <= x.s[ 1 ] );
		if ( submits ) {
			f.submits.add( l.route );
		}
	}
	for ( const f of facts.values() ) {
		delete f.submitSpans;
	}
	return facts;
}

// The commerce kind an embedded manifest page declares in its own `wp.type` or `kind`: 'shop', 'cart', 'checkout' or null.
export function declaredKind( type, kind ) {
	const t = `${ type || '' } ${ kind || '' }`.toLowerCase();
	return /product archive/.test( t ) ? 'shop' : /(^|[^a-z])checkout([^a-z]|$)/.test( t ) ? 'checkout' : /(^|[^a-z])(cart|basket)([^a-z]|$)/.test( t ) ? 'cart' : null;
}

const SHAPE = { shop: { postType: 'shop', template: 'archive-product', collection: 'live' }, cart: { postType: 'page', template: 'cart', collection: 'static' }, checkout: { postType: 'page', template: 'checkout', collection: 'static' } };
const EVIDENCE = { shop: 'no filtered product listing', cart: 'no order lines with a link to the checkout', checkout: 'no payment fields with order lines' };

// Gives each route row its commerce kind (in place): a manifest declaration (`row.declared`), else the structure
// commerceFacts read; a row whose words alone suggest a kind (`row.hint`) stays as it is and gets a gap row.
export function commerceKinds( rows, facts, gaps ) {
	const plain = ( r ) => r.route && ! r.declared && 'page' === r.postType && ! r.template;
	const kind = new Map( rows.filter( ( r ) => r.declared ).map( ( r ) => [ r, r.declared ] ) );
	const f = ( r ) => facts.get( r.route ) || {};
	rows.filter( ( r ) => plain( r ) && f( r ).payment && f( r ).orderLines ).forEach( ( r ) => kind.set( r, 'checkout' ) );
	const checkouts = new Set( rows.filter( ( r ) => 'checkout' === kind.get( r ) ).map( ( r ) => r.route ) );
	rows.filter( ( r ) => plain( r ) && ! kind.has( r ) && f( r ).orderLines && ! f( r ).password && [ ...( f( r ).reaches || [] ) ].some( ( x ) => checkouts.has( x ) ) )
		.forEach( ( r ) => kind.set( r, 'cart' ) );
	if ( ! [ ...kind.values() ].includes( 'shop' ) ) {
		const listings = rows.filter( ( r ) => plain( r ) && ! kind.has( r ) && f( r ).listing );
		const fromProduct = new Set( rows.filter( ( r ) => 'product' === r.postType && r.route ).flatMap( ( r ) => [ ...( f( r ).reaches || [] ) ] ) );
		const shop = 1 === listings.length ? listings : listings.filter( ( r ) => fromProduct.has( r.route ) );
		if ( 1 === shop.length ) {
			kind.set( shop[ 0 ], 'shop' );
		} else if ( shop.length > 1 || listings.length > 1 ) {
			gaps.push( { construct: 'page-map', draftId: listings.map( ( r ) => r.route ).join( ', ' ), error: `${ listings.length } pages are filtered product listings and no single-product page settles which is the shop, so each stays a page` } );
		}
	}
	for ( const r of rows ) {
		const k = kind.get( r );
		if ( k ) {
			Object.assign( r, SHAPE[ k ] );
		} else if ( r.hint && plain( r ) ) {
			gaps.push( { construct: 'page-map', draftId: r.route, error: `"${ r.title }" reads as the ${ r.hint } by its words alone; the draft shows ${ EVIDENCE[ r.hint ] }, so it stays a page` } );
		}
		delete r.hint;
		delete r.declared;
	}
}
