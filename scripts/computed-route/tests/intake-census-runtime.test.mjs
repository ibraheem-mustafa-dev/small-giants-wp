// Spec 48 FR-48-24, lib/intake-census-runtime.mjs: the construct census's runtime pass. The census fixture
// (tests/fixtures/intake-census/export/) runs at 375/768/1440 under the sandbox and the rest-mode harness: its
// `neverCalled` double-click handler, which no render calls, is listed and marked `unreached` (the fifth FR-48-24
// control), and a census without the static pass cannot list it at all. The runtime fixture
// (tests/fixtures/intake-census/runtime-export/) holds a handler the render calls (onAnimationStart), a scroll listener
// the scroll pass fires, an sc-if true only at 1440 and one true only at 375, an sc-if never true, and a setTimeout
// called through an alias the static pass cannot see (a `runtime` row). Replay HARs are recorded once into the OS temp
// folder (the first run needs the network).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus, runCensus, applyRuntime } from '../lib/intake-census.mjs';
import { groupVisits, TRACED_KINDS } from '../lib/intake-census-runtime.mjs';
import { REGISTRY_FILE } from '../lib/intake-registry.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.join( HERE, 'fixtures', 'intake-census' );
const EXPORT = path.join( ROOT, 'export' );
const RUNTIME = path.join( ROOT, 'runtime-export' );
const ENTRY = 'Home.dc.html';
const KINDS = Object.keys( JSON.parse( fs.readFileSync( REGISTRY_FILE, 'utf8' ) ) );
const full = () => Object.fromEntries( KINDS.map( ( k ) => [ k, { module: 'lib/fixture-readers.mjs', fn: 'readAny' } ] ) );
const fx = {};

async function prepare( folder ) {
	const { manifestHash } = recheckManifest( folder );
	const harPath = path.join( os.tmpdir(), 'sgs-intake-census-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder, index: ENTRY, harPath } );
	}
	return { harPath, census: await staticCensus( { folder, entry: ENTRY, harPath } ) };
}

// FR-48-24's fifth control over a census result: the fixture handler no render calls must be listed and unreached.
const control5 = ( rows ) => {
	const row = rows.find( ( r ) => 'handler' === r.kind && 'neverCalled' === r.detail.method );
	if ( ! row ) {
		return [ 'the uncalled handler neverCalled is not listed' ];
	}
	return true === row.unreached ? [] : [ `the uncalled handler neverCalled is listed with unreached ${ row.unreached }` ];
};

test.before( async () => {
	fx.base = await prepare( EXPORT );
	fx.rt = await prepare( RUNTIME );
	fx.full = await runCensus( { folder: EXPORT, entry: ENTRY, census: fx.base.census, registry: full(), root: ROOT, runtime: { harPath: fx.base.harPath } } );
	fx.run = await runCensus( { folder: RUNTIME, entry: ENTRY, census: fx.rt.census, registry: full(), root: ROOT, runtime: { harPath: fx.rt.harPath, widths: [ 375, 1440 ] } } );
} );

const row = ( res, id ) => res.rows.find( ( r ) => r.id === id );

test( 'control 5: the handler no render calls is listed and unreached at 375, 768 and 1440; the census passes', () => {
	assert.deepEqual( control5( fx.full.rows ), [] );
	assert.equal( fx.full.pass, true, fx.full.problems.join( '\n' ) );
	assert.deepEqual( fx.full.runtime.perVisit.map( ( p ) => [ p.visit, p.width ] ), [ [ ENTRY, 375 ], [ ENTRY, 768 ], [ ENTRY, 1440 ] ] );
	assert.deepEqual( fx.full.runtime.gaps, [] );
	const h = row( fx.full, 'handler@Home:7/template:onDoubleClick' );
	assert.deepEqual( [ h.source, h.unreached, h.detail.method ], [ 'static', true, 'neverCalled' ] );
} );

test( 'MUST FAIL (control 5): with the static pass removed the census cannot list the uncalled handler', async () => {
	const noStatic = { rows: [], gaps: [], sources: fx.base.census.sources, counts: [] };
	const res = await runCensus( { folder: EXPORT, entry: ENTRY, census: noStatic, registry: full(), root: ROOT, runtime: { harPath: fx.base.harPath, widths: [ 1440 ] } } );
	assert.deepEqual( control5( res.rows ), [ 'the uncalled handler neverCalled is not listed' ] );
	assert.ok( res.rows.length && res.rows.every( ( r ) => 'runtime' === r.source ), 'only runtime rows are left' );
	assert.ok( ! res.rows.some( ( r ) => 'handler' === r.kind ), 'a runtime-only census lists no handler at all' );
} );

