// Which census <header> or <footer> is a page's own (lib/intake-page-landmark.mjs::pageLandmark, used by
// lib/intake-skeletons.mjs::surfaceRoots): a top-level landmark of one page, before (a header) or after (a footer) that page's
// content, holding what the landmark holds; a <header> inside an article, section, dialog, form or aside, in a card, or in the
// root of another surface record is that element's own heading area and no surface. Tests marked MUST FAIL fail before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceRoots } from '../lib/intake-skeletons.mjs';
import { pageLandmark } from '../lib/intake-page-landmark.mjs';

// A stamped template (the census source's `stamped.elements`): [ n, parent, tag, attrs?, words? ] in document order.
const stamped = ( list ) => ( { elements: list.map( ( [ n, parent, tag, attrs = [], words = '' ] ) => ( { n: String( n ), parent: null === parent ? null : String( parent ), tag, attrs, words } ) ), topTexts: [] } );
const logo = [ [ 71, 7, 'a', [ [ 'href', 'Home.dc.html' ] ] ], [ 72, 71, 'img' ] ];
const row = ( component, tpl, tag ) => ( { kind: 'template-element', draftId: `${ component }:${ tpl }`, component, detail: { tag } } );
const rowsOf = ( component, s ) => s.elements.map( ( e ) => row( component, e.n, e.tag ) );

// Checkout: a slim header (with a logo link) before its <main>. Shop (one component for everything): the site header, a page
// branch holding an article with a header, a dialog with a header, a card with a header, and a second page's content.
const CHECKOUT = stamped( [ [ 0, null, 'helmet' ], [ 7, null, 'header' ], ...logo, [ 9, null, 'main' ] ] );
const SHOP = stamped( [
	[ 1, null, 'header' ], [ 2, 1, 'nav' ],
	[ 3, null, 'div' ],
	[ 4, 3, 'main' ],
	[ 5, 4, 'article' ], [ 6, 5, 'header', [], 'Story' ], [ 61, 6, 'a', [ [ 'href', '/' ] ] ],
	[ 7, 4, 'div', [ [ 'class', 'card' ] ] ], [ 8, 7, 'header' ], [ 81, 8, 'nav' ],
	[ 10, null, 'dialog' ], [ 11, 10, 'header' ], [ 111, 11, 'nav' ],
	[ 12, null, 'div', [ [ 'role', 'dialog' ] ] ], [ 13, 12, 'header' ], [ 131, 13, 'nav' ],
	[ 14, null, 'form' ], [ 15, 14, 'header' ], [ 151, 15, 'nav' ],
	[ 16, null, 'aside' ], [ 17, 16, 'header' ], [ 171, 17, 'nav' ],
	[ 18, null, 'section' ], [ 19, 18, 'header' ], [ 191, 19, 'nav' ],
	[ 20, 4, 'header', [], 'Heading only' ],
	[ 30, null, 'div', [ [ 'class', 'drawer' ] ] ], [ 31, 30, 'header' ], [ 311, 31, 'nav' ], [ 32, 30, 'dc-import', [ [ 'name', 'Mod' ] ] ],
	[ 40, null, 'dialog' ], [ 41, 40, 'div' ], [ 42, 41, 'div' ], [ 43, 42, 'header' ], [ 431, 43, 'nav' ],
] );
const MOD = stamped( [ [ 1, null, 'header' ], [ 2, 1, 'nav' ], [ 3, null, 'main' ] ] );
const CARD = stamped( [ [ 1, null, 'div' ], [ 2, 1, 'header' ], [ 21, 2, 'nav' ] ] );
const census = { rows: [ ...rowsOf( 'Checkout', CHECKOUT ), ...rowsOf( 'Shop', SHOP ), ...rowsOf( 'Card', CARD ), ...rowsOf( 'Mod', MOD ) ], sources: [ { component: 'Mod', stamped: MOD }, { component: 'Checkout', stamped: CHECKOUT }, { component: 'Shop', stamped: SHOP }, { component: 'Card', stamped: CARD } ] };
const rec = ( o ) => ( { opened_by: 'Load', closed_by: 'n/a', states: [ { name: 'default', state_keys: {}, how_to_reach: 'Load' } ], route: '*', parent: null, ...o } );
const RECORDS = [
	rec( { id: 'S-09', kind: 'page', name: 'Mod page', dc: 'Mod', template_tpl_id: '3', route: 'mod' } ),
	rec( { id: 'S-02', kind: 'header', name: 'Site header', dc: 'Shop', template_tpl_id: '1' } ),
	rec( { id: 'S-03', kind: 'page', name: 'Shop', dc: 'Shop', template_tpl_id: '4', route: 'shop' } ),
	rec( { id: 'S-05', kind: 'page', name: 'Checkout', dc: 'Checkout', template_tpl_id: '9', route: 'Checkout.dc.html' } ),
	rec( { id: 'S-06', kind: 'drawer', name: 'Filters', dc: 'Shop', template_tpl_id: '30', route: 'shop' } ),
	rec( { id: 'S-07', kind: 'modal', name: 'Size guide', dc: 'Shop', template_tpl_id: '10', route: 'shop' } ),
];
const tplsOf = ( r ) => [].concat( r.template_tpl_id ).map( String );
const judge = ( component, tpl, tag = 'header', records = RECORDS ) => pageLandmark( { tag, component, tpl, census, records, tplsOf } );
const FILES = new Set( [ 'Shop.dc.html', 'Checkout.dc.html', 'Card.dc.html' ] );
const roots = ( records = RECORDS ) => surfaceRoots( { folder: null, census, records, files: FILES } );

