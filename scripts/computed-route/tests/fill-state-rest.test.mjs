// lib/fill-state.mjs hands the equivalence engine the draft's own resting value (restValue), so a hover value equal to the
// property's initial value is held as a shorthand reset only where the draft itself rests at it: a draft that rests at a
// value of its own and resets on hover is a real hover change and stays a raised gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates } from '../lib/fill-state.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const BLOCK = { elements: { '': Object.fromEntries( W.map( ( w ) => [ w, { 'background-size': 'auto' } ] ) ) }, settings: {}, discovered: {} };
const run = ( { rest = null, styles = {}, id = 't' } = {} ) => {
	const looks = [ { states: [ 'hover' ], declared: { 'background-size': 'auto' }, rendered: { 'background-size': 'auto' } } ];
	const reads = {
		widths: Object.fromEntries( W.map( ( w ) => [ w, { [ id ]: { styles } } ] ) ),
		declared: Object.fromEntries( W.map( ( w ) => [ w, { [ id ]: rest ? { 'background-size': rest } : {} } ] ) ),
		states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { [ id ]: looks } } ] ) ),
	};
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	return fillStates( { tree, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id, slot: '' } ] } ], reads, calFor: () => BLOCK, db, snapshot } );
};
const row = ( r ) => r.unmapped.find( ( u ) => 'background-size' === u.property && 'hover' === u.state );
const held = ( r ) => /; held \(default\): /.test( row( r )?.reason ?? '' );

test( 'MUST FAIL: a hover reset to the initial value is held only where the draft rests at the initial value', () => {
	// The draft never declares background-size at rest (initial): the hover reset changes nothing.
	assert.equal( held( run() ), true );
	assert.equal( held( run( { rest: 'auto' } ) ), true );
	assert.equal( held( run( { styles: { 'background-size': 'auto' } } ) ), true );
	// A draft resting at a value of its own and resetting on hover: a real change, raised and not held.
	assert.equal( held( run( { rest: '100% 1px' } ) ), false );
	assert.ok( row( run( { rest: '100% 1px' } ) ), 'the row is still raised' );
	assert.equal( held( run( { styles: { 'background-size': '50%' } } ) ), false );
} );
