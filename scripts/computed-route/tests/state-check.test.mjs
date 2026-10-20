// The state check (Spec 48 FR-48-81, FR-48-46): every draft state look is compared with the live page in the same state,
// by property type, and a live page that never paints the state is found where the draft changes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkStates, stateSummary } from '../lib/state-check.mjs';

const look = ( states, values ) => ( { states, declared: values, rendered: values } );
const read = ( looks, unreached = [] ) => ( { 1440: { looks, unreached } } );
const pairs = [ { draft: 'd', live: 'l' } ];

test( 'MUST FAIL: a matching live state look passes, a different one fails, by property type', () => {
	const draft = read( { d: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)', transform: 'translateY(-3px)' } ) ] } );
	const ok = checkStates( { draft, live: read( { l: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)', transform: 'matrix(1, 0, 0, 1, 0, -3)' } ) ] } ), pairs } );
	assert.deepEqual( ok.map( ( r ) => [ r.prop, r.verdict ] ), [ [ 'color', 'match' ], [ 'transform', 'match' ] ], 'a transform is compared as a matrix' );
	const off = checkStates( { draft, live: read( { l: [ look( [ 'hover' ], { color: 'rgb(0, 0, 200)', transform: 'none' } ) ] } ), pairs } );
	assert.deepEqual( off.map( ( r ) => r.verdict ), [ 'differs', 'differs' ] );
} );

test( 'MUST FAIL: a live page with no look for the state is judged on its resting value, so a missing hover is found', () => {
	const draft = read( { d: [ look( [ 'open' ], { transform: 'rotate(45deg)' } ) ] } );
	const rows = checkStates( { draft, live: read( {} ), liveRest: { 1440: { l: { transform: 'none' } } }, pairs } );
	assert.deepEqual( rows.map( ( r ) => [ r.verdict, r.liveState ] ), [ [ 'differs', false ] ] );
	const atRest = checkStates( { draft, live: read( {} ), liveRest: { 1440: { l: { transform: 'rotate(45deg)' } } }, pairs } );
	assert.equal( atRest[ 0 ].verdict, 'match', 'the live element already shows the value' );
} );

test( 'a state is matched by its full key, so hover is never judged against the live current look', () => {
	const draft = read( { d: [ look( [ 'hover' ], { color: 'rgb(1, 1, 1)' } ) ] } );
	const rows = checkStates( { draft, live: read( { l: [ look( [ 'current' ], { color: 'rgb(1, 1, 1)' } ) ] } ), liveRest: { 1440: { l: { color: 'rgb(9, 9, 9)' } } }, pairs } );
	assert.deepEqual( rows.map( ( r ) => [ r.verdict, r.liveState ] ), [ [ 'differs', false ] ] );
} );

test( 'no live value at all is unreadable, never a pass; the summary counts by state and lists unreached draft states', () => {
	const draft = read( { d: [ look( [ 'hover' ], { color: 'rgb(1, 1, 1)' } ) ] }, [ { id: 'x', selector: 'a:visited', why: ':visited is never exposed to scripts' } ] );
	const rows = checkStates( { draft, live: read( {} ), pairs } );
	assert.equal( rows[ 0 ].verdict, 'unreadable' );
	const s = stateSummary( rows, draft );
	assert.deepEqual( [ s.unreadable, s.byState.hover.unreadable, s.unreachedDraft.length ], [ 1, 1, 1 ] );
} );

test( 'MUST FAIL: a look read by code on either side is compared by declared value and marked unconfirmed; an entered look is confirmed', () => {
	const code = ( states, values ) => ( { states, declared: values, rendered: null, read: 'code' } );
	const draft = read( { d: [ code( [ 'visited' ], { color: 'rgb(128, 0, 128)' } ) ] } );
	const both = checkStates( { draft, live: read( { l: [ code( [ 'visited' ], { color: 'rgb(128, 0, 128)' } ) ] } ), pairs } );
	assert.deepEqual( both.map( ( r ) => [ r.verdict, r.confirmed, r.draftValue, r.liveValue ] ), [ [ 'match', false, 'rgb(128, 0, 128)', 'rgb(128, 0, 128)' ] ] );
	const wrong = checkStates( { draft, live: read( { l: [ code( [ 'visited' ], { color: 'rgb(0, 0, 0)' } ) ] } ), pairs } );
	assert.deepEqual( wrong.map( ( r ) => [ r.verdict, r.confirmed ] ), [ [ 'differs', false ] ] );
	const missing = checkStates( { draft, live: read( {} ), liveRest: { 1440: { l: { color: 'rgb(0, 0, 0)' } } }, pairs } );
	assert.deepEqual( missing.map( ( r ) => [ r.verdict, r.confirmed ] ), [ [ 'differs', false ] ], 'a draft read by code is never confirmed' );
	const entered = checkStates( { draft: read( { d: [ look( [ 'hover' ], { color: 'rgb(1, 1, 1)' } ) ] } ), live: read( { l: [ look( [ 'hover' ], { color: 'rgb(1, 1, 1)' } ) ] } ), pairs } );
	assert.equal( entered[ 0 ].confirmed, true );
} );
