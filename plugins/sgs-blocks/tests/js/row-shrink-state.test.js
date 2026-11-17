/**
 * Row shrink hysteresis: a slow scroll toggles the state once each way, even
 * when shrinking pulls scrollY up by the removed height (scroll anchoring).
 */

import {
	nextRowShrunk,
	rowShrinkExitY,
	ROW_SHRINK_ENTER_PX,
} from '../../src/header-behaviours/row-shrink-state.js';

/**
 * Walk the visitor's wheel through `deltas` (px per step) against a simulated
 * browser: when the row shrinks the header loses `removed` px and scroll
 * anchoring pulls scrollY up by it (clamped at the page top); when it
 * un-shrinks the header regains it and scrollY goes down by it.
 *
 * @param {number[]} deltas  Wheel steps.
 * @param {number}   removed Header height removed by shrinking.
 * @return {number} How many times the shrunk state changed.
 */
function walk( deltas, removed ) {
	let y = 0;
	let shrunk = false;
	let removedPx = 0;
	let toggles = 0;
	for ( const d of deltas ) {
		y = Math.max( 0, y + d );
		for ( let i = 0; i < 6; i++ ) {
			const next = nextRowShrunk( shrunk, y, removedPx, false );
			if ( next === shrunk ) {
				break;
			}
			shrunk = next;
			toggles++;
			if ( shrunk ) {
				removedPx = removed;
			}
			y = Math.max( 0, y + ( shrunk ? -removed : removed ) );
		}
	}
	return toggles;
}

const steps = ( n, d ) => Array( n ).fill( d );

describe( 'row shrink state', () => {
	test( 'shrinks past the enter threshold and not at it', () => {
		expect( nextRowShrunk( false, ROW_SHRINK_ENTER_PX, 0, false ) ).toBe( false );
		expect( nextRowShrunk( false, ROW_SHRINK_ENTER_PX + 1, 0, false ) ).toBe( true );
	} );

	test( 'exit threshold drops by the removed height and never below 1', () => {
		expect( rowShrinkExitY( 0 ) ).toBeLessThan( ROW_SHRINK_ENTER_PX );
		expect( rowShrinkExitY( 32 ) ).toBeLessThan( rowShrinkExitY( 0 ) );
		expect( rowShrinkExitY( 500 ) ).toBe( 1 );
		expect( nextRowShrunk( true, 0, 500, false ) ).toBe( false );
	} );

	test.each( [ 0, 10, 32, 41 ] )(
		'one slow scroll down then up toggles exactly once each way (removed %ipx)',
		( removed ) => {
			expect( walk( steps( 300, 1 ), removed ) ).toBe( 1 );
			expect( walk( [ ...steps( 300, 1 ), ...steps( 400, -1 ) ], removed ) ).toBe( 2 );
		}
	);

	test( 'a shrink taller than the page top settles after one learning cycle', () => {
		// First shrink at 51 is clamped to 0 and flips back once; the removed
		// height is then known, so the second shrink holds.
		const down = walk( steps( 400, 1 ), 120 );
		expect( down ).toBeLessThanOrEqual( 3 );
		expect( walk( [ ...steps( 400, 1 ), ...steps( 600, -1 ) ], 120 ) - down ).toBe( 1 );
	} );

	test( 'the old single threshold flips repeatedly (control)', () => {
		let y = 51;
		let shrunk = false;
		let toggles = 0;
		for ( let i = 0; i < 6; i++ ) {
			const next = y > 50;
			if ( next !== shrunk ) {
				toggles++;
				shrunk = next;
			}
			y = shrunk ? 19 : 51;
		}
		expect( toggles ).toBeGreaterThan( 2 );
	} );

	test( 'a restored shrunk state holds the row shrunk', () => {
		expect( nextRowShrunk( false, 0, 0, true ) ).toBe( true );
	} );
} );
