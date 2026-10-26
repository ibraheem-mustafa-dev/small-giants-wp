// A state-page draft's routes are reached by state (lib/state-route.mjs, Spec 48 FR-48-26): intake's visit list, the skeleton
// stage's visit, Fill's draft url and site-run's reach all carry a `#@state/page=<route>` fragment that is set on the live
// logic after the entry loads. Fixture tests/fixtures/state-route/ is a state-page export (go(page) over three sc-if pages)
// with the real runtime; its replay HAR is recorded once into the OS temp folder (the first run needs the network). Hash and
// files drafts keep their URLs. Each test MUST FAIL when its rule breaks (tests/fixtures/state-route/mutations.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest, openSandbox } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { readRouting } from '../lib/intake-routing.mjs';
import { staticCensus, runCensus } from '../lib/intake-census.mjs';
import { routeVisits } from '../lib/intake-run-stages.mjs';
import { surfaceRoots, proposeSkeletons, visitOf } from '../lib/intake-skeletons.mjs';
import { preparePage, gotoDraft } from '../lib/intake-harness.mjs';
import { withRoute, readUrlOf } from '../lib/fill-open.mjs';
import { readInventory } from '../lib/skeleton-inventory.mjs';
import { surfaceReach } from '../site-run.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { stateRouteHash, parseStateHash, openStateRoute, applyStateRoute, moveToHash, isStatePage } from '../lib/state-route.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( ...n ) => path.join( HERE, 'fixtures', ...n );
const FOLDER = FIX( 'state-route' );
const ENTRY = 'Home.dc.html';
const STATE = readRouting( { folder: FOLDER } );
const HASH = readRouting( { folder: FIX( 'intake-routing', 'hash' ) } );
const FILES = readRouting( { folder: FIX( 'intake-routing', 'files' ) } );
let harPath;

test.before( async () => {
	const { manifestHash } = recheckManifest( FOLDER );
	harPath = path.join( os.tmpdir(), 'sgs-state-route-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FOLDER, index: ENTRY, harPath } );
	}
} );

// One fresh sandbox and harness page on the fixture.
async function open() {
	const sb = await openSandbox( { folder: FOLDER, index: ENTRY, harPath, mode: 'replay', widths: [ 1440 ] } );
	const page = await sb.newPage();
	await page.setViewportSize( { width: 1440, height: 900 } );
	await preparePage( page );
	return { sb, page };
}

test( 'the fixture is a state-page export whose routes are the go() values', () => {
	assert.equal( STATE.adapter, 'state-page' );
	assert.deepEqual( STATE.routes.map( ( r ) => r.key ).sort(), [ 'about', 'home', 'shop' ] );
	assert.ok( isStatePage( STATE ) && ! isStatePage( HASH ) && ! isStatePage( FILES ) && ! isStatePage( null ) );
} );

test( 'state route fragments round-trip, and the entry route has none', () => {
	assert.equal( stateRouteHash( 'shop' ), '@state/page=shop' );
	assert.equal( stateRouteHash( '/shop' ), '@state/page=shop' );
	assert.deepEqual( parseStateHash( '#@state/page=shop' ), { key: 'page', route: 'shop' } );
	assert.equal( parseStateHash( '/about' ), null, 'a hash route is not a state route' );
	for ( const r of [ '*', '/', '', null ] ) {
		assert.equal( stateRouteHash( r ), '', `${ r } is the entry` );
	}
} );

test( 'MUST FAIL (a): the intake visit list for a state-page draft visits every route, with no only-the-entry gap', () => {
	const v = routeVisits( STATE, ENTRY );
	assert.deepEqual( v.list.map( ( x ) => x.key ).sort(), [ 'about', 'home', 'shop' ] );
	assert.ok( v.list.every( ( x ) => ENTRY === x.file && parseStateHash( x.hash )?.route === x.key ), 'each visit sets its own route state' );
	assert.deepEqual( v.gaps, [], 'no gap row: the routes are visited' );
	assert.equal( new Set( v.census ).size, 3, 'the census sees three distinct visits' );
	assert.equal( new Set( v.sandbox ).size, 3 );
	assert.ok( v.sandbox.every( ( s ) => s.includes( '?#@state/page=' ) ) );
} );

