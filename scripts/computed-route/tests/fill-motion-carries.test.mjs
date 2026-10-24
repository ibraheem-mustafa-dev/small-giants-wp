// lib/fill-motion-settle.mjs::motionSettled's comparators and ::motionRejudged: a part's resting timing or rest length is
// settled by the motion pass only where its written hover state carries the value at every width the row stands for (each
// comparator has a carried and a not-carried case); a resting timing the element pass settled equal against the stylesheet
// is judged by the written layer instead, because the emitter's scoped transition replaces the stylesheet's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionSettled, motionRejudged } from '../lib/fill-motion-settle.mjs';

const db = openDb();
const ICON = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon';
const bar = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
const targets = [ 1, 2, 3 ].map( ( n ) => ( { target: `burger-bar-${ n }`, cssElement: `burger-bar-${ n }`, kind: 'part' } ) ).concat( { target: 'root', cssElement: 'root', kind: 'root' } );
const mdb = { targetsOf: () => targets };
const cal = { settings: Object.fromEntries( [ 1, 2, 3 ].map( ( n ) => [ `burgerBar${ n }BorderRadius`, { slot: bar( n ) } ] ) ) };
const NODE = 'cr-ref-header-16';
const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:', slot: '' }, ...[ 2, 3 ].map( ( n ) => ( { id: `0:${ n }`, slot: bar( n ) } ) ) ] }, { index: 1, name: 'sgs/nav-bar-menu', targets: [ { id: '1:2', slot: bar( 2 ) } ] } ];
const flat = [ { ref: NODE }, { ref: 'cr-ref-header-99' } ];
const EASE = 'cubic-bezier(0.16, 0.84, 0.32, 1)';
const doc = { v: 1, elements: {
	root: { hover: { state: { values: { scale: 1.07, duration: 400, easing: 'token:easing.spring' } } } },
	'burger-bar-2': { hover: { state: { values: { restWidth: '13px', width: '18px', duration: 'token:duration.medium', easing: EASE }, source: 'item' } } },
	'burger-bar-3': { hover: { state: { values: { restWidth: '8px', width: '18px', duration: 350, delay: 40, easing: EASE }, source: 'item' } } },
} };
const own = [ { node: NODE, attr: 'sgsMotion', how: 'motion', after: doc } ];
const rawSnapshot = { settings: { custom: { duration: { medium: '300ms' }, easing: { spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)' } } } };
const row = ( property, value, n = 2, node = NODE ) => ( { node, block: 'sgs/nav-bar-menu', slot: bar( n ), property, value, state: null, reason: 'no-setting: test' } );
const settle = ( unmapped, { writes = own, reads = null } = {} ) => motionSettled( { unmapped, writes, nodes, flat, refOf: ( x ) => x.ref, mdb, db, calFor: () => cal, reads, rawSnapshot } );
const answered = ( r ) => r.answered.map( ( a ) => [ a.property, a.value ] );

test( 'MUST FAIL: each comparator settles the value its part\'s state carries and keeps every other', () => {
	const carried = [ row( 'transition-duration', '0.3s, 300ms' ), row( 'transition-delay', '0.04s', 3 ), row( 'transition-delay', '0s' ), row( 'transition-timing-function', EASE ), row( 'width', '8px', 3 ) ];
	assert.deepEqual( answered( settle( carried ) ), carried.map( ( r ) => [ r.property, r.value ] ) );
	const kept = [ row( 'transition-duration', '0.3s, 0.35s' ), row( 'transition-delay', '0.3s' ), row( 'transition-delay', '0s', 3 ), row( 'transition-timing-function', 'ease-in' ), row( 'transition-timing-function', `${ EASE }, ease` ), row( 'width', '13em' ), row( 'width', '{"375":"13px","768":"14px"}' ), row( 'transition-duration', '{"375":"0.3s","768":"0.4s"}' ), { ...row( 'width', '13px' ), state: 'hover' } ];
	const r = settle( kept );
	assert.deepEqual( r.answered, [] );
	assert.equal( r.unmapped.length, kept.length );
} );

test( 'MUST FAIL: a plain value stands for the widths the draft declares it at; another node\'s or a non-sgsMotion motion write settles nothing', () => {
	const reads = { declared: { 375: { '0:2': { 'transition-duration': '0.3s' } }, 768: { '0:2': {} } } };
	assert.deepEqual( settle( [ row( 'transition-duration', '0.3s' ) ], { reads } ).answered.map( ( a ) => a.widths ), [ [ 375 ] ] );
	assert.deepEqual( settle( [ row( 'transition-duration', '0.3s' ) ] ).answered.map( ( a ) => a.widths ), [ [ 375, 768, 1440 ] ] );
	// The other node has no motion write of its own: the first node's document is not its.
	assert.deepEqual( settle( [ row( 'transition-duration', '0.3s', 2, 'cr-ref-header-99' ) ] ).answered, [] );
	const other = [ { node: NODE, attr: 'scrolledOffset', how: 'motion', after: doc } ];
	assert.deepEqual( settle( [ row( 'transition-duration', '0.3s' ) ], { writes: other } ).answered, [] );
} );

const settledRow = ( property, value, slot = '', over = {} ) => ( { node: NODE, block: 'sgs/nav-bar-menu', slot, property, value, widths: [ 375, 768 ], reason: 'equal', detail: 'x', ...over } );
const rejudge = ( settled, writes = own ) => motionRejudged( { settled, writes, nodes, flat, refOf: ( x ) => x.ref, mdb, db, calFor: () => cal, rawSnapshot } );

test( 'MUST FAIL: a resting timing the stylesheet shows on an element the written layer times is judged by the layer', () => {
	// The draft's 0.18s equals the stylesheet's, but the root layer runs 400ms: live does not run 0.18s.
	const r = rejudge( [ settledRow( 'transition-duration', '0.18s' ), settledRow( 'transition-delay', '0s' ), settledRow( 'transition-timing-function', 'cubic-bezier(0.34, 1.56, 0.64, 1)' ), settledRow( 'transition-duration', '{"375":"0.3s","768":"300ms"}', bar( 2 ) ) ] );
	assert.deepEqual( r.unmapped.map( ( u ) => [ u.property, u.value, u.state ] ), [ [ 'transition-duration', '{"375":"0.18s","768":"0.18s"}', null ] ] );
	// One width the layer gives does not settle the other.
	assert.deepEqual( rejudge( [ settledRow( 'transition-duration', '{"375":"0.4s","768":"0.18s"}' ) ] ).unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /^timing-conflict: the motion hover layer \(sgsMotion\) of root replaces the stylesheet's transition on the block root, and its transition-duration \(400\)/ );
	assert.deepEqual( r.settled.map( ( s ) => [ s.property, s.reason, s.widths ] ), [ [ 'transition-delay', 'motion', [ 375, 768 ] ], [ 'transition-timing-function', 'motion', [ 375, 768 ] ], [ 'transition-duration', 'motion', [ 375, 768 ] ] ] );
} );

test( 'negative control: rows of another reason, look or property, an element with no layer, and a node with no write stay as they are', () => {
	const rows = [ settledRow( 'transition-duration', '0.18s', '', { reason: 'not-painted' } ), settledRow( 'transition-duration', '0.18s', '', { state: 'hover' } ), settledRow( 'width', '13px' ), settledRow( 'transition-duration', '0.18s', bar( 3 ).replace( 'nth-of-type(3)', 'nth-of-type(9)' ) ), settledRow( 'transition-duration', '0.18s', bar( 2 ), { node: 'cr-ref-header-99' } ) ];
	const r = rejudge( rows );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.settled, rows );
	assert.deepEqual( rejudge( [ settledRow( 'transition-duration', '0.18s' ) ], [] ).settled.map( ( s ) => s.reason ), [ 'equal' ] );
	// A row that records no width stands for none.
	assert.deepEqual( rejudge( [ settledRow( 'transition-duration', '0.18s', '', { widths: [] } ) ] ).settled.map( ( s ) => s.reason ), [ 'equal' ] );
	// A layer with no values gives nothing to judge by.
	const empty = [ { node: NODE, attr: 'sgsMotion', how: 'motion', after: { v: 1, elements: { root: { hover: { state: { values: {} } } } } } } ];
	assert.deepEqual( rejudge( [ settledRow( 'transition-duration', '0.18s' ) ], empty ).settled.map( ( s ) => s.reason ), [ 'equal' ] );
} );
