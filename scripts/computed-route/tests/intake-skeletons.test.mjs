// Spec 48 §3.4 steps 1 and 2 at intake, FR-48-17, R-48-3: lib/intake-skeletons.mjs on the fixture export
// tests/fixtures/intake-skeletons/ (a sticky header with a looped nav and a pill CTA, a main whose page content sits in an
// sc-if, and a footer printing the render time from new Date()). Surface roots come from the fixture's surfaces.json,
// checked against the census; the inventory runs on the harness page inside the sandbox (the footer shows the harness
// clock, not the wall clock, and the sandbox saw no unlisted host); a missing root and a throwing proposal are gap rows.
// The fixture's replay HAR is recorded once into the OS temp folder (the first run needs the network).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus } from '../lib/intake-census.mjs';
import { HARNESS_DEFAULTS } from '../lib/intake-harness.mjs';
import { surfaceRoots, proposeSkeletons, unresolvedRows } from '../lib/intake-skeletons.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-skeletons' );
const INDEX = 'Home.dc.html';
const CLIENT = 'intake-skeletons-fixture';
const RECORDS = JSON.parse( fs.readFileSync( path.join( FIXTURE, 'surfaces.json' ), 'utf8' ) ).records;

let harPath;
let census;
let roots;
let real;

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-skeletons-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
	census = await staticCensus( { folder: FIXTURE, entry: INDEX, harPath } );
	roots = surfaceRoots( { folder: FIXTURE, census } );
	real = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: roots.surfaces, client: CLIENT } );
} );

const of = ( r, slug ) => r.skeletons.find( ( s ) => s.surface === slug ) ?? assert.fail( `no skeleton for ${ slug }` );

test( 'surface roots: every surfaces.json record is checked against the census and becomes a surface', () => {
	assert.deepEqual( roots.gaps, [] );
	assert.deepEqual( roots.surfaces.map( ( s ) => [ s.slug, s.kind, s.component, s.rootTpl, s.rootTag ] ), [
		[ 'site-header', 'header', 'Home', '1', 'header' ], [ 'footer', 'footer', 'Home', '17', 'footer' ], [ 'page-home', 'page', 'Home', '10', 'sc-if' ],
	] );
} );

test( 'MUST FAIL: a root id the census does not hold is a surface-root gap row, never a surface', () => {
	const records = [ ...RECORDS.slice( 0, 2 ), { ...RECORDS[ 2 ], template_tpl_id: '999' } ];
	const r = surfaceRoots( { folder: FIXTURE, census, records } );
	assert.deepEqual( r.surfaces.map( ( s ) => s.slug ), [ 'site-header', 'footer' ] );
	assert.equal( r.gaps.length, 1 );
	assert.equal( r.gaps[ 0 ].construct, 'surface-root' );
	assert.equal( r.gaps[ 0 ].draftId, 'Home:999' );
	assert.match( r.gaps[ 0 ].error, /999.*census does not hold/ );
} );

test( 'a census header or footer with no surfaces.json record of its kind is a surface-root gap row', () => {
	const r = surfaceRoots( { folder: FIXTURE, census, records: RECORDS.filter( ( x ) => 'footer' !== x.kind ) } );
	assert.deepEqual( r.gaps.map( ( g ) => [ g.construct, g.draftId ] ), [ [ 'surface-root', 'Home:17' ] ] );
	assert.match( r.gaps[ 0 ].error, /<footer>.*no footer record/ );
} );

test( 'MUST FAIL: the inventory runs on the harness page inside the sandbox, never a browser of its own', () => {
	assert.equal( real.runs.length, 1, 'the three surfaces share one page and route, so one sandbox run' );
	const run = real.runs[ 0 ];
	assert.ok( run.requests > 0, 'the sandbox saw the draft load' );
	assert.deepEqual( run.unlisted, [], 'no request to an unlisted host' );
	assert.deepEqual( run.proxyAttempts, [], 'nothing reached the trap proxy' );
	// The footer prints new Date(): the harness clock proves the read came from the harness page.
	const stamp = of( real, 'footer' ).rows.find( ( r ) => /^\d{4}-\d\d-\d\dT/.test( r.words ) ) ?? assert.fail( 'no footer row carries the render time' );
	assert.equal( stamp.words, new Date( HARNESS_DEFAULTS.clock ).toISOString() );
} );