test( 'MUST FAIL (b): visitOf gives a visit for a state-page route, and names a route the export does not have', () => {
	const routing = () => STATE;
	assert.deepEqual( visitOf( 'shop', { entry: ENTRY, routing } ), { file: ENTRY, hash: '@state/page=shop' } );
	assert.deepEqual( visitOf( '/about', { entry: ENTRY, routing } ), { file: ENTRY, hash: '@state/page=about' } );
	assert.deepEqual( visitOf( '*', { entry: ENTRY, routing } ), { file: ENTRY, hash: '' }, 'the entry route stays the entry' );
	assert.match( visitOf( 'nowhere', { entry: ENTRY, routing } ).error, /not a route of the state-page export/ );
} );

test( 'MUST FAIL (c): Fill draft url and site-run reach carry a state-page route as its state, never a hash that does nothing', () => {
	const url = 'http://127.0.0.1:5/Home.dc.html';
	assert.equal( withRoute( url, 'shop', STATE ), `${ url }#@state/page=shop` );
	assert.equal( withRoute( `${ url }#@state/page=about`, 'shop', STATE ), `${ url }#@state/page=shop`, 'the url own fragment is replaced' );
	assert.equal( withRoute( url, '*', STATE ), url, 'the entry route leaves the url' );
	const rows = [ { slug: 'home', route: 'home', postType: 'page' }, { slug: 'shop', route: 'shop', postType: 'page' } ];
	assert.equal( surfaceReach( { key: 'shop', entry: {}, skel: null, rows, routing: STATE } ).hash, '#@state/page=shop' );
	assert.equal( surfaceReach( { key: 'home', entry: {}, skel: null, rows, routing: STATE } ).hash, '' );
	assert.equal( surfaceReach( { key: 'form-x', entry: { draftRoute: '/shop' }, skel: null, rows, routing: STATE } ).hash, '#@state/page=shop' );
	assert.equal( surfaceReach( { key: 'x', entry: {}, skel: { route: 'shop' }, rows: [], routing: STATE } ).hash, '#@state/page=shop' );
} );

test( 'MUST FAIL (c): Fill reads a state-page surface at its route with or without an opener, and every other draft at the url it was given', () => {
	const url = 'http://127.0.0.1:5/Home.dc.html';
	assert.equal( readUrlOf( { url, opener: null, record: { route: 'shop' }, routing: STATE } ), `${ url }#@state/page=shop`, 'a page surface of a state-page draft' );
	assert.equal( readUrlOf( { url, opener: { route: 'about' }, record: { route: 'shop' }, routing: STATE } ), `${ url }#@state/page=about`, 'a state-driven surface: the opener route outranks the record' );
	assert.equal( readUrlOf( { url, opener: null, record: { route: '*' }, routing: STATE } ), url, 'the entry page' );
	assert.equal( readUrlOf( { url: `${ url }#/shop`, opener: null, record: { route: 'shop' }, routing: HASH } ), `${ url }#/shop`, 'a hash draft page surface keeps its url' );
	assert.equal( readUrlOf( { url, opener: { route: '/apply' }, record: null, routing: HASH } ), `${ url }#/apply`, 'a hash draft opener route is a hash' );
	assert.equal( readUrlOf( { url, opener: null, record: { route: 'shop' }, routing: null } ), url, 'no routing record: unchanged' );
} );

