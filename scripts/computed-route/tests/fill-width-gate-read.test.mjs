// An element the draft's script draws at some widths and not at others, with no sc-if to say so (Eye Care's top bar: its code
// builds the list of claims from the width, four on a wide screen, two on a tablet, eight in a phone's loop), is hidden at the
// tiers its live read finds it missing at (lib/fill-width-gate.mjs::shownByRead). Before it, all eight claims drew at every width
// and ran over each other.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { widthGateWrites } from '../lib/fill-width-gate.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const found = { styles: {}, words: 'x' };
const gone = { missing: true };
// Which widths each node's root target is drawn at: 0 everywhere, 1 on a tablet and a phone, 2 on a phone only, 3 nowhere, 4 everywhere.
const DRAWN = [ [ 375, 768, 1440 ], [ 375, 768 ], [ 375 ], [], [ 375, 768, 1440 ] ];
const readsOf = ( extra = {} ) => ( { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, Object.fromEntries( DRAWN.map( ( d, i ) => [ `${ i }:`, d.includes( w ) ? found : gone ] ) ) ] ) ), ...extra } );
const nodesOf = ( parents = DRAWN.map( () => null ) ) => DRAWN.map( ( d, index ) => ( { index, name: 'sgs/text', parent: parents[ index ], node: { draftRef: { tpl: `Root/10#${ index }` } }, children: [], targets: [ { id: `${ index }:`, slot: '' } ] } ) );
function run( { reads, parents } ) {
	const flat = DRAWN.map( ( d, i ) => ( { name: 'sgs/text', attributes: {}, innerBlocks: [], ref: `r${ i }` } ) );
	const r = widthGateWrites( { nodes: nodesOf( parents ), flat, refOf: ( n ) => n.ref, facts: null, db, scope: 'header', reads, entries: [], date: '2026-11-19' } );
	return { flat, ...r };
}

test( 'MUST FAIL: a claim the draft draws only on a tablet and a phone is hidden on desktop; one drawn only on a phone is hidden on tablet and desktop', () => {
	const r = run( { reads: readsOf() } );
	assert.deepEqual( r.flat[ 1 ].attributes, { sgsHideOnDesktop: true } );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnTablet: true, sgsHideOnDesktop: true } );
} );

test( 'negative control: an element drawn at every width, and one drawn at none, are left alone', () => {
	const r = run( { reads: readsOf() } );
	assert.deepEqual( r.flat[ 0 ].attributes, {} );
	assert.deepEqual( r.flat[ 3 ].attributes, {} );
	assert.deepEqual( r.flat[ 4 ].attributes, {} );
	assert.deepEqual( r.unmapped, [], 'no "shown at no width" row for an element drawn nowhere' );
} );

test( 'negative control: a surface read through a state opener hides nothing (its state renders at some widths by design)', () => {
	const r = run( { reads: readsOf( { opener: { widths: {} } } ) } );
	assert.deepEqual( r.flat.map( ( n ) => n.attributes ), DRAWN.map( () => ( {} ) ) );
} );

test( 'a child under an element the read already gates is not gated again (the parent hides it)', () => {
	const r = run( { reads: readsOf(), parents: [ null, null, 1, null, null ] } );
	assert.deepEqual( r.flat[ 1 ].attributes, { sgsHideOnDesktop: true } );
	assert.deepEqual( r.flat[ 2 ].attributes, {} );
} );

test( 'MUST FAIL: an element whose draft read failed is never gated, whatever its other reads say', () => {
	// Node 1 is read at 375 and 768 and missing at 1440; a failed read of it (a declared read that threw at 768) is no evidence.
	const failures = [ { id: '1:', owner: 1, width: 768, read: 'declared', reason: 'the devtools read found no element where the computed read found one' } ];
	const r = run( { reads: readsOf( { failures } ) } );
	assert.deepEqual( r.flat[ 1 ].attributes, {}, 'the node with a failed read is left alone' );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnTablet: true, sgsHideOnDesktop: true }, 'a node with no failed read is still gated' );
} );

test( 'MUST FAIL: a width at which the read found no element at all is not a width the nodes were read at', () => {
	// At 768 the draft rendered nothing (every target missing): that is a failed or empty read, not 768px drawing nothing.
	const reads = readsOf();
	reads.widths[ 768 ] = Object.fromEntries( DRAWN.map( ( d, i ) => [ `${ i }:`, gone ] ) );
	const r = run( { reads } );
	// Node 1 was drawn at 375 only of the two usable widths (375, 1440)? No: drawn at 375, missing at 1440, so it is gated on desktop alone.
	assert.deepEqual( r.flat[ 1 ].attributes, { sgsHideOnDesktop: true } );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnDesktop: true } );
} );

test( 'Fill hands the page read to the width gate', () => {
	const src = fs.readFileSync( new URL( '../fill.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /widthGateWrites\( \{ nodes, flat, refOf, facts, db, scope: o\.surface, reads, / );
} );
