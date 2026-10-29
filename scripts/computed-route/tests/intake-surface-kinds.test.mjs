// Which handoff records are site surfaces, and what a surface needs open before its own root renders (Spec 48 §3.4 step 1,
// lib/intake-skeletons.mjs::surfaceRoots, openAncestors, restFailsAt, landmarkBox; lib/intake-reach-calls.mjs). From the 2026-10-29 intakes:
// Eye Care's "Storefront shell" record names the draft's <helmet> (the document head), its "WP Build Gap Map (report)"
// record names a component the export ships no file for, Mama's checkout draws its own <header> outside the page's <main>
// with no header record, Eye Care's account forms render only inside the signed-in account page their parent records
// open, its filter drawer renders at rest as the shop page's sticky rail and is a drawer only below 1060px, and Mama's account records write their ways as
// `dcLogic('Account').setState(...)`. Tests marked MUST FAIL fail before these rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceRoots, openAncestors, restFailsAt, landmarkBox } from '../lib/intake-skeletons.mjs';
import { reachCalls } from '../lib/intake-reach-calls.mjs';
import { logicState } from '../lib/intake-state.mjs';
import { describeWay } from '../lib/state-openers.mjs';

const row = ( component, tpl, tag ) => ( { kind: 'template-element', draftId: `${ component }:${ tpl }`, component, detail: { tag } } );
const rec = ( o ) => ( { opened_by: 'Load', closed_by: 'n/a', time_dependent: { value: false, reason: 'none' }, states: [ { name: 'default', state_keys: {}, how_to_reach: 'Load' } ], route: '*', parent: null, ...o } );
const CENSUS = { rows: [ row( 'Shop', '0', 'helmet' ), row( 'Shop', '1', 'header' ), row( 'Shop', '6', 'main' ), row( 'Shop', '20', 'div' ), row( 'Shop', '30', 'form' ), row( 'Checkout', '0', 'helmet' ), row( 'Checkout', '7', 'header' ), row( 'Checkout', '9', 'main' ), row( 'Lonely', '3', 'header' ) ] };
const stamped = ( list ) => ( { elements: list.map( ( [ n, parent, tag, attrs = [] ] ) => ( { n: String( n ), parent: null === parent ? null : String( parent ), tag, attrs, words: '' } ) ), topTexts: [] } );
CENSUS.sources = [
	{ component: 'Shop', stamped: stamped( [ [ 0, null, 'helmet' ], [ 1, null, 'header' ], [ 6, null, 'main' ], [ 20, 6, 'div' ], [ 30, 20, 'form' ] ] ) },
	{ component: 'Checkout', stamped: stamped( [ [ 0, null, 'helmet' ], [ 7, null, 'header' ], [ 71, 7, 'a', [ [ 'href', 'Home.dc.html' ] ] ], [ 72, 71, 'img' ], [ 9, null, 'main' ] ] ) },
	{ component: 'Lonely', stamped: stamped( [ [ 3, null, 'header' ], [ 31, 3, 'nav' ] ] ) },
];
const FILES = new Set( [ 'Shop.dc.html', 'Checkout.dc.html', 'Lonely.dc.html' ] );
const RECORDS = [
	rec( { id: 'S-01', kind: 'global', name: 'Shell', dc: 'Shop', template_tpl_id: '0' } ),
	rec( { id: 'S-02', kind: 'header', name: 'Site header', dc: 'Shop', template_tpl_id: '1' } ),
	rec( { id: 'S-03', kind: 'page', name: 'Shop', dc: 'Shop', template_tpl_id: '6', route: 'shop', parent: 'S-01' } ),
	rec( { id: 'S-04', kind: 'drawer', name: 'Filters', dc: 'Shop', template_tpl_id: '20', route: 'shop', parent: 'S-03' } ),
	rec( { id: 'S-05', kind: 'page', name: 'Checkout', dc: 'Checkout', template_tpl_id: '9', route: 'Checkout.dc.html' } ),
	rec( { id: 'S-06', kind: 'page', name: 'Build report', dc: 'Report', template_tpl_id: '0', route: null } ),
	rec( { id: 'S-07', kind: 'form', name: 'Price filter', dc: 'Shop', template_tpl_id: '30', route: 'shop', parent: 'S-04' } ),
];
const roots = ( records = RECORDS, census = CENSUS, files = FILES ) => surfaceRoots( { folder: null, census, records, files } );

test( 'MUST FAIL: a record whose root is the <helmet> is no surface; it is a part with its reason', () => {
	const r = roots();
	assert.equal( r.surfaces.find( ( s ) => 'S-01' === s.id ), undefined );
	assert.match( r.parts.find( ( p ) => 'S-01' === p.id ).why, /<helmet>/ );
} );