test( 'MUST FAIL (d): hash and files drafts keep their URLs and visit lists exactly', () => {
	const url = 'http://127.0.0.1:5/Site.dc.html';
	assert.equal( withRoute( url, '/apply' ), `${ url }#/apply` );
	assert.equal( withRoute( url, '/apply', HASH ), `${ url }#/apply` );
	assert.equal( withRoute( url, '/apply', FILES ), `${ url }#/apply` );
	const rows = [ { slug: 'about', route: 'about', postType: 'page' } ];
	assert.equal( surfaceReach( { key: 'about', entry: {}, skel: null, rows, routing: HASH } ).hash, '#/about' );
	assert.equal( surfaceReach( { key: 'about', entry: {}, skel: null, rows } ).hash, '#/about', 'no routing: unchanged' );
	const h = routeVisits( HASH, 'Site.dc.html' );
	assert.ok( h.list.every( ( x ) => ! x.hash.startsWith( '@state/' ) ) && h.list.length === HASH.routes.length );
	assert.deepEqual( visitOf( 'about', { entry: 'Site.dc.html', routing: () => HASH } ), { file: 'Site.dc.html', hash: 'about' } );
	const f = routeVisits( FILES, 'Home.dc.html' );
	assert.deepEqual( f.list.map( ( x ) => [ x.key, x.file, x.hash ] ), FILES.routes.map( ( r ) => [ r.key, r.key, '' ] ) );
	assert.deepEqual( visitOf( 'About.dc.html', { entry: 'Home.dc.html', routing: () => FILES } ), { file: 'About.dc.html', hash: '' } );
} );

test( 'MUST FAIL: a page-file route with a query string opens its file with that query (a template page reads its item from it)', () => {
	assert.deepEqual( visitOf( 'About.dc.html?id=first', { entry: 'Home.dc.html', routing: () => FILES } ), { file: 'About.dc.html', hash: '', query: 'id=first' } );
	assert.deepEqual( visitOf( '/About.dc.html?id=first#team', { entry: 'Home.dc.html', routing: () => FILES } ), { file: 'About.dc.html', hash: 'team', query: 'id=first' } );
	assert.match( visitOf( 'Nowhere.dc.html?id=first', { entry: 'Home.dc.html', routing: () => FILES } ).error, /not a page file of the export/ );
} );

test( 'MUST FAIL: openStateRoute puts the live logic in the route and the route renders; a missing component is refused', async () => {
	const { sb, page } = await open();
	try {
		await gotoDraft( page, sb.origin, ENTRY );
		assert.equal( await page.locator( '.page-home' ).count(), 1, 'the entry is the default page' );
		const r = await openStateRoute( page, { route: 'shop' } );
		assert.deepEqual( [ r.ok, r.reached, r.reason ], [ true, 1, null ] );
		assert.equal( await page.locator( '.page-shop' ).count(), 1 );
		assert.equal( await page.locator( '.page-home' ).count(), 0, 'the entry page is gone' );
		const none = await openStateRoute( page, { route: 'about', component: 'Nope', timeout: 500 } );
		assert.equal( none.ok, false );
		assert.match( none.reason, /no live instance/ );
		assert.equal( await page.locator( '.page-about' ).count(), 0, 'a refused route sets nothing' );
		assert.equal( await applyStateRoute( page ), null, 'a page with no state route in its address is left alone' );
	} finally {
		await sb.close();
	}
} );

test( 'MUST FAIL: the harness opens a state route from its hash', async () => {
	const { sb, page } = await open();
	try {
		await gotoDraft( page, sb.origin, ENTRY, { hash: stateRouteHash( 'about' ) } );
		assert.equal( await page.locator( '.page-about' ).count(), 1 );
		assert.equal( await page.locator( '.page-home' ).count(), 0 );
	} finally {
		await sb.close();
	}
} );

