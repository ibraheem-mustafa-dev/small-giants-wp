// Proves the `default` judge of Fill's UNMAPPED rows (lib/confirm-live.mjs::judgeUnmapped): a row no setting writes is
// held as `default` only where the built page already paints the draft's value on that element at every width the row
// states, read from the walker's rest-state pair; the block's calibration page never decides it.
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';
import { judgeUnmapped, writeConfirmLive } from '../lib/confirm-live.mjs';

const row = ( over = {} ) => ( { node: 'cr-ref-f-1', block: 'sgs/container', slot: '', property: 'padding-left', value: '24px', state: null, reason: 'no-setting: sgs/container has no setting for padding-left', ...over } );
const pair = ( ref, styles, p = '' ) => ( { live: { trace: { ref, path: p }, styles }, diffs: [] } );
// The walk: one rest run per width, the element's live styles at each.
const walk = ( byWidth, state = 'rest' ) => ( { runs: Object.entries( byWidth ).map( ( [ w, styles ] ) => ( { state, width: Number( w ), pairs: { a: pair( 'cr-ref-f-1', styles ) } } ) ) } );
const at3 = ( styles ) => ( { 375: styles, 768: styles, 1440: styles } );

test( 'MUST FAIL: a row the built page paints at the draft value at every width is held as default; a parent-changed value is not', () => {
	const held = judgeUnmapped( [ row() ], walk( at3( { 'padding-left': '24px' } ) ) );
	assert.deepEqual( [ held.held.length, held.raised.length ], [ 1, 0 ] );
	assert.equal( held.held[ 0 ].heldReason, 'default' );
	// The grid cell: the draft's 24px, the built page's 0px at every width, stays raised with what the page paints.
	const cell = judgeUnmapped( [ row() ], walk( at3( { 'padding-left': '0px' } ) ) );
	assert.equal( cell.held.length, 0 );
	assert.match( cell.raised[ 0 ].liveWhy, /paints 0px/ );
} );

test( 'MUST FAIL: held only when every stated width agrees; one width off, or a value beyond the rendered tolerance, stays raised', () => {
	assert.equal( judgeUnmapped( [ row() ], walk( { 375: { 'padding-left': '8px' }, 768: { 'padding-left': '24px' }, 1440: { 'padding-left': '24px' } } ) ).raised.length, 1 );
	assert.equal( judgeUnmapped( [ row( { value: '26px' } ) ], walk( at3( { 'padding-left': '24px' } ) ) ).raised.length, 1 );
	// A per-width value is judged at its own widths only.
	const per = row( { value: JSON.stringify( { 768: '24px', 1440: '24px' } ) } );
	assert.equal( judgeUnmapped( [ per ], walk( { 375: { 'padding-left': '8px' }, 768: { 'padding-left': '24px' }, 1440: { 'padding-left': '24px' } } ) ).held.length, 1 );
	// A gap of `normal` is the 0 it paints.
	assert.equal( judgeUnmapped( [ row( { property: 'row-gap', value: '0px', reason: 'no-setting: x' } ) ], walk( at3( { 'row-gap': 'normal' } ) ) ).held.length, 1 );
} );

test( 'MUST FAIL: rows that are not a rest-state missing setting, or not read live, are never held', () => {
	const live = walk( at3( { 'padding-left': '24px' } ) );
	const why = ( r, w = live ) => judgeUnmapped( [ r ], w ).raised[ 0 ]?.liveWhy;
	assert.match( why( row( { state: 'hover' } ) ), /hover row/ );
	const noState = row();
	delete noState.state;
	assert.match( why( noState ), /records no state/ );
	assert.match( why( row( { reason: 'conflict: two writers' } ) ), /not a property/ );
	assert.match( why( row( { property: '(block)' } ) ), /not a property/ );
	assert.match( why( row( { node: 'cr-ref-f-2' } ) ), /not read live at 375: no-live-element/ );
	assert.match( why( row( { slot: '.sgs-container__inner' } ) ), /not read live/ );
	// Only the rest-state runs of the surface state map are read: an open run painting 24px holds nothing.
	const open = walk( at3( { 'padding-left': '24px' } ), 'open' );
	assert.equal( judgeUnmapped( [ row() ], { runs: [ ...open.runs, ...walk( at3( { 'padding-left': '0px' } ) ).runs ] }, { stateMap: { rest: null, open: 'open' } } ).held.length, 0 );
} );

test( 'MUST FAIL: writeConfirmLive judges the Fill report\'s UNMAPPED rows against the same walk and writes them beside the records', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'held-live-' ) );
	const fr = path.join( dir, 'fill-report.json' );
	fs.writeFileSync( fr, JSON.stringify( { confirm: [], unmapped: [ row(), row( { property: 'padding-right', value: '20px' } ) ] } ) );
	const out = writeConfirmLive( dir, fr, walk( at3( { 'padding-left': '24px', 'padding-right': '0px' } ) ) );
	assert.deepEqual( out.unmapped, { held: 1, raised: 1 } );
	const file = JSON.parse( fs.readFileSync( out.file, 'utf8' ) );
	assert.equal( file.unmapped.held[ 0 ].property, 'padding-left' );
	assert.equal( file.unmapped.raised[ 0 ].property, 'padding-right' );
} );