test( 'MUST FAIL: a record of a component the export ships no draft file for is a part; one whose file ships but the census lacks stays a gap', () => {
	const r = roots();
	assert.match( r.parts.find( ( p ) => 'S-06' === p.id ).why, /ships no draft file for component "Report"/ );
	assert.equal( r.gaps.filter( ( g ) => /Report/.test( g.draftId ) ).length, 0 );
	const shipped = roots( RECORDS, CENSUS, new Set( [ ...FILES, 'Report.dc.html' ] ) );
	assert.match( shipped.gaps.find( ( g ) => /Report/.test( g.draftId ) ).error, /which the census does not hold/, 'a shipped file the census never read is a fault' );
	assert.ok( roots( RECORDS, CENSUS, null ).gaps.some( ( g ) => /Report/.test( g.draftId ) ), 'with no manifest nothing is known shipped, so it stays a gap' );
} );

test( 'MUST FAIL: a page\'s own <header> that no header record claims is a header surface on the page\'s route; one in no page\'s component stays a gap', () => {
	const r = roots();
	const own = r.surfaces.find( ( s ) => 'Checkout' === s.component && 'header' === s.kind );
	assert.ok( own, 'the checkout draws its own header' );
	assert.deepEqual( [ own.rootTpl, own.route, own.pageOwn, own.slug ], [ '7', 'Checkout.dc.html', 'S-05', 'checkout-header' ] );
	assert.equal( r.gaps.filter( ( g ) => 'Checkout:7' === g.draftId ).length, 0 );
	assert.ok( r.gaps.some( ( g ) => 'Lonely:3' === g.draftId ), 'a header in a component no page record names is still a gap' );
	assert.equal( r.surfaces.filter( ( s ) => 'Shop' === s.component && 'header' === s.kind ).length, 1, 'a claimed header is its record\'s surface only' );
	const noSiteHeader = roots( RECORDS.filter( ( x ) => 'header' !== x.kind ) );
	assert.equal( noSiteHeader.surfaces.filter( ( s ) => 'header' === s.kind ).length, 0, 'with no header record anywhere a page\'s header is the site\'s own left unrecorded' );
	assert.ok( noSiteHeader.gaps.some( ( g ) => 'Checkout:7' === g.draftId ) );
} );

test( 'MUST FAIL: a surface knows the records it shows inside, root-most first, the <helmet> record left out', () => {
	const drawer = roots().surfaces.find( ( s ) => 'S-04' === s.id );
	assert.deepEqual( drawer.ancestors.map( ( a ) => [ a.id, a.component, a.rootTpl ] ), [ [ 'S-03', 'Shop', '6' ] ] );
	assert.deepEqual( roots().surfaces.find( ( s ) => 'S-07' === s.id ).ancestors.map( ( a ) => a.id ), [ 'S-03', 'S-04' ], 'the page before the drawer the form shows in' );
} );

// A fake page whose draft renders the account panel (900) only once a user is signed in.
const fakePage = ( state ) => {
	const calls = [];
	const renders = { 900: () => !! state.user };
	return {
		calls,
		evaluate: async ( fn, arg ) => {
			if ( 'markRoot' === fn.name ) {
				calls.push( `mark ${ arg[ 1 ] }` );
				return renders[ arg[ 1 ] ]?.() ? { copies: 1, tag: 'div' } : { error: 'not rendered' };
			}
			if ( fn === logicState ) {
				calls.push( `${ arg.op } ${ JSON.stringify( arg.patch ) }` );
				'set' === arg.op && Object.assign( state, arg.patch );
				'reach' === arg.op && arg.patch.calls.forEach( ( c ) => Object.assign( state, new Function( `return (${ c.args });` )() ) );
				return 1;
			}
			return null;
		},
	};
};
const ACCOUNT = { slug: 'addresses', component: 'Shop', ancestors: [
	{ id: 'S-42', kind: 'page', component: 'Shop', rootTpl: '900', openedBy: 'Sign in', states: [ { name: 'signed in', state_keys: { page: 'account', user: '{…}' }, how_to_reach: 'Sign in, or L.setState({page:\'account\', user:{first:\'A\'}})' } ] },
	{ id: 'S-45', kind: 'panel', component: 'Shop', rootTpl: '900', openedBy: 'Always', states: [ { name: 'Addresses', state_keys: { tab: 'addr' }, how_to_reach: 'L.setState({tab:\'addr\'})' } ] },
] };
const settle = async () => {};

test( 'MUST FAIL: the records a surface shows inside are opened first, through their own ways, and stay open', async () => {
	const state = {};
	const page = fakePage( state );
	await openAncestors( page, ACCOUNT, settle, null, null );
	assert.deepEqual( state, { page: 'account', user: { first: 'A' } }, 'the account page was opened signed in' );
	assert.ok( ! page.calls.some( ( c ) => /tab/.test( c ) ), 'a parent that renders once its own parent is open is not opened again' );
} );