test( 'MUST FAIL: the sandbox opens a state route from its visit path', async () => {
	// Its own sandbox: the harness page of the tests above fakes the clock for its whole context, which stops a visit's scroll pass.
	const sb = await openSandbox( { folder: FOLDER, index: ENTRY, harPath, mode: 'replay', widths: [ 1440 ] } );
	try {
		const v = await sb.visit( `${ ENTRY }?#${ stateRouteHash( 'shop' ) }`, { width: 1440 } );
		assert.equal( await v.locator( '.page-shop' ).count(), 1 );
		assert.equal( await v.locator( '.page-home' ).count(), 0 );
		await v.close();
		const plain = await sb.visit( ENTRY, { width: 1440 } );
		assert.equal( await plain.locator( '.page-home' ).count(), 1, 'negative control: no fragment, the entry page' );
		await plain.close();
	} finally {
		await sb.close();
	}
} );

test( 'MUST FAIL (b, live): the skeleton stage reads a state-page route page, not an error row', async () => {
	const census = await staticCensus( { folder: FOLDER, entry: ENTRY, harPath } );
	const roots = surfaceRoots( { folder: FOLDER, census } );
	assert.deepEqual( roots.surfaces.map( ( s ) => [ s.slug, s.route ] ), [ [ 'page-home', 'home' ], [ 'page-shop', 'shop' ] ] );
	const r = await proposeSkeletons( { folder: FOLDER, harPath, surfaces: roots.surfaces, client: 'state-route-fixture', entry: ENTRY, routing: STATE, census } );
	assert.deepEqual( r.gaps, [], 'no route gap' );
	const shop = r.skeletons.find( ( s ) => 'page-shop' === s.surface );
	assert.ok( shop && ! shop.gap && shop.inventory.elements > 0, `page-shop read: ${ shop?.gap }` );
	const home = r.skeletons.find( ( s ) => 'page-home' === s.surface );
	assert.ok( home && ! home.gap && home.inventory.elements > 0, `page-home read: ${ home?.gap }` );
	// Each page is its own route's content: main + section + h1 on the home page, and the shop page's paragraph besides.
	assert.deepEqual( [ home.inventory.elements, shop.inventory.elements ], [ 3, 4 ] );
	assert.ok( shop.rows.some( ( x ) => 'sgs/text' === x.block ) && ! home.rows.some( ( x ) => 'sgs/text' === x.block ), 'only the shop page holds its paragraph' );
} );

test( 'MUST FAIL (c, live): Fill reads a state-page draft at its route through the state fragment, and the entry without it', async () => {
	const served = await serveDraft( FOLDER, { index: ENTRY } );
	try {
		const nodes = skeletonNodes( [ { name: 'sgs/container', draftRef: '.page-shop', attributes: {} } ] );
		const at = ( hash ) => readDraft( { url: withRoute( served.url, hash, STATE ), nodes, headless: true, sweep: false, external: true } );
		const shop = await at( 'shop' );
		assert.ok( ! shop.widths[ 1440 ][ '0:' ].missing, 'the shop page is read through the state route' );
		await assert.rejects( at( '*' ), /0 of 1 targets resolved/, 'negative control: the entry page holds no shop section' );
	} finally {
		await served.close();
	}
} );

// A page that answers the runtime's questions from a script: what `location.hash` is, whether the draft is mounted, and the
// value its state holds after a set (`taken`), with `instances` live copies of the router's component.
const stubPage = ( { hash = '', instances = 1, taken = ( v ) => v, mounted = true, log = [] } ) => ( {
	waitForFunction: async () => {},
	waitForTimeout: async () => {},
	evaluate: async ( fn, arg ) => {
		const text = String( fn );
		if ( arg?.op === 'set' ) {
			log.push( [ 'set', arg.comp, arg.patch ] );
			return instances;
		}
		if ( arg?.op === 'get' ) {
			return instances ? [ taken( log.findLast( ( l ) => 'set' === l[ 0 ] )?.[ 2 ].page ) ] : [];
		}
		if ( text.includes( '__dcRootName' ) ) {
			return 'Home';
		}
		if ( text.includes( 'window.location.hash' ) ) {
			log.push( [ 'hash', arg ] );
			return undefined;
		}
		if ( text.includes( 'location.hash' ) ) {
			return hash;
		}
		return text.includes( '#dc-root' ) ? mounted : 0;
	},
} );