test( 'MUST FAIL: a slim header before one page\'s content that holds a logo link is that page\'s own header', () => {
	const r = judge( 'Checkout', '7' );
	assert.equal( r.page?.id, 'S-05', r.why );
	const own = roots().surfaces.find( ( s ) => 'Checkout' === s.component && 'header' === s.kind );
	assert.deepEqual( [ own.rootTpl, own.route, own.pageOwn, own.slug ], [ '7', 'Checkout.dc.html', 'S-05', 'checkout-header' ] );
} );

test( 'MUST FAIL: a header inside an article, a card, a dialog, a role=dialog, a form, an aside, a section or a recorded drawer is no page header', () => {
	for ( const [ tpl, why ] of [ [ '6', /<article>/ ], [ '8', /no page's content|<div>/ ], [ '11', /<dialog>/ ], [ '13', /role="dialog"/ ], [ '15', /<form>/ ], [ '17', /<aside>/ ], [ '19', /<section>/ ], [ '31', /root of surface S-06/ ], [ '43', /<dialog>/ ] ] ) {
		const r = judge( 'Shop', tpl );
		assert.ok( ! r.page, `Shop:${ tpl } must not be a page header` );
		assert.match( r.why, why, `Shop:${ tpl }: ${ r.why }` );
	}
	assert.ok( ! judge( 'Card', '2' ).page, 'a header of an imported card component belongs to no page' );
	assert.match( judge( 'Mod', '1' ).why, /root of surface S-06/, 'a header of a component imported inside a recorded drawer is that drawer own' );
	const s = roots().surfaces.filter( ( x ) => 'header' === x.kind );
	assert.deepEqual( s.map( ( x ) => x.id ), [ 'S-02', 'S-05:header' ], 'the site header record and the checkout own header are the header surfaces; no planted header becomes one' );
} );

test( 'MUST FAIL: a header inside the page\'s own content or holding only a heading is no page header; a header that is a surface record\'s root is that record\'s', () => {
	assert.match( judge( 'Shop', '20' ).why, /no page's content/, 'inside the page\'s <main>, nothing of the page follows it' );
	assert.match( judge( 'Shop', '1' ).why, /root of surface S-02/ );
} );

test( 'a header ahead of several pages\' content is the site\'s, and a header holding nothing a header holds is not a header', () => {
	const two = [ ...RECORDS, rec( { id: 'S-08', kind: 'page', name: 'Basket', dc: 'Shop', template_tpl_id: '12', route: 'basket' } ) ];
	const r = pageLandmark( { tag: 'header', component: 'Shop', tpl: '1', census, records: two.filter( ( x ) => 'S-02' !== x.id ), tplsOf } );
	assert.match( r.why, /serves|precedes the content of 2 pages|follows it/ );
	const bare = stamped( [ [ 1, null, 'header', [], 'Order' ], [ 2, null, 'main' ] ] );
	const c = { sources: [ { component: 'Bare', stamped: bare } ] };
	const page = [ rec( { id: 'S-1', kind: 'page', name: 'Bare', dc: 'Bare', template_tpl_id: '2', route: 'bare' } ) ];
	assert.match( pageLandmark( { tag: 'header', component: 'Bare', tpl: '1', census: c, records: page, tplsOf } ).why, /holds no navigation/ );
	assert.equal( pageLandmark( { tag: 'header', component: 'Bare', tpl: '1', census: c, records: page, tplsOf, siteName: 'Acme' } ).why?.slice( 0, 7 ), 'it hold', 'a heading that is not the site name stays refused' );
	const named = { sources: [ { component: 'Bare', stamped: stamped( [ [ 1, null, 'header', [], 'Acme Ltd' ], [ 2, null, 'main' ] ] ) } ] };
	assert.equal( pageLandmark( { tag: 'header', component: 'Bare', tpl: '1', census: named, records: page, tplsOf, siteName: 'Acme' } ).page?.id, 'S-1', 'the site\'s name is what a header holds' );
} );

test( 'a footer after one page\'s content holding a link is that page\'s own footer', () => {
	const f = stamped( [ [ 1, null, 'main' ], [ 2, null, 'footer' ], [ 3, 2, 'a', [ [ 'href', 'Help.dc.html' ] ] ] ] );
	const c = { sources: [ { component: 'Doc', stamped: f } ] };
	const page = [ rec( { id: 'S-1', kind: 'page', name: 'Doc', dc: 'Doc', template_tpl_id: '1', route: 'doc' } ) ];
	assert.equal( pageLandmark( { tag: 'footer', component: 'Doc', tpl: '2', census: c, records: page, tplsOf } ).page?.id, 'S-1' );
	assert.ok( ! pageLandmark( { tag: 'header', component: 'Doc', tpl: '2', census: c, records: page, tplsOf } ).page, 'a footer is not before the content' );
} );

test( 'a census with no stamped template reads nothing: the candidate is no page landmark', () => {
	assert.match( pageLandmark( { tag: 'header', component: 'Checkout', tpl: '7', census: { rows: [] }, records: RECORDS, tplsOf } ).why, /no stamped template/ );
} );

// The old rule took every header of a component a page record names: with the site's header in another component, an
// account page's modal, article and card headers each became a page header.
test( 'MUST FAIL: planted negatives in the component of a page: an article, dialog and card header are no surface, the top header of the page is', () => {
	const account = stamped( [
		[ 1, null, 'header' ], [ 11, 1, 'nav' ],
		[ 2, null, 'main' ],
		[ 3, 2, 'article' ], [ 4, 3, 'header' ], [ 41, 4, 'nav' ],
		[ 5, null, 'dialog' ], [ 6, 5, 'header' ], [ 61, 6, 'nav' ],
		[ 7, 2, 'div', [ [ 'class', 'card' ] ] ], [ 8, 7, 'header' ], [ 81, 8, 'a', [ [ 'href', '/' ] ] ],
	] );
	const site = stamped( [ [ 1, null, 'header' ], [ 2, 1, 'nav' ] ] );
	const c = { rows: [ ...rowsOf( 'Account', account ), ...rowsOf( 'Site', site ) ], sources: [ { component: 'Account', stamped: account }, { component: 'Site', stamped: site } ] };
	const records = [
		rec( { id: 'S-1', kind: 'header', name: 'Site header', dc: 'Site', template_tpl_id: '1' } ),
		rec( { id: 'S-2', kind: 'page', name: 'Account', dc: 'Account', template_tpl_id: '2', route: 'account' } ),
	];
	const r = surfaceRoots( { folder: null, census: c, records, files: new Set( [ 'Site.dc.html', 'Account.dc.html' ] ) } );
	assert.deepEqual( r.surfaces.filter( ( x ) => 'Account' === x.component && 'header' === x.kind ).map( ( x ) => x.rootTpl ), [ '1' ], 'only the header at the top of the page, ahead of its <main>' );
	assert.deepEqual( r.gaps.map( ( g ) => g.draftId ), [ 'Account:5', 'Account:8' ], 'the unrecorded dialog and the card header in a plain div stay unclaimed-element gaps; the headers inside the article and the dialog are the heading area of those elements and no missing record' );
} );

test( 'a header after the content of the page, a footer before it, and a header with only a link elsewhere are no page landmarks; an outer wrapper naming the page and a link to the site root are', () => {
	const run = ( list, records, tag, tpl ) => pageLandmark( { tag, component: 'T', tpl, census: { sources: [ { component: 'T', stamped: stamped( list ) } ] }, records, tplsOf } );
	const page = ( tpl ) => [ rec( { id: 'S-1', kind: 'page', name: 'T', dc: 'T', template_tpl_id: tpl, route: 't' } ) ];
	assert.match( run( [ [ 1, null, 'main' ], [ 2, null, 'header' ], [ 3, 2, 'nav' ] ], page( '1' ), 'header', '2' ).why, /no page's content/, 'a header after the content' );
	assert.match( run( [ [ 2, null, 'footer' ], [ 3, 2, 'a', [ [ 'href', 'x' ] ] ], [ 1, null, 'main' ] ], page( '1' ), 'footer', '2' ).why, /no page's content/, 'a footer before the content' );
	const wrapped = [ [ 6, null, 'div' ], [ 7, 6, 'header' ], [ 71, 7, 'nav' ], [ 9, 6, 'main' ] ];
	assert.equal( run( wrapped, page( '6' ), 'header', '7' ).page?.id, 'S-1', 'a record naming the outer wrapper of the file: its <main> is the content' );
	assert.ok( ! run( [ [ 6, null, 'div' ], [ 7, 6, 'header' ], [ 71, 7, 'nav' ] ], page( '6' ), 'header', '7' ).page, 'a wrapper holding no <main> has no content after the header' );
	const link = ( href ) => [ [ 1, null, 'header' ], [ 2, 1, 'a', [ [ 'href', href ] ] ], [ 3, null, 'main' ] ];
	assert.equal( run( link( '/' ), page( '3' ), 'header', '1' ).page?.id, 'S-1', 'a link to the site root is a home link' );
	assert.match( run( link( '/shop' ), page( '3' ), 'header', '1' ).why, /holds no navigation/ );
	assert.match( run( [ [ 1, null, 'main' ], [ 2, null, 'footer', [], 'Legal' ] ], page( '1' ), 'footer', '2' ).why, /holds no link or navigation/ );
} );