test( 'the fixture split: what ran is both, what never ran stays static and unreached', () => {
	const pick = ( ids ) => ids.map( ( id ) => [ id, row( fx.full, id ).source, row( fx.full, id ).unreached ] );
	assert.deepEqual( pick( [ 'timer@Home:js:55:14', 'observer@Home:js:56:15', 'waapi@Home:js:68:4', 'getter@Home:js:41:2', 'sc-if@Home:13', 'dc-import@Home:14', 'sc-for@Home:10', 'helmet-script@Home:2' ] ),
		[ [ 'timer@Home:js:55:14', 'both', false ], [ 'observer@Home:js:56:15', 'both', false ], [ 'waapi@Home:js:68:4', 'both', false ], [ 'getter@Home:js:41:2', 'both', false ],
			[ 'sc-if@Home:13', 'both', false ], [ 'dc-import@Home:14', 'both', false ], [ 'sc-for@Home:10', 'both', false ], [ 'helmet-script@Home:2', 'both', false ] ] );
	assert.deepEqual( pick( [ 'sc-if@Home:15', 'dc-import@Home:16', 'template-element@Panel:0', 'handler@Home:6/template:onClick' ] ),
		[ [ 'sc-if@Home:15', 'static', true ], [ 'dc-import@Home:16', 'static', true ], [ 'template-element@Panel:0', 'static', true ], [ 'handler@Home:6/template:onClick', 'static', true ] ] );
	assert.ok( fx.full.rows.filter( ( r ) => TRACED_KINDS.includes( r.kind ) ).every( ( r ) => 'boolean' === typeof r.unreached ), 'every traced row is decided' );
} );

test( 'MUST FAIL: a handler the render calls is both; a click handler nothing clicks stays unreached', () => {
	assert.deepEqual( [ row( fx.run, 'handler@Home:3/template:onAnimationStart' ).source, row( fx.run, 'handler@Home:3/template:onAnimationStart' ).unreached ], [ 'both', false ] );
	assert.deepEqual( [ row( fx.run, 'handler@Home:js:46:4/addEventListener:scroll' ).source, row( fx.run, 'handler@Home:js:46:4/addEventListener:scroll' ).unreached ], [ 'both', false ] );
	assert.deepEqual( [ row( fx.run, 'handler@Home:10/template:onClick' ).source, row( fx.run, 'handler@Home:10/template:onClick' ).unreached ], [ 'static', true ] );
} );

test( 'MUST FAIL: an sc-if false at one width and true at another is reached; one never true is unreached', () => {
	const at = ( id ) => fx.run.runtime.sightings.filter( ( s ) => s.id === id ).map( ( s ) => s.width );
	assert.deepEqual( at( 'sc-if@Home:4' ), [ 1440 ], 'wide: rendered at 1440 only' );
	assert.deepEqual( at( 'sc-if@Home:6' ), [ 375 ], 'narrow: rendered at 375 only' );
	assert.equal( row( fx.run, 'sc-if@Home:4' ).unreached, false );
	assert.equal( row( fx.run, 'sc-if@Home:6' ).unreached, false );
	assert.deepEqual( [ row( fx.run, 'sc-if@Home:8' ).source, row( fx.run, 'sc-if@Home:8' ).unreached ], [ 'static', true ] );
} );

test( 'MUST FAIL: a timer the static pass cannot see (an aliased setTimeout) becomes a runtime row', () => {
	const extra = fx.run.rows.filter( ( r ) => 'runtime' === r.source );
	assert.deepEqual( extra.map( ( r ) => [ r.id, r.detail.fn, r.unreached ] ), [ [ 'timer@Home:js:48:4', 'setTimeout', false ] ] );
	assert.deepEqual( fx.run.runtime.runtimeOnly.map( ( r ) => r.draftId ), [ 'Home:js:48:4' ] );
	assert.equal( fx.run.pass, true, fx.run.problems.join( '\n' ) );
} );

test( 'applyRuntime: a trace gap leaves the row undecided with its reason, never a silent unreached (R-48-3)', () => {
	const rows = [ { id: 'handler@A:1/template:onClick', kind: 'handler', draftId: 'A:1', component: 'A', detail: { wiring: 'template', event: 'onClick' }, source: 'static', unreached: null },
		{ id: 'getter@A:js:3:2', kind: 'getter', draftId: 'A:js:3:2', component: 'A', detail: { name: 'x' }, source: 'static', unreached: null } ];
	const out = applyRuntime( rows, { sightings: [], kinds: TRACED_KINDS, traceGaps: [ { id: 'handler@A:1/template:onClick', error: 'wires no function' } ] } );
	assert.deepEqual( out.map( ( r ) => [ r.id, r.unreached, r.traceGap ?? null ] ), [ [ 'handler@A:1/template:onClick', null, 'wires no function' ], [ 'getter@A:js:3:2', true, null ] ] );
} );

test( 'groupVisits: one page per file, routes kept in order and deduplicated', () => {
	assert.deepEqual( groupVisits( [ 'A.dc.html', 'A.dc.html#about', { file: 'B.dc.html' }, 'A.dc.html#about', 'A.dc.html#/x' ], 'A.dc.html' ), [
		{ file: 'A.dc.html', visits: [ { label: 'A.dc.html', hash: '' }, { label: 'A.dc.html#about', hash: 'about' }, { label: 'A.dc.html#/x', hash: '/x' } ] },
		{ file: 'B.dc.html', visits: [ { label: 'B.dc.html', hash: '' } ] } ] );
} );
