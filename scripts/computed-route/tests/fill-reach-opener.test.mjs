// Fill's reach opener (lib/fill-open.mjs::stateOpener `ways`, ::openState, ::openerSource) on the fixture export
// tests/fixtures/intake-reach/: a modal under `sc-if value="{{ lens.open }}"` with `state = { lens: { open: false, step:
// 0 }, w: window.innerWidth }` and a Layout line (side or stacked) from `w`. The handoff record gives two open states whose
// state_keys are descriptions (`{"lens":"{open:true}","w":">= 768"}` and `"< 768"`), so no key can be set directly
// and only the reach opener opens the surface. Each state's how_to_reach setState call is run
// on the component's logic at the widths its bound holds, with `w` put back to the viewport's value after the call.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { openHarness, settleRest } from '../lib/intake-harness.mjs';
import { readDraftState } from '../lib/intake-state.mjs';
import { stateOpener, openState, openerSource, waysAt, openedAt, usableKeys } from '../lib/fill-open.mjs';
import { widthBounds, fitsWidth } from '../lib/state-reach.mjs';
import { plainState } from '../lib/state-openers.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-reach' );
const INDEX = 'Home.dc.html';

const SIDE = { name: 'open, side-by-side', state_keys: { lens: '{open:true}', w: '>= 768' }, how_to_reach: 'Tap Choose lenses; L.setState({lens:{...L.state.lens, open:true, step:1}, w:1400})', sc_if_tpl_ids: [] };
const STACKED = { name: 'open, stacked (mobile)', state_keys: { lens: '{open:true}', w: '< 768' }, how_to_reach: 'L.setState({lens:{...L.state.lens, open:true, step:2}, w:375})', sc_if_tpl_ids: [] };
const RECORD = { id: 'S-01', dc: 'Home', kind: 'modal', route: '*', states: [ { name: 'closed', state_keys: { lens: '{open:false}' }, how_to_reach: 'L.setState({lens:{...L.state.lens, open:false}})' }, SIDE, STACKED ] };
const NO_CALL = { ...RECORD, states: RECORD.states.map( ( s ) => ( { ...s, how_to_reach: 'Tap Choose lenses' } ) ) };
// The manifest entry names one of the two open states (the walker state map keeps one state per breakpoint pair).
const ENTRY = { states: { 'open, side-by-side': null } };
const SKELETON = { id: 'S-01', root: { viaState: true } };
const FACTS = { state: { Home: { keys: [ 'lens', 'w' ], widthKeys: [] } } };
// The width keys the export's breakpoints give (lib/state-reach.mjs::widthStateKeys): Home writes w from the width.
const WK = new Set( [ 'w' ] );
const W = new Map( [ [ 'Home', WK ] ] );
const opener = ( record = RECORD ) => stateOpener( { entry: ENTRY, skeleton: SKELETON, record, facts: FACTS, rootComponent: null, widthKeys: W } );

let harPath;
test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-reach-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
} );

// The open fixture page at a width, the runtime settled.
async function pageAt( width ) {
	const h = await openHarness( { folder: FIXTURE, index: INDEX, harPath, file: INDEX, hash: '', width } );
	await settleRest( h.page, h.options );
	return h;
}
const dialogText = ( page ) => page.evaluate( () => document.querySelector( '[role=dialog]' )?.textContent.replace( /\s+/g, ' ' ).trim() ?? null );

test( 'widthBounds reads a comparison or range as whole-pixel bounds; plainState is false for a described value', () => {
	assert.deepEqual( widthBounds( SIDE, WK ), [ { key: 'w', min: 768, max: null } ] );
	assert.deepEqual( widthBounds( STACKED, WK ), [ { key: 'w', min: null, max: 767 } ] );
	assert.deepEqual( widthBounds( { state_keys: { w: '> 1059', bp: '768–1023', x: '<= 500px', menuOpen: true, lens: '{open:true}' } }, new Set( [ 'w', 'bp', 'x', 'lens' ] ) ), [ { key: 'w', min: 1060, max: null }, { key: 'bp', min: 768, max: 1023 }, { key: 'x', min: null, max: 500 } ] );
	assert.equal( fitsWidth( widthBounds( SIDE, WK ), 768 ), true );
	assert.equal( fitsWidth( widthBounds( SIDE, WK ), 767 ), false );
	assert.equal( fitsWidth( widthBounds( STACKED, WK ), 767 ), true );
	assert.equal( fitsWidth( widthBounds( STACKED, WK ), null ), true, 'an unknown width fits any state' );
	assert.equal( plainState( SIDE ), false );
	assert.equal( plainState( { state_keys: { menuOpen: true } } ), true );
	assert.deepEqual( usableKeys( { w: '768–1023' }, null, WK ).dropped, [ { key: 'w', why: 'a width bound the viewport holds, not a value' } ] );
} );

