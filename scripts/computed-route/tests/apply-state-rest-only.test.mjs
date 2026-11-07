// A difference the hover changes on neither side is a resting difference, never a hover row. Run: node --test tests/apply-state-rest-only.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { state } from '../lib/apply-family-state.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const target = { ref: 'cr-ref-x-1', tpl: 'Root/9#0' };
const read = ( styles, hover ) => ( { 1440: { styles, hover } } );
const ctx = ( draft, live ) => ( { target, block: 'sgs/container', saved: {}, draft, live, recordsIndex: new Map(), db, rawSnapshot: null, snapshot: null, calFor: () => null } );
const props = ( items ) => items.filter( ( i ) => 'hover' === i.state && 'hover' !== i.prop && ! /^hover /.test( i.prop ) ).map( ( i ) => i.prop );

test( 'a difference held through the hover is a resting row, never a hover row', () => {
	const items = state.decide( ctx( read( { gap: '16px', color: 'rgb(1, 2, 3)' }, { gap: '16px', color: 'rgb(1, 2, 3)' } ), read( { gap: 'normal', color: 'rgb(0, 0, 0)' }, { gap: 'normal', color: 'rgb(0, 0, 0)' } ) ) );
	assert.deepEqual( props( items ), [] );
	assert.deepEqual( items.filter( ( i ) => ! i.state && 'no-setting' === i.status ).map( ( i ) => i.prop ), [ 'gap', 'color' ] );
} );

test( 'negative control: a colour the draft hover changes is still a hover row', () => {
	const items = state.decide( ctx( read( { gap: '16px', color: 'rgb(0, 0, 0)' }, { gap: '16px', color: 'rgb(10, 126, 168)' } ), read( { gap: 'normal', color: 'rgb(0, 0, 0)' }, { gap: 'normal', color: 'rgb(0, 0, 0)' } ) ) );
	assert.deepEqual( props( items ), [ 'color' ] );
} );

test( 'an unread resting value never hides a hover difference', () => {
	const items = state.decide( ctx( read( {}, { gap: '16px' } ), read( {}, { gap: 'normal' } ) ) );
	assert.deepEqual( props( items ), [ 'gap' ] );
} );

test( 'negative control: a border colour on an element with no border gives no row at rest or on hover', () => {
	const items = state.decide( ctx( read( { 'border-top-color': 'rgb(1, 2, 3)', 'border-top-width': '0px' }, { 'border-top-color': 'rgb(1, 2, 3)', 'border-top-width': '0px' } ), read( { 'border-top-color': 'rgb(0, 0, 0)', 'border-top-width': '0px' }, { 'border-top-color': 'rgb(0, 0, 0)', 'border-top-width': '0px' } ) ) );
	assert.deepEqual( items.filter( ( i ) => 'border-top-color' === i.prop ), [] );
} );
