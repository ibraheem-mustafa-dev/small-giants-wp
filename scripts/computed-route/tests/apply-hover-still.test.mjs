// A draft element that does not move on hover over a block whose style lifts it. Run: node --test tests/apply-hover-still.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { hoverMotion, stillHover } from '../lib/apply-family-statemotion.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const target = { ref: 'cr-ref-x-1', tpl: 'Root/9#0' };
const hov = ( transform ) => ( { 1440: { styles: {}, hover: { transform, translate: 'none', scale: 'none', rotate: 'none' } } } );
const ctx = ( o ) => ( { target, block: 'sgs/button', saved: {}, recordsIndex: new Map(), db, rawSnapshot: null, ...o } );
const lifted = 'matrix(1.05, 0, 0, 1.05, 0, -2.1)';

test( 'a still draft over a lifting button switches the built-in lift off', () => {
	const [ item ] = hoverMotion( ctx( { draft: hov( 'none' ), live: hov( lifted ) } ) );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes, [ { attr: 'builtInHoverLift', value: false } ] );
	assert.deepEqual( item.checks[ 0 ].want, { scale: 1, x: 0, y: 0, rotate: 0 } );
} );

test( 'already off is equal', () => {
	const [ item ] = stillHover( ctx( { saved: { builtInHoverLift: false }, draft: hov( 'none' ), live: hov( lifted ) } ) );
	assert.equal( item.status, 'equal' );
} );

test( 'negative controls: a draft that moves, a live that is still and a block with no lift write nothing', () => {
	assert.deepEqual( stillHover( ctx( { draft: hov( lifted ), live: hov( lifted ) } ) ), [] );
	assert.deepEqual( stillHover( ctx( { draft: hov( lifted ), live: hov( 'none' ) } ) ), [] );
	assert.deepEqual( stillHover( ctx( { draft: hov( 'none' ), live: hov( 'none' ) } ) ), [] );
	assert.deepEqual( stillHover( ctx( { block: 'sgs/heading', draft: hov( 'none' ), live: hov( lifted ) } ) ), [] );
	assert.deepEqual( stillHover( ctx( { draft: { 1440: { styles: {} } }, live: hov( lifted ) } ) ), [] );
} );
