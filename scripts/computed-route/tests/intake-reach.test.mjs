// The reach opener (lib/intake-skeletons.mjs::openers, `via: 'reach'`) on the fixture export tests/fixtures/intake-reach/:
// a modal that renders only under `sc-if value="{{ lens.open }}"`, with `state = { lens: { open: false, step: 0 } }`,
// and a surfaces.json record whose open state's state_keys are a description ({"lens":"{open:true}"}) and whose
// how_to_reach carries the setState call. The plain-keys opener would set lens to the string "{open:true}"; the reach
// opener runs the draft's own setState on the component's logic inside the harness page. The replay HAR is recorded
// once into the OS temp folder (the first run needs the network).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus } from '../lib/intake-census.mjs';
import { openHarness, settleRest } from '../lib/intake-harness.mjs';
import { surfaceRoots, proposeSkeletons, openers, reachCalls, describeOpener } from '../lib/intake-skeletons.mjs';
import { reachDraftState, readDraftState, snapshotDraftState, restoreDraftState } from '../lib/intake-state.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-reach' );
const INDEX = 'Home.dc.html';
const CLIENT = 'intake-reach-fixture';
const RECORD = JSON.parse( fs.readFileSync( path.join( FIXTURE, 'surfaces.json' ), 'utf8' ) ).records[ 0 ];
const NO_CALL = { ...RECORD, states: RECORD.states.map( ( st ) => ( { ...st, how_to_reach: 'Tap Choose lenses' } ) ) };

let harPath;
let census;

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-reach-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
	census = await staticCensus( { folder: FIXTURE, entry: INDEX, harPath } );
} );

const surfaceOf = ( records ) => {
	const r = surfaceRoots( { folder: FIXTURE, census, records } );
	assert.deepEqual( r.gaps, [] );
	return r.surfaces;
};

test( 'reachCalls takes every <ident>.setState(...) call with its arguments balanced, and nothing else', () => {
	assert.deepEqual( reachCalls( 'L = dcLogic(\'X\'); L.setState({lens:{...L.state.lens, open:true, step:0}, w:1400})' ), [ { ident: 'L', args: '{lens:{...L.state.lens, open:true, step:0}, w:1400}' } ] );
	assert.deepEqual( reachCalls( 'L.setState({page:\'a)\'}) with id, e.g. L.setState({page:\'b\', id:5})' ).map( ( c ) => c.args ), [ '{page:\'a)\'}', '{page:\'b\', id:5}' ] );
	assert.deepEqual( reachCalls( '…setState({lv:4})' ), [] );
	assert.deepEqual( reachCalls( 'L.setState({open:true' ), [] );
} );

test( 'a state with a non-value key tries reach first; a plain-keys state tries state first; no setState call adds no reach opener', () => {
	const [ s ] = surfaceOf( [ RECORD ] );
	assert.deepEqual( openers( s ).map( ( o ) => [ o.via, o.state ] ), [ [ 'reach', 'open' ], [ 'state', 'open' ] ] );
	assert.equal( describeOpener( openers( s )[ 0 ] ), 'reach "open" L.setState({lens:{...L.state.lens, open:true}})' );
	const plain = { ...s, states: [ { name: 'open', state_keys: { menuOpen: true }, how_to_reach: 'L.setState({menuOpen:true})' } ] };
	assert.deepEqual( openers( plain ).map( ( o ) => o.via ), [ 'state', 'reach' ] );
	// Negative control: a how_to_reach with no setState call gives only the plain-keys opener.
	const [ n ] = surfaceOf( [ NO_CALL ] );
	assert.deepEqual( openers( n ).map( ( o ) => o.via ), [ 'state' ] );
} );

test( 'MUST FAIL: the reach opener renders and marks a modal its state_keys cannot set; without a setState call it stays unrendered', async () => {
	const r = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: surfaceOf( [ RECORD ] ), client: CLIENT, census } );
	const [ m ] = r.skeletons;
	assert.equal( m.gap, undefined, m.gap );
	assert.equal( m.opened.via, 'reach' );
	assert.equal( m.root.tag, 'div' );
	assert.ok( m.rows.some( ( x ) => 'Choose your lenses' === x.words ), 'the modal\'s heading is read' );
	const n = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: surfaceOf( [ NO_CALL ] ), client: CLIENT, census } );
	assert.match( n.skeletons[ 0 ].gap, /not rendered.*still not rendered after state "open"/ );
} );

test( 'restoreDraftState puts back a key the reach opener\'s setState changed', async () => {
	const h = await openHarness( { folder: FIXTURE, index: INDEX, harPath, file: INDEX, hash: '', width: 1440 } );
	try {
		await settleRest( h.page, h.options );
		await snapshotDraftState( h.page );
		assert.equal( await reachDraftState( h.page, { component: 'Home', calls: reachCalls( RECORD.states[ 1 ].how_to_reach ) } ), 1 );
		assert.deepEqual( await readDraftState( h.page, { component: 'Home', key: 'lens' } ), [ { open: true, step: 0 } ] );
		assert.equal( await restoreDraftState( h.page ), 1 );
		assert.deepEqual( await readDraftState( h.page, { component: 'Home', key: 'lens' } ), [ { open: false, step: 0 } ] );
		// A call the logic throws on reaches nothing.
		assert.equal( await reachDraftState( h.page, { component: 'Home', calls: [ { ident: 'L', args: 'L.nope.x' } ] } ), 0 );
	} finally {
		await h.close();
	}
} );
