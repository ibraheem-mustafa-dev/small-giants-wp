// L9.3 (FR-47-4 step 3): spacing ownership is decided per tier from rendered border-box gaps, never the draft's CSS. A
// parent's gap is written only when every sibling gap is equal (within 0.5px); otherwise the parent gap is 0 and each
// child takes its own margin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spacingOwnership, EQUAL_PX, decisionFor } from '../lib/fill-spacing.mjs';

const box = ( x, y, w, h, extra = {} ) => ( { x, y, w, h, ...extra } );
// Three stacked boxes with the given vertical gaps (a vertical main axis).
const stack = ( ...gaps ) => {
	let y = 0;
	const out = [ box( 0, y, 300, 40 ) ];
	for ( const g of gaps ) {
		y += 40 + g;
		out.push( box( 0, y, 300, 40 ) );
	}
	return out;
};
// Boxes side by side with the given horizontal gaps (a horizontal main axis).
const row = ( ...gaps ) => {
	let x = 0;
	const out = [ box( x, 0, 100, 50 ) ];
	for ( const g of gaps ) {
		x += 100 + g;
		out.push( box( x, 0, 100, 50 ) );
	}
	return out;
};

test( 'MUST FAIL: one unequal gap in a stack hands every gap to the children and writes the parent gap as 0', () => {
	const r = spacingOwnership( stack( 16, 16, 40 ) );
	assert.equal( r.owner, 'children' );
	assert.deepEqual( r.decisions, [ { prop: 'row-gap', owner: 'children', value: '0px', gaps: [ 16, 16, 40 ], margins: [ 'margin-top', 'margin-bottom' ] } ] );
	assert.notEqual( spacingOwnership( stack( 16, 16, 16 ) ).owner, 'children', 'the control with equal gaps does not take that branch' );
} );

test( 'equal gaps in a vertical stack: the parent owns row-gap at the gap\'s value', () => {
	const r = spacingOwnership( stack( 16, 16, 16 ) );
	assert.equal( r.owner, 'parent' );
	assert.deepEqual( r.decisions, [ { prop: 'row-gap', owner: 'parent', value: '16px', gaps: [ 16, 16, 16 ], margins: [ 'margin-top', 'margin-bottom' ] } ] );
	assert.equal( r.count, 4 );
} );

test( 'a horizontal main axis: equal gaps are column-gap, unequal gaps zero it, margins are left and right', () => {
	const eq = spacingOwnership( row( 10, 10 ) );
	assert.deepEqual( eq.decisions, [ { prop: 'column-gap', owner: 'parent', value: '10px', gaps: [ 10, 10 ], margins: [ 'margin-left', 'margin-right' ] } ] );
	const un = spacingOwnership( row( 10, 24 ) );
	assert.equal( un.owner, 'children' );
	assert.deepEqual( un.decisions.map( ( d ) => [ d.prop, d.owner, d.value ] ), [ [ 'column-gap', 'children', '0px' ] ] );
} );

test( 'no gap exists with zero children, one child, or one rendered child among hidden ones: owner none, no decisions', () => {
	for ( const rects of [ [], [ box( 0, 0, 100, 50 ) ], [ null, box( 0, 0, 100, 50 ), null ], [ box( 0, 0, 0, 0 ), box( 0, 0, 100, 50 ) ] ] ) {
		const r = spacingOwnership( rects );
		assert.equal( r.owner, 'none' );
		assert.deepEqual( r.decisions, [] );
	}
} );

test( 'the 0.5px tolerance is on the spread of the gaps: 0.5 apart is equal, 0.51 apart is not', () => {
	assert.equal( EQUAL_PX, 0.5 );
	assert.equal( spacingOwnership( stack( 10, 10.5 ) ).owner, 'parent' );
	assert.equal( spacingOwnership( stack( 10, 10.51 ) ).owner, 'children' );
	// Spread, not distance from the first gap: 10, 10.4, 9.9 spread 0.5 is equal; 10, 10.4, 9.8 spread 0.6 is not.
	assert.equal( spacingOwnership( stack( 10, 10.4, 9.9 ) ).owner, 'parent' );
	assert.equal( spacingOwnership( stack( 10, 10.4, 9.8 ) ).owner, 'children' );
	assert.equal( spacingOwnership( stack( 10, 10.4 ) ).decisions[ 0 ].value, '10.2px', 'the value is the mean of the gaps' );
} );