test( 'every surface gets an inventory and a proposal row per element, keyed skeleton:<surface>:<key>', () => {
	assert.deepEqual( real.gaps, [] );
	for ( const s of real.skeletons ) {
		assert.equal( s.gap, undefined, `${ s.surface }: ${ s.gap }` );
		assert.ok( s.inventory.elements > 0 && s.rows.length > 0, `${ s.surface } has elements and rows` );
		assert.equal( s.inventory.checks.duplicateKeys, 0 );
		assert.deepEqual( Object.keys( s.inventory.checks.perWidthCounts ).sort(), [ '1440', '375', '768' ] );
		for ( const r of s.rows ) {
			assert.equal( r.rowId, `skeleton:${ s.surface }:${ r.key }` );
			assert.ok( r.candidates.length <= 3 );
			assert.equal( typeof r.confidence, 'number' );
		}
	}
	const header = of( real, 'site-header' );
	assert.equal( header.root.tag, 'header' );
	assert.equal( header.inventory.elements, 9, 'header, span, nav, three looped links, the CTA, its svg and path' );
	// The page root is an sc-if: its root is the element holding both sections it stamps (the main).
	const page = of( real, 'page-home' );
	assert.deepEqual( [ page.root.tag, page.root.viaCondition ], [ 'main', true ] );
	assert.ok( page.rows.some( ( r ) => 'Fresh food for busy kitchens' === r.words ) );
} );

test( 'MUST FAIL: a proposal that throws is a gap row for that surface, which keeps its entry', async () => {
	const facts = new Proxy( {}, { get: () => {
		throw new Error( 'facts unavailable' );
	} } );
	const header = roots.surfaces.filter( ( s ) => 'site-header' === s.slug );
	const r = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: header, client: CLIENT, facts } );
	assert.deepEqual( r.skeletons.map( ( s ) => [ s.surface, s.gap ] ), [ [ 'site-header', 'facts unavailable' ] ] );
	assert.deepEqual( r.gaps, [ { construct: 'skeleton', draftId: 'Home:1', error: 'site-header: facts unavailable' } ] );
} );

test( 'an sc-for root resolves to the element holding its copies; a root id the page does not hold is a gap row', async () => {
	const hidden = [ { ...roots.surfaces[ 0 ], slug: 'ghost', rootTpl: '4', selector: '[data-sgs-skeleton-root="ghost"]' } ];
	const r = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: hidden, client: CLIENT } );
	assert.equal( r.skeletons[ 0 ].gap, undefined, 'an sc-for root resolves to the element holding its copies' );
	assert.equal( r.skeletons[ 0 ].root.tag, 'nav' );
	// A page record naming only the page's first section reads the route's whole <main>; another kind keeps its root.
	const first = { ...roots.surfaces[ 2 ], rootTpl: '11' };
	const p = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: [ first, { ...first, kind: 'global', slug: 'first-section', selector: '[data-sgs-skeleton-root="first-section"]' } ], client: CLIENT } );
	assert.deepEqual( p.skeletons.map( ( s ) => [ s.surface, s.root.tag, s.root.viaMain ] ), [ [ 'page-home', 'main', true ], [ 'first-section', 'section', false ] ] );
	const none = [ { ...roots.surfaces[ 0 ], slug: 'nowhere', rootTpl: '998', selector: '[data-sgs-skeleton-root="nowhere"]' } ];
	const g = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: none, client: CLIENT } );
	assert.match( g.skeletons[ 0 ].gap, /998 is not in Home's stamped template/ );
	assert.equal( g.gaps.length, 1 );
} );

test( 'unresolvedRows lists unresolved rows and kept rows with no candidate, not removed ones', () => {
	const rows = [
		{ key: 'a', action: 'unresolved', candidates: [] }, { key: 'b', action: null, candidates: [] },
		{ key: 'c', action: 'remove', candidates: [] }, { key: 'd', action: null, candidates: [ { block: 'sgs/text' } ] },
	];
	assert.deepEqual( unresolvedRows( [ { surface: 'x', rows } ] ).map( ( r ) => [ r.surface, r.key ] ), [ [ 'x', 'a' ], [ 'x', 'b' ] ] );
} );
