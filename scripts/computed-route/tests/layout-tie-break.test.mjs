// The flex/stack tie-break (lib/resolve.mjs::resolveDiscovered) and the effect confirm (lib/fill-confirm.mjs): `layout=flex`
// and `layout=stack` both paint display:flex, stack also turns the root to a column, and stack's inner wrapper reads
// min-height and min-width auto where the default paints 0px. The draft's flex-direction on the row's own element decides;
// a match measured on another element of the block (the inner wrapper) breaks only a tie that remains. The calibration
// below has the shape a container's discovery records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDiscovered } from '../lib/resolve.mjs';
import { confirmRecords } from '../lib/fill-confirm.mjs';

const THREE = [ 375, 768, 1440 ];
const every = ( v ) => Object.fromEntries( THREE.map( ( w ) => [ w, v ] ) );
const INNER = '.sgs-container__inner';
const PAINT = { display: 'block', 'flex-direction': 'row', 'flex-wrap': 'nowrap', 'min-height': '0px', 'min-width': '0px', height: '51px' };
const cal = {
	elements: { '': every( PAINT ), [ INNER ]: every( PAINT ) },
	discovered: { layout: {
		display: { slots: [ INNER, '' ], values: { flex: every( 'flex' ), stack: every( 'flex' ), grid: every( 'grid' ) } },
		height: { slots: [ '' ], values: { flex: every( '25px' ) } },
		'flex-wrap': { slots: [ INNER ], values: { flex: every( 'wrap' ) } },
		'flex-direction': { slots: [ '' ], values: { stack: every( 'column' ) } },
		'min-height': { slots: [ INNER ], values: { stack: every( 'auto' ) } },
		'min-width': { slots: [ INNER ], values: { stack: every( 'auto' ) } },
	} },
};
// A draft flex element as the browser computes it: nowrap, and min sizes auto (it is a flex item of its parent).
const draft = ( direction ) => ( { display: every( 'flex' ), 'flex-direction': 'string' === typeof direction ? every( direction ) : direction, 'flex-wrap': every( 'nowrap' ), 'min-height': every( 'auto' ), 'min-width': every( 'auto' ) } );
const pick = ( siblings, perWidth = every( 'flex' ) ) => resolveDiscovered( { slot: '', prop: 'display', perWidth, siblings }, cal );

test( 'MUST FAIL: a row-direction draft picks flex, a column-direction draft picks stack', () => {
	assert.deepEqual( pick( draft( 'row' ) ).writes, [ { attr: 'layout', value: 'flex', merge: 'replace' } ] );
	assert.deepEqual( pick( draft( 'column' ) ).writes, [ { attr: 'layout', value: 'stack', merge: 'replace' } ] );
} );

test( 'MUST FAIL: a sibling is compared at the row\'s own widths only', () => {
	// A tablet-only row: the draft's 375 value of flex-direction is no evidence for it.
	assert.deepEqual( pick( draft( { 375: 'column', 768: 'row' } ), { 768: 'flex' } ).writes, [ { attr: 'layout', value: 'flex', merge: 'replace' } ] );
} );

test( 'with no evidence on the row\'s own element, another element\'s evidence still breaks the tie, and none leaves it a gap', () => {
	const { 'flex-direction': _, ...rest } = draft( 'row' );
	assert.deepEqual( pick( rest ).writes, [ { attr: 'layout', value: 'stack', merge: 'replace' } ], 'stack matches the inner wrapper\'s nowrap and auto minimums' );
	assert.equal( pick( { display: every( 'flex' ) } ).gap, 'ambiguous' );
} );

// One node whose root reads `styles` at each width.
const confirmOf = ( after, styles, calFor = () => cal ) => confirmRecords( {
	writes: [ { node: 'n0', index: 0, block: 'sgs/container', slot: '', prop: 'display', attr: 'layout', after } ],
	nodes: [ { targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/1#0' } } ] } ],
	reads: { widths: Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': { styles: { display: 'flex', ...styles } } } ] ) ), declared: {} },
	rootComponent: 'Page',
	calFor,
} );

test( 'MUST FAIL: the confirm checks every property the written value\'s effect changes on the element', () => {
	const stack = confirmOf( 'stack', { 'flex-direction': 'row' } ).filter( ( r ) => 'effect' === r.check );
	assert.deepEqual( stack.map( ( r ) => [ r.property, r.width, r.declared, r.renderedDraft, r.verdict ] ), THREE.map( ( w ) => [ 'flex-direction', w, 'column', 'row', 'effect-differs' ] ) );
	const column = confirmOf( 'stack', { 'flex-direction': 'column' } ).filter( ( r ) => 'effect' === r.check );
	assert.ok( column.length && column.every( ( r ) => 'confirmed' === r.verdict ) );
	// flex changes the root's height (a layout result the draft renders as 48px) and the inner wrapper's flex-wrap, which is
	// another element: only the root's height is checked.
	const flex = confirmOf( 'flex', { 'flex-direction': 'row', height: '48px' } ).filter( ( r ) => 'effect' === r.check );
	assert.deepEqual( [ ...new Set( flex.map( ( r ) => r.property ) ) ], [ 'height' ] );
} );

test( 'without a calibration there are no effect records', () => {
	assert.equal( confirmOf( 'stack', { 'flex-direction': 'row' }, () => null ).filter( ( r ) => 'effect' === r.check ).length, 0 );
} );