test( 'gaps use border boxes in position order, whatever order the children are listed in (row-reverse, hidden between)', () => {
	const reversed = row( 12, 12 ).reverse();
	assert.equal( spacingOwnership( reversed ).decisions[ 0 ].value, '12px' );
	const bridged = [ box( 0, 0, 300, 40 ), null, box( 0, 56, 300, 40 ) ];
	assert.deepEqual( spacingOwnership( bridged ).decisions[ 0 ].gaps, [ 16 ], 'a child not rendered at this tier is skipped, the gap runs between the rendered neighbours' );
} );

test( 'an out-of-flow child (absolute, fixed) is not a sibling for spacing', () => {
	const r = spacingOwnership( [ ...stack( 16, 16 ), box( 5, 5, 20, 20, { inFlow: false } ) ] );
	assert.equal( r.owner, 'parent' );
	assert.equal( r.count, 3 );
} );

test( 'a negative gap (overlap) can never be a parent gap: the children own it', () => {
	const r = spacingOwnership( stack( -8, -8 ) );
	assert.equal( r.owner, 'children' );
	assert.equal( r.decisions[ 0 ].value, '0px' );
} );

test( 'a wrapped or grid layout has both axes judged separately: equal within lines and between lines, or one of each', () => {
	const grid = ( colGap, rowGap ) => [ box( 0, 0, 100, 40 ), box( 100 + colGap, 0, 100, 40 ), box( 0, 40 + rowGap, 100, 40 ), box( 100 + colGap, 40 + rowGap, 100, 40 ) ];
	const both = spacingOwnership( grid( 20, 30 ) );
	assert.equal( both.owner, 'parent' );
	assert.deepEqual( both.decisions.map( ( d ) => [ d.prop, d.owner, d.value ] ), [ [ 'column-gap', 'parent', '20px' ], [ 'row-gap', 'parent', '30px' ] ] );
	const rows = [ box( 0, 0, 100, 40 ), box( 120, 0, 100, 40 ), box( 0, 70, 100, 40 ), box( 120, 70, 100, 40 ), box( 0, 150, 100, 40 ) ];
	const mixed = spacingOwnership( rows );
	assert.equal( mixed.owner, 'mixed' );
	assert.deepEqual( mixed.decisions.map( ( d ) => [ d.prop, d.owner ] ), [ [ 'column-gap', 'parent' ], [ 'row-gap', 'children' ] ] );
	// A tall cell: the row gap runs from the tallest cell's bottom.
	const tall = [ box( 0, 0, 100, 80 ), box( 120, 0, 100, 40 ), box( 0, 100, 100, 40 ), box( 120, 100, 100, 40 ) ];
	assert.deepEqual( spacingOwnership( tall ).decisions.find( ( d ) => 'row-gap' === d.prop ).gaps, [ 20 ] );
} );

test( 'a child with no draft element of its own makes ownership unknown: nothing is decided from a partial list', () => {
	const r = spacingOwnership( stack( 16, 16 ), { unmeasured: 1 } );
	assert.equal( r.owner, 'unknown' );
	assert.deepEqual( r.decisions, [] );
} );

test( 'decisionFor picks the decision for a gap property, or null', () => {
	const r = spacingOwnership( stack( 16, 16 ) );
	assert.equal( decisionFor( r, 'row-gap' ).value, '16px' );
	assert.equal( decisionFor( r, 'column-gap' ), null );
	assert.equal( decisionFor( null, 'row-gap' ), null );
} );
