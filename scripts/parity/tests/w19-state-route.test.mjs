// Walker Track W W19. A state-page draft (Spec 48 FR-48-26: `go(page)` sets `state.page`) has no URL for a route: the walker
// config carries the route as the fragment `#@state/page=<route>`, and the helpers' goto sets it on the draft's live logic.
// The full checks' load entrances reload the page (lib/entrances.mjs::sampleEntrances), and a reload brings such a draft
// back to its entry page with the fragment still in the address, so every state after it measured and shot the draft's home
// page against the live surface. The reload now sets the route again through the helpers' `route`.
// The walk runs the real walker (full checks, headless) on the state-page fixture of tests/state-route.test.mjs, served with
// its runtime; the live side is a plain page (no fragment), the negative control.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath, pathToFileURL } from 'url';
import { serveDraft } from '../../computed-route/lib/draft.mjs';
import { sampleEntrances } from '../lib/entrances.mjs';
import { makeHelpers } from '../lib/helpers.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const WALKER = path.join( HERE, '..', 'draft-live-walk.mjs' );
const FIXTURE = path.join( HERE, '..', '..', 'computed-route', 'tests', 'fixtures', 'state-route' );
const LIVE = '<!doctype html><html><body style="margin:0;font-family:system-ui,sans-serif"><main><section class="page-shop"><h1>The shop</h1><p>Frames and lenses.</p></section></main></body></html>';

let dir;
let served;
let report;
const runOf = ( state ) => report.runs.find( ( r ) => r.state === state );
before( async () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w19-' ) );
	served = await serveDraft( FIXTURE, { index: 'Home.dc.html' } );
	fs.writeFileSync( path.join( dir, 'live.html' ), LIVE );
	fs.writeFileSync( path.join( dir, 'w19.mjs' ), `export default {
	name: 'w19', widths: [ 800 ], links: false, autoScroll: false,
	auto: { root: { draft: '.page-shop', live: '.page-shop' } },
	draft: { url: ${ JSON.stringify( `${ served.url }#@state/page=shop` ) } },
	live: { url: ${ JSON.stringify( pathToFileURL( path.join( dir, 'live.html' ) ).href ) } },
	states: [ { name: 'default', settle: 100 } ],
	pairs: [ { name: 'shop', draft: '.page-shop h1', live: '.page-shop h1', box: [], structure: false } ],
};
` );
	const out = path.join( dir, 'out' );
	// Run without blocking: the draft is served from this process.
	const r = await promisify( execFile )( process.execPath, [ WALKER, path.join( dir, 'w19.mjs' ), '--out', out, '--headless', '--no-review' ], { encoding: 'utf8', timeout: 170000, maxBuffer: 64 * 1024 * 1024 } ).catch( ( e ) => e );
	report = fs.existsSync( path.join( out, 'report.json' ) ) ? JSON.parse( fs.readFileSync( path.join( out, 'report.json' ), 'utf8' ) ) : { runs: [], failed: `${ r.stdout }\n${ r.stderr }` };
} );
after( async () => {
	await served?.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a full walk measures a state-page draft at its route after the load entrances reload it, not at its entry page', () => {
	const run = runOf( 'default' );
	assert.ok( run, report.failed );
	assert.ok( ! run.pairs.shop.draft.missing, 'the shop heading is on the draft page the walker measured' );
	assert.equal( run.pairs.shop.draft.text, 'The shop' );
	assert.equal( run.pairs.shop.live.text, 'The shop', 'negative control: the live page, loaded with no fragment, is measured as loaded' );
} );

// A page that records what the entrance reload asks of it: each evaluate's last argument (sampleIn's wait) and the order
// the reload, the route and the samples happen in.
const stubPage = ( log ) => ( {
	reload: async () => log.push( 'reload' ),
	title: async () => 'Page',
	waitForTimeout: async () => {},
	waitForLoadState: async () => {},
	goto: async ( url ) => log.push( `goto ${ url }` ),
	on: () => {},
	evaluate: async ( fn, arg ) => {
		if ( Array.isArray( arg ) ) {
			log.push( `sample wait=${ arg[ 4 ] } root=${ arg[ 0 ] }` );
			return { loops: [], blocks: {}, refs: {} };
		}
		log.push( `evaluate ${ String( fn ).slice( 0, 40 ) }` );
		return '';
	},
} );

test( 'MUST FAIL: the entrance reload sets the route again, sampling the route root from when it shows; with no root, after the route', async () => {
	const log = [];
	const route = async () => log.push( 'route' );
	await sampleEntrances( stubPage( log ), 'draft', { auto: { root: { draft: '.r' } } }, { route } );
	assert.deepEqual( log, [ 'reload', 'sample wait=15000 root=.r', 'route' ], 'the root is waited for while the route is set' );
	log.length = 0;
	await sampleEntrances( stubPage( log ), 'draft', { auto: { root: { draft: '.r' } }, entranceWait: 900 }, { route } );
	assert.equal( log[ 1 ], 'sample wait=900 root=.r', 'entranceWait bounds the wait' );
	log.length = 0;
	await sampleEntrances( stubPage( log ), 'draft', {}, { route } );
	assert.deepEqual( log, [ 'reload', 'route', 'sample wait=0 root=null' ], 'with no root the route is set before the page is sampled' );
} );

test( 'negative control: a page with no state route samples its entrances from the load, as before', async () => {
	const log = [];
	await sampleEntrances( stubPage( log ), 'draft', { auto: { root: { draft: '.r' } } } );
	assert.deepEqual( log, [ 'reload', 'sample wait=0 root=.r' ] );
} );

test( 'MUST FAIL: the helpers route only a draft loaded at a state route; a hash route, a file page and the live side are left alone', async () => {
	const at = async ( side, url ) => {
		const log = [];
		const h = makeHelpers( stubPage( log ), side, { cb: ( u ) => u, RESOLVE: '', onAction: null } );
		await h.goto( url ).catch( ( e ) => log.push( `threw ${ e.message }` ) );
		return { routed: h.routed, applied: log.some( ( l ) => /threw state route|location\.hash/.test( l ) ) };
	};
	// The stub answers location.hash with '', so a route set on it is read back as none: applyStateRoute then returns null
	// without throwing; what is asserted is whether the route was asked for.
	assert.deepEqual( ( await at( 'draft', 'http://x/#@state/page=shop' ) ).routed, true );
	assert.deepEqual( ( await at( 'draft', 'http://x/#/about' ) ).routed, false, 'a hash route is the draft\'s own' );
	assert.deepEqual( ( await at( 'draft', 'http://x/About.dc.html' ) ).routed, false, 'a page file carries no route' );
	assert.deepEqual( ( await at( 'live', 'http://x/#@state/page=shop' ) ).routed, false, 'the live side has no draft logic' );
	assert.equal( ( await at( 'draft', 'http://x/#@state/page=shop' ) ).applied, true, 'the route is read from the loaded page' );
	assert.equal( ( await at( 'draft', 'http://x/#/about' ) ).applied, false );
} );
