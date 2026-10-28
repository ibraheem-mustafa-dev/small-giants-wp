// Intake's openers honour a state's width bound (Spec 48 §3.4 step 1; lib/intake-openers.mjs, lib/state-reach.mjs), as Fill's
// do (tests/fill-reach-opener.test.mjs): on the fixture export tests/fixtures/intake-reach/ a modal under `sc-if value="{{
// lens.open }}"` with `state = { lens, w: window.innerWidth }`, a Step line whose width follows the step (100px + 40px a step)
// and a Layout line whose text and width follow `w` (300px from 1024, 200px from 768, 120px below), and no resize listener,
// so `w` changes only when a state sets it. The record's two open states bound `w` (">= 768", "< 768"), each opens its own
// step and sets `w` in its call (1400, 375). Intake reads one page at 1440, 375 and 768: each width is opened by the state
// that holds there, with `w` at the viewport's value. The replay HAR is recorded once into the OS temp folder.
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
import { openers, wayAt } from '../lib/intake-openers.mjs';
import { widthBounds, widthStateKeys } from '../lib/state-reach.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-reach' );
const INDEX = 'Home.dc.html';
const SIDE = { name: 'open, side-by-side', state_keys: { lens: '{open:true}', w: '>= 768' }, how_to_reach: 'L.setState({lens:{...L.state.lens, open:true, step:1}, w:1400})' };
const STACKED = { name: 'open, stacked (mobile)', state_keys: { lens: '{open:true}', w: '< 768' }, how_to_reach: 'L.setState({lens:{...L.state.lens, open:true, step:2}, w:375})' };
const RECORD = { ...JSON.parse( fs.readFileSync( path.join( FIXTURE, 'surfaces.json' ), 'utf8' ) ).records[ 0 ], states: [ { name: 'closed', state_keys: { lens: '{open:false}' }, how_to_reach: 'L.setState({lens:{...L.state.lens, open:false}})' }, SIDE, STACKED ] };
const W = new Map( [ [ 'Home', new Set( [ 'w' ] ) ] ] );

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

test( 'MUST FAIL: a state bounding a width key opens only at the widths inside it and never sets that key; an index range is no bound', () => {
	const [ s ] = surfaceOf( [ RECORD ] );
	const list = openers( s, null, W );
	assert.deepEqual( list.map( ( o ) => [ o.via, o.state, o.bounds ] ), [
		[ 'reach', 'open, side-by-side', [ { key: 'w', min: 768, max: null } ] ],
		[ 'reach', 'open, stacked (mobile)', [ { key: 'w', min: null, max: 767 } ] ],
	] );
	const keyed = openers( { ...s, states: [ { ...SIDE, state_keys: { lensOpen: true, w: '>= 768' } } ] }, null, W );
	assert.deepEqual( keyed.find( ( o ) => 'state' === o.via ).keys, { lensOpen: true }, 'the bound key is the viewport\'s, never a value to set' );
	assert.equal( wayAt( list, list[ 0 ], 1440 ), list[ 0 ] );
	assert.equal( wayAt( list, list[ 0 ], 375 ), list[ 1 ], 'at 375 the stacked state opens the surface' );
	assert.equal( wayAt( [ list[ 0 ] ], list[ 0 ], 375 ), null, 'no state holds at 375' );
	// Negative controls: a state with no bound is offered at every width with its keys as written; a range over a key the
	// draft does not write from the width (an accordion row) is no bound; only a width key's comparison is one.
	const plain = openers( { ...s, states: [ { name: 'open', state_keys: { menuOpen: true }, how_to_reach: 'L.setState({menuOpen:true})' } ] }, null, W );
	assert.deepEqual( plain.map( ( o ) => [ o.via, o.keys ?? null, 'bounds' in o ] ), [ [ 'state', { menuOpen: true }, false ], [ 'reach', null, false ] ] );
	assert.equal( wayAt( plain, plain[ 0 ], 375 ), plain[ 0 ] );
	const row = { name: 'row i open', state_keys: { acc: '0–3' }, how_to_reach: 'L.setState({ acc: 1 })' };
	assert.equal( openers( { ...s, states: [ row ] }, null, W ).some( ( o ) => o.bounds ), false );
	assert.deepEqual( widthBounds( row, W.get( 'Home' ) ), [] );
	assert.deepEqual( widthBounds( row ), [], 'with no width keys no key is a bound' );
	assert.deepEqual( widthBounds( row, new Set( [ 'acc' ] ) ), [ { key: 'acc', min: 0, max: 3 } ] );
} );

test( 'widthStateKeys reads the state keys each draft compares from its breakpoints, none for a window width', () => {
	const keys = widthStateKeys( [
		{ draft: 'Home.dc.html', thresholds: [ { variable: 'state.w' }, { variable: 'effW (state.w)' } ] },
		{ draft: 'Shop.dc.html', thresholds: [ { variable: 'w (window.innerWidth)' } ] },
		{ draft: 'Trade.dc.html', thresholds: [ { variable: 'state.w (as w)' }, { variable: 'state.bp' } ] },
	] );
	assert.deepEqual( [ ...keys ].map( ( [ k, v ] ) => [ k, [ ...v ] ] ), [ [ 'Home', [ 'w' ] ], [ 'Shop', [] ], [ 'Trade', [ 'w', 'bp' ] ] ] );
} );

// The intake skeleton entry and the saved inventory of the fixture modal under a record's states.
async function readWith( states ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-intake-width-' ) );
	try {
		const r = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: surfaceOf( [ { ...RECORD, states } ] ), client: 'intake-reach-fixture', census, inventoriesDir: dir } );
		const [ m ] = r.skeletons;
		const file = path.join( dir, `${ m.surface }.json` );
		return { m, inv: fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null };
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
}
const widthsOf = ( inv, re ) => ( ( e ) => [ 375, 768, 1440 ].map( ( w ) => e.box[ w ]?.w ?? null ) )( inv.elements.find( ( x ) => re.test( x.words || '' ) ) );

test( 'MUST FAIL: intake reads the stacked layout at 375 and the side-by-side one at 768 and 1440, each width opened by its own state with w at the viewport\'s value', async () => {
	const { m, inv } = await readWith( RECORD.states );
	assert.equal( m.gap, undefined, m.gap );
	assert.equal( m.opened.state, 'open, side-by-side' );
	assert.deepEqual( m.opened.statesAt, { 375: 'open, stacked (mobile)' } );
	assert.deepEqual( widthsOf( inv, /^Layout / ), [ 120, 200, 300 ], 'stacked at 375; w is 768 at 768, never the call\'s 1400' );
	assert.deepEqual( widthsOf( inv, /^Step / ), [ 180, 140, 140 ], 'the stacked state\'s step at 375, the side-by-side state\'s at 768 and 1440' );
} );

test( 'MUST FAIL: a width where the state that holds there does not open the surface is read at the nearest width that opens', async () => {
	// The stacked state's call closes the modal: 375 renders nothing of its own, so it is read at 768.
	const shut = { ...STACKED, how_to_reach: 'L.setState({lens:{...L.state.lens, open:false}})' };
	const { m, inv } = await readWith( [ SIDE, shut ] );
	assert.equal( m.gap, undefined, m.gap );
	assert.deepEqual( [ m.opened.at, m.opened.readAt ], [ [ 1440, 768 ], { 375: 768 } ] );
	assert.deepEqual( widthsOf( inv, /^Layout / ), [ 200, 200, 300 ] );
	assert.equal( m.opened.statesAt, undefined, 'no width is opened by another state' );
} );
