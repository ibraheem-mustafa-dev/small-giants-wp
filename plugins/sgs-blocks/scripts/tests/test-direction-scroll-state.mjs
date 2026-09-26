#!/usr/bin/env node
/**
 * Header scroll-trigger state machine (Wave 3C U-13 M-03, §4.6). Every case
 * pairs a positive assertion with a negative control, following the house
 * convention (test-header-ink-tone.mjs).
 *
 *   node scripts/tests/test-direction-scroll-state.mjs
 */
import {
	initDirectionScrollState,
	nextDirectionScrollState,
	positionScrolled,
	DIRECTION_UP_DEADZONE_PX,
} from '../../src/header-behaviours/direction-scroll-state.js';

let fail = 0;
let total = 0;

function eq( expected, actual, label ) {
	total++;
	if ( expected !== actual ) {
		fail++;
		console.error( `FAIL ${ label }\n  expected: ${ JSON.stringify( expected ) }\n  actual:   ${ JSON.stringify( actual ) }` );
	}
}

/** Run a sequence of scrollY values through the direction machine, returning the final state. */
function run( scrollYs, offset ) {
	let state = initDirectionScrollState( scrollYs[ 0 ] );
	for ( let i = 1; i < scrollYs.length; i++ ) {
		state = nextDirectionScrollState( state, scrollYs[ i ], offset );
	}
	return state;
}

// ---------------------------------------------------------------------------
// position mode — byte-for-byte the pre-M-03 rule (scrollY > offset).
// ---------------------------------------------------------------------------
eq( false, positionScrolled( 50, 50 ), 'position: exactly at the offset is NOT scrolled' );
eq( true, positionScrolled( 51, 50 ), 'position: 1px past the offset IS scrolled' );
// NEGATIVE CONTROL: a lower offset flips the same scrollY the other way —
// proves the function reads the offset argument, not a hardcoded 50.
eq( false, positionScrolled( 51, 100 ), 'NEGATIVE CONTROL: same scrollY, a higher offset is NOT scrolled' );

// ---------------------------------------------------------------------------
// direction mode.
// ---------------------------------------------------------------------------

// Down past the offset -> scrolled.
eq( true, run( [ 0, 50, 150 ], 100 ).scrolled, 'direction: down past the offset scrolls' );

// Up 5px (under the 8px deadzone) while still past the offset -> STILL scrolled.
eq(
	true,
	run( [ 0, 150, 145 ], 100 ).scrolled,
	'direction: a 5px upward move (under the deadzone) stays scrolled'
);

// Up 8px or more (the deadzone) while still past the offset -> NOT scrolled.
eq(
	false,
	run( [ 0, 150, 142 ], 100 ).scrolled,
	`direction: an ${ DIRECTION_UP_DEADZONE_PX }px+ upward move clears scrolled`
);
// NEGATIVE CONTROL: 1px short of the deadzone threshold does NOT clear it —
// proves the boundary is genuinely 8px, not "any upward move".
eq(
	true,
	run( [ 0, 150, 143 ], 100 ).scrolled,
	'NEGATIVE CONTROL: a 7px upward move (1px short of the deadzone) stays scrolled'
);

// At/below the offset -> not scrolled, unconditionally (even mid-downward-run).
eq(
	false,
	run( [ 0, 150, 100 ], 100 ).scrolled,
	'direction: landing exactly on the offset clears scrolled regardless of direction'
);
eq(
	false,
	run( [ 0, 150, 50 ], 100 ).scrolled,
	'direction: below the offset clears scrolled'
);

// The deadzone accumulates across several small upward ticks, not just one.
eq(
	false,
	run( [ 0, 150, 147, 144, 141 ], 100 ).scrolled,
	'direction: three 3px upward ticks (9px total) accumulate past the deadzone'
);
// NEGATIVE CONTROL: the same three ticks, but a downward tick in between resets
// the accumulator — proves accumulation is over a CONTIGUOUS upward run, not a
// running total across reversals.
eq(
	true,
	run( [ 0, 150, 147, 149, 144 ], 100 ).scrolled,
	'NEGATIVE CONTROL: a downward reversal mid-run resets the upward accumulator'
);

// Scrolling up from rest (never having gone past the offset) never sets scrolled.
eq(
	false,
	run( [ 200, 100, 50, 0 ], 100 ).scrolled,
	'direction: scrolling up without first passing the offset while going down never scrolls'
);

console.log( `${ total - fail }/${ total } passed` );
if ( fail ) {
	console.error( `${ fail } FAILED` );
	process.exit( 1 );
}