test( 'MUST FAIL: a state whose keys are all descriptions opens through its setState call, each state at the widths its bound holds', () => {
	const o = opener();
	assert.deepEqual( o.refused, [] );
	assert.equal( o.state, 'open, side-by-side' );
	assert.deepEqual( o.ways.map( ( w ) => [ w.via, w.state ] ), [ [ 'reach', 'open, side-by-side' ], [ 'reach', 'open, stacked (mobile)' ] ] );
	assert.deepEqual( o.calls, [ { ident: 'L', args: '{lens:{...L.state.lens, open:true, step:1}, w:1400}' } ] );
	assert.deepEqual( waysAt( o, 375 ).map( ( w ) => w.state ), [ 'open, stacked (mobile)' ] );
	assert.deepEqual( waysAt( o, 1440 ).map( ( w ) => w.state ), [ 'open, side-by-side' ] );
	// Negative control: a bounded state whose other keys differ is not the named state at another breakpoint.
	const other = { ...STACKED, state_keys: { lens: '{open:true, step:2}', w: '< 768' } };
	assert.deepEqual( opener( { ...RECORD, states: [ SIDE, other ] } ).ways.map( ( w ) => w.state ), [ 'open, side-by-side' ] );
	// Precedence: a state of plain keys tries them before its call; a described state tries the call first.
	const plain = stateOpener( { entry: { states: { open: null } }, skeleton: SKELETON, record: { ...RECORD, states: [ { name: 'open', state_keys: { lens: { open: true, step: 3 } }, how_to_reach: 'L.setState({lens:{open:true, step:4}})' } ] }, facts: FACTS, rootComponent: null, widthKeys: W } );
	assert.deepEqual( plain.ways.map( ( w ) => w.via ), [ 'state', 'reach' ] );
	const mixed = stateOpener( { entry: { states: { open: null } }, skeleton: SKELETON, record: { ...RECORD, states: [ { name: 'open', state_keys: { lens: { open: true, step: 3 }, w: '>= 768' }, how_to_reach: 'L.setState({lens:{open:true, step:4}, w:1400})' } ] }, facts: FACTS, rootComponent: null, widthKeys: W } );
	assert.deepEqual( mixed.ways.map( ( w ) => w.via ), [ 'reach', 'state' ], 'a state holding a width bound tries its call first' );
	// Negative control: with no setState call the described state is refused as before.
	const none = opener( NO_CALL );
	assert.equal( none.state, null );
	assert.match( none.refused[ 0 ].reason, /no usable state key \(lens: a placeholder or description, not a value; w: a width bound the viewport holds, not a value\) and no setState call/ );
} );

test( 'openedAt maps each read width to the way that opened it', () => {
	const o = opener();
	assert.deepEqual( openedAt( o, { 375: { ok: true, state: 'open, stacked (mobile)', via: 'reach' }, 768: { ok: false, state: 'open, side-by-side', via: 'reach' }, 1440: { ok: true, state: 'open, side-by-side', via: 'reach' } } ), { 375: 1, 1440: 0 } );
} );

test( 'MUST FAIL: openState renders the modal at each width through the state that holds there, the width key kept at the viewport\'s value', async () => {
	const o = opener();
	for ( const [ width, state, text ] of [ [ 375, 'open, stacked (mobile)', 'Step 2 Layout stacked' ], [ 800, 'open, side-by-side', 'Step 1 Layout side' ] ] ) {
		const h = await pageAt( width );
		try {
			assert.equal( await dialogText( h.page ), null, 'the modal is closed at rest' );
			const v = await openState( h.page, o, width );
			assert.equal( v.ok, true, v.reason );
			assert.equal( v.state, state );
			assert.equal( v.via, 'reach' );
			assert.match( await dialogText( h.page ), new RegExp( `Choose your lenses ${ text }` ) );
			assert.deepEqual( await readDraftState( h.page, { component: 'Home', key: 'w' } ), [ width ], 'the call\'s w is put back to the viewport\'s' );
		} finally {
			await h.close();
		}
	}
} );

test( 'a width no state holds is refused naming the bounds; a call the logic throws on is refused naming the call', async () => {
	const h = await pageAt( 1440 );
	try {
		const only = stateOpener( { entry: { states: { 'open, stacked (mobile)': null } }, skeleton: SKELETON, record: { ...RECORD, states: [ STACKED ] }, facts: FACTS, rootComponent: null, widthKeys: W } );
		const v = await openState( h.page, only, 1440 );
		assert.equal( v.ok, false );
		assert.match( v.reason, /no state of S-01 holds at 1440px \("open, stacked \(mobile\)": w <= 767\)/ );
		const bad = stateOpener( { entry: ENTRY, skeleton: SKELETON, record: { ...RECORD, states: [ { ...SIDE, how_to_reach: 'L.setState(L.nope.x)' } ] }, facts: FACTS, rootComponent: null, widthKeys: W } );
		const t = await openState( h.page, bad, 1440 );
		assert.equal( t.ok, false );
		assert.match( t.reason, /L\.setState\(L\.nope\.x\) at w >= 768 reached no live Home on the entry page/ );
	} finally {
		await h.close();
	}
} );

test( 'MUST FAIL: the walker config opens the way Fill opened at that width (else the first that holds) in the real page', async () => {
	const o = opener();
	const open = new Function( `return ( ${ openerSource( { ...o, openedAt: { 1440: 0 } } ) } );` )();
	for ( const [ width, text ] of [ [ 375, 'Step 2 Layout stacked' ], [ 1440, 'Step 1 Layout side' ] ] ) {
		const h = await pageAt( width );
		try {
			await open( { page: h.page } );
			assert.match( await dialogText( h.page ), new RegExp( text ) );
			assert.deepEqual( await readDraftState( h.page, { component: 'Home', key: 'w' } ), [ width ] );
		} finally {
			await h.close();
		}
	}
} );