test( 'MUST FAIL: a route the logic did not take, or one that drew nothing, is a named refusal and applyStateRoute throws it', async () => {
	const log = [];
	const ok = await openStateRoute( stubPage( { log } ), { route: 'shop' } );
	assert.deepEqual( [ ok.ok, log[ 0 ] ], [ true, [ 'set', 'Home', { page: 'shop' } ] ], 'set on the component the runtime names, with the adapter key' );
	const kept = await openStateRoute( stubPage( { taken: () => 'home' } ), { route: 'shop' } );
	assert.equal( kept.ok, false );
	assert.match( kept.reason, /did not take the route/ );
	const blank = await openStateRoute( stubPage( { mounted: false } ), { route: 'shop' } );
	assert.equal( blank.ok, false );
	assert.match( blank.reason, /rendered nothing/ );
	await assert.rejects( applyStateRoute( stubPage( { hash: '#@state/page=shop', instances: 0 } ) ), /state route shop was not reached/ );
	assert.equal( ( await applyStateRoute( stubPage( { hash: '#@state/page=shop' } ) ) ).ok, true );
	assert.equal( await applyStateRoute( stubPage( { hash: '#/shop' } ) ), null, 'a hash route is left to the draft' );
} );

test( 'MUST FAIL: moveToHash sets a state route through the logic and any other hash through location.hash', async () => {
	const log = [];
	await moveToHash( stubPage( { log } ), '@state/page=about' );
	assert.deepEqual( log.map( ( l ) => l[ 0 ] ), [ 'set' ] );
	const plain = [];
	await moveToHash( stubPage( { log: plain } ), '/about' );
	assert.deepEqual( plain, [ [ 'hash', '/about' ] ], 'a hash route is still assigned to location.hash' );
	await assert.rejects( moveToHash( stubPage( { instances: 0 } ), '@state/page=about' ), /state route about was not reached/ );
} );

test( 'MUST FAIL: the runtime census reaches every route of a state-page draft through its visits, and only the entry without them', async () => {
	const rows = ( c ) => c.rows.filter( ( r ) => [ 'template-element', 'sc-if' ].includes( r.kind ) );
	const all = await runCensus( { folder: FOLDER, entry: ENTRY, harPath, runtime: { visits: routeVisits( STATE, ENTRY ).census, widths: [ 1440 ], harPath } } );
	assert.deepEqual( rows( all ).filter( ( r ) => true === r.unreached ), [], 'the visits reach the shop and about pages' );
	const entry = await runCensus( { folder: FOLDER, entry: ENTRY, harPath, runtime: { visits: [ ENTRY ], widths: [ 1440 ], harPath } } );
	assert.deepEqual( rows( entry ).filter( ( r ) => true === r.unreached ).map( ( r ) => r.draftId ).sort( ( a, b ) => a.localeCompare( b, 'en', { numeric: true } ) ), [ 'Home:10', 'Home:10', 'Home:11', 'Home:12', 'Home:13', 'Home:14', 'Home:14', 'Home:15', 'Home:16' ], 'negative control: with the entry alone the other pages are unreached' );
} );

test( 'MUST FAIL (c, live): the skeleton inventory of a state-page route is read through the state fragment', async () => {
	const served = await serveDraft( FOLDER, { index: ENTRY } );
	const shots = fs.mkdtempSync( path.join( os.tmpdir(), 'state-route-inv-' ) );
	try {
		const inv = await readInventory( { url: withRoute( served.url, 'shop', STATE ), root: '.page-shop', shotsDir: shots } );
		assert.ok( inv.elements.length >= 3, `the shop section holds a section, a heading and a paragraph (${ inv.elements.length })` );
		await assert.rejects( readInventory( { url: withRoute( served.url, '*', STATE ), root: '.page-shop', shotsDir: shots } ), /page-shop|not found|no element/i, 'negative control: the entry page has no shop section' );
	} finally {
		await served.close();
	}
} );