test( 'negative control: a parent that already renders is left alone', async () => {
	const state = { user: { first: 'B' } };
	const page = fakePage( state );
	await openAncestors( page, ACCOUNT, settle, null, null );
	assert.deepEqual( state, { user: { first: 'B' } } );
	assert.equal( page.calls.filter( ( c ) => /^(set|reach)/.test( c ) ).length, 0 );
} );

// A fake page for the rest probe: the root renders at 1440 and at the other widths `rendersAt` names.
const widthPage = ( rendersAt ) => {
	let width = 1440;
	return {
		setViewportSize: async ( v ) => { width = v.width; },
		evaluate: async ( fn ) => {
			if ( 'markRoot' === fn.name ) {
				return rendersAt.includes( width ) ? { copies: 1, tag: 'aside' } : { error: 'not rendered' };
			}
			return fn === logicState ? 1 : null;
		},
	};
};
const way = ( bounds ) => [ { via: 'state', state: 'drawer open', keys: { open: true }, ...( bounds ? { bounds } : {} ) } ];
const RAIL = { slug: 'rail', component: 'Shop', rootTpl: '269', kind: 'drawer' };

test( 'MUST FAIL: a surface that renders at 1440 but not at a narrower width where a width-bound way holds is read through its ways; elsewhere it is read as it stands', async () => {
	const narrow = [ { key: 'w', min: null, max: 1059 } ];
	assert.equal( await restFailsAt( widthPage( [ 1440 ] ), RAIL, settle, way( narrow ) ), true, 'a rail that is a drawer below 1060px' );
	assert.equal( await restFailsAt( widthPage( [ 1440, 768, 375 ] ), RAIL, settle, way( narrow ) ), false, 'a root that renders at every width needs no way' );
	assert.equal( await restFailsAt( widthPage( [ 1440 ] ), RAIL, settle, way( null ) ), false, 'a way with no width bound is not offered per width' );
	assert.equal( await restFailsAt( widthPage( [ 1440 ] ), RAIL, settle, way( [ { key: 'w', min: 1060, max: null } ] ) ), false, 'no way holds at the narrow widths' );
} );

test( 'a page landmark must span the rendered page and sit above (a header) or below (a footer) its <main>', () => {
	const box = ( top, bottom, width ) => ( { top, bottom, width } );
	const run = ( el, main, tag ) => {
		const was = globalThis.document;
		const mainEl = { getBoundingClientRect: () => main, contains: () => false };
		globalThis.document = { documentElement: { clientWidth: 1440 }, querySelector: ( sel ) => ( 'main' === sel ? mainEl : { getBoundingClientRect: () => el, contains: () => false } ) };
		try {
			return landmarkBox( [ '[x]', tag ] );
		} finally {
			globalThis.document = was;
		}
	};
	assert.equal( run( box( 0, 72, 1440 ), box( 72, 900, 1440 ), 'header' ).ok, true );
	assert.match( run( box( 0, 72, 600 ), box( 72, 900, 1440 ), 'header' ).why, /does not span the page/ );
	assert.match( run( box( 100, 172, 1440 ), box( 72, 900, 1440 ), 'header' ).why, /not above/ );
	assert.equal( run( box( 900, 1000, 1440 ), box( 72, 900, 1440 ), 'footer' ).ok, true );
	assert.match( run( box( 500, 600, 1440 ), box( 72, 900, 1440 ), 'footer' ).why, /not below/ );
} );

test( 'MUST FAIL: a dcLogic(\'<component>\').setState(...) call is a way to open, run on that component only', () => {
	assert.deepEqual( reachCalls( 'dcLogic(\'Account\').setState({ tab: "subs", confirm: "s1" })' ), [ { ident: 'dcLogic', args: '{ tab: "subs", confirm: "s1" }', component: 'Account' } ] );
	assert.deepEqual( reachCalls( 'L = dcLogic(\'X\'); L.setState({a:1})' ), [ { ident: 'L', args: '{a:1}' } ], 'a lookup assigned to a name first is the name\'s call' );
	assert.equal( describeWay( { via: 'reach', state: 'confirming', calls: reachCalls( 'dcLogic("Account").setState({x:1})' ) } ), 'reach "confirming" dcLogic(\'Account\').setState({x:1})' );
	// In the page: the call runs on the named component's instances, never on another component's.
	const made = [];
	const host = ( name ) => ( { dataset: { scName: name }, '__reactFiber$t': { stateNode: { __name: name, logic: { state: {}, setState: ( p ) => made.push( [ name, p ] ) } } } } );
	const was = [ globalThis.document, globalThis.window ];
	globalThis.document = { querySelectorAll: () => [ host( 'Account' ), host( 'Basket' ) ] };
	globalThis.window = {};
	try {
		logicState( { comp: null, op: 'reach', patch: { calls: reachCalls( 'dcLogic(\'Account\').setState({tab:"subs"})' ) } } );
	} finally {
		[ globalThis.document, globalThis.window ] = was;
	}
	assert.deepEqual( made, [ [ 'Account', { tab: 'subs' } ] ] );
} );
