// A drawer that is a sticky rail at wide widths (lib/intake-skeletons.mjs::proposeSkeletons, restFailsAt, Spec 48 §3.4 step 1):
// the fixture export tests/fixtures/intake-skeletons-rail/ draws its filter rail at 1060px and above and, below that, only
// once the Filter button sets `filtersOpen`; the draft polls its own width (`measure()` every 120ms). The root renders at
// rest at 1440, so the read must still open the drawer at 375 and 768 through its width-bound way, and read the rail at 1440
// through the way that holds there. Tests marked MUST FAIL fail before the rule (the 375px read found no element).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus } from '../lib/intake-census.mjs';
import { surfaceRoots, proposeSkeletons } from '../lib/intake-skeletons.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-skeletons-rail' );
const INDEX = 'Home.dc.html';
let run;
let off;
let census;
let inventories;

const read = ( dir, slug ) => JSON.parse( fs.readFileSync( path.join( dir, `${ slug }.json` ), 'utf8' ) );

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	const harPath = path.join( os.tmpdir(), 'sgs-intake-skeletons-rail-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
	census = await staticCensus( { folder: FIXTURE, entry: INDEX, harPath } );
	const { surfaces } = surfaceRoots( { folder: FIXTURE, census } );
	inventories = fs.mkdtempSync( path.join( os.tmpdir(), 'rail-inv-' ) );
	run = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces, client: 'rail-fixture', census, propose: null, inventoriesDir: inventories } );
	off = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces, client: 'rail-fixture', census, propose: null, inventoriesDir: fs.mkdtempSync( path.join( os.tmpdir(), 'rail-off-' ) ), openStates: false } );
} );

test( 'MUST FAIL: a rail that is a drawer below 1060px is read open at 375 and 768 and as the rail at 1440, whatever the width polling writes', () => {
	const s = run.skeletons.find( ( x ) => 'filter-rail-drawer' === x.surface );
	assert.equal( s.gap, undefined, s.gap );
	assert.deepEqual( run.gaps, [] );
	assert.deepEqual( [ ...s.opened.at ].sort( ( a, b ) => a - b ), [ 375, 768, 1440 ] );
	assert.equal( s.opened.state, 'drawer open', 'the narrow widths are read by the drawer\'s own way' );
	assert.deepEqual( s.opened.statesAt, { 1440: 'rail' }, '1440 is read by the rail\'s way' );
	const inv = read( inventories, 'filter-rail-drawer' );
	const root = inv.elements[ 0 ];
	assert.equal( 'aside', root.tag );
	assert.deepEqual( root.visible, { 375: true, 768: true, 1440: true } );
	const close = inv.elements.find( ( e ) => 'button' === e.tag && /Close filters/.test( e.snippet ) );
	assert.deepEqual( close.visible, { 375: true, 768: true, 1440: false }, 'the close button shows in the open drawer only' );
} );

test( 'negative control: with opening switched off the same surface is the old failure, nothing at 375px', () => {
	const s = off.skeletons.find( ( x ) => 'filter-rail-drawer' === x.surface );
	assert.match( s.gap, /375px/ );
} );
