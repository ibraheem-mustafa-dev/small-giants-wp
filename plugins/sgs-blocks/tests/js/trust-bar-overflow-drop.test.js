/**
 * Trust bar "Hide extras" (overflow-drop.js): a row hides what wrapped onto a later line; a grid hides only what really
 * passes its content edge (a fifth badge on the second row of a four-column grid fits, so it stays).
 *
 * jsdom does no layout, so each badge carries its box in `data-box="left,top,right"` and getBoundingClientRect reads it.
 * Guards (each broken in turn and seen to fail):
 *   1 a grid uses the row rule                       -> "a grid keeps a badge on its second row"
 *   2 a grid hides by the row rule's tops only       -> "a grid hides every badge past its content edge"
 *   3 hiding happens while measuring                 -> "badges are measured before any is hidden"
 *   4 a row uses the edge rule                       -> "a row hides what wrapped onto a later line"
 */

'use strict';

const { layOutDrop, restoreDropped } = require( '../../src/blocks/trust-bar/overflow-drop' );

const PADDING = 10;

/**
 * @param {string}   display Layout of the bar: 'grid' or 'flex'.
 * @param {number[][]} boxes Each badge's [left, top, right].
 * @param {boolean}  [cells] True to print the grid's in-badge separators.
 * @return {HTMLElement} The bar, already in the document.
 */
function bar( display, boxes, cells = false ) {
	document.body.innerHTML = '';
	const root = document.createElement( 'section' );
	root.className = 'sgs-trust-bar';
	root.dataset.overflowMode = 'drop';
	root.style.display = display;
	root.style.paddingRight = PADDING + 'px';
	root.dataset.box = '0,0,400';
	boxes.forEach( ( box, i ) => {
		const badge = document.createElement( 'div' );
		badge.className = 'sgs-trust-bar__badge';
		badge.dataset.box = box.join( ',' );
		badge.textContent = 'Badge ' + i;
		if ( cells ) {
			const cell = document.createElement( 'span' );
			cell.className = 'sgs-trust-bar__separator sgs-trust-bar__separator--cell';
			cell.setAttribute( 'aria-hidden', 'true' );
			badge.appendChild( cell );
		}
		root.appendChild( badge );
	} );
	document.body.appendChild( root );
	return root;
}

// A row hides a dropped badge; a grid keeps its cell and marks it dropped (style.css hides it with visibility).
const hidden = ( root ) =>
	[ ...root.querySelectorAll( '.sgs-trust-bar__badge' ) ].map( ( b ) => b.hasAttribute( 'hidden' ) || b.hasAttribute( 'data-sgs-overflow-dropped' ) );

beforeAll( () => {
	jest.spyOn( window.HTMLElement.prototype, 'getBoundingClientRect' ).mockImplementation( function () {
		const [ left, top, right ] = ( this.dataset.box || '0,0,0' ).split( ',' ).map( Number );
		return { left, top, right, width: right - left, height: 40, bottom: top + 40, x: left, y: top };
	} );
} );

describe( 'overflow-drop', () => {
	it( 'a row hides what wrapped onto a later line', () => {
		const root = bar( 'flex', [ [ 0, 0, 90 ], [ 100, 0, 190 ], [ 200, 0, 290 ], [ 0, 50, 90 ], [ 100, 50, 190 ] ] );
		layOutDrop( root );

		expect( hidden( root ) ).toEqual( [ false, false, false, true, true ] );
	} );

	it( 'a grid keeps a badge on its second row', () => {
		// Four columns inside a 400px bar with 10px padding: the fifth badge sits alone on row two, well inside.
		const root = bar( 'grid', [ [ 0, 0, 90 ], [ 100, 0, 190 ], [ 200, 0, 290 ], [ 300, 0, 380 ], [ 0, 50, 90 ] ] );
		layOutDrop( root );

		expect( hidden( root ) ).toEqual( [ false, false, false, false, false ] );
	} );

	it( 'a grid hides every badge past its content edge', () => {
		// Content edge is 390 (400 less the 10px padding): badges 4 and 5 run past it on one row.
		const root = bar( 'grid', [ [ 0, 0, 150 ], [ 160, 0, 310 ], [ 320, 0, 395 ], [ 400, 0, 470 ], [ 480, 0, 550 ] ] );
		layOutDrop( root );

		expect( hidden( root ) ).toEqual( [ false, false, true, true, true ] );
	} );

	it( 'badges are measured before any is hidden', () => {
		// Hiding badge 3 must not let badge 4 slide back into range: both are measured where they were laid out.
		const root = bar( 'grid', [ [ 0, 0, 100 ], [ 110, 0, 210 ], [ 400, 0, 500 ], [ 420, 0, 520 ] ] );
		layOutDrop( root );

		expect( hidden( root ) ).toEqual( [ false, false, true, true ] );
	} );

	it( 'a grid hides the separator inside the last badge left, and restoring brings everything back', () => {
		const root = bar( 'grid', [ [ 0, 0, 150 ], [ 160, 0, 310 ], [ 320, 0, 395 ], [ 400, 0, 470 ] ], true );
		layOutDrop( root );

		const cells = [ ...root.querySelectorAll( '.sgs-trust-bar__separator--cell' ) ].map( ( c ) => c.hasAttribute( 'hidden' ) );
		expect( cells ).toEqual( [ false, true, false, false ] );

		restoreDropped( root );
		expect( hidden( root ) ).toEqual( [ false, false, false, false ] );
		expect( [ ...root.querySelectorAll( '.sgs-trust-bar__separator--cell' ) ].some( ( c ) => c.hasAttribute( 'hidden' ) ) ).toBe( false );
	} );

	it( 'a grid keeps each dropped badge in its cell, so the badges after it do not shift into the column that overflows', () => {
		// Four columns, column four past the edge, eight badges: b4 and b8 overflow. Hiding b4 outright would move b5 into column
		// four, where it would overflow too.
		const root = bar( 'grid', [
			[ 0, 0, 90 ], [ 100, 0, 190 ], [ 200, 0, 290 ], [ 300, 0, 395 ],
			[ 0, 50, 90 ], [ 100, 50, 190 ], [ 200, 50, 290 ], [ 300, 50, 395 ],
		], true );
		layOutDrop( root );
		const badges = [ ...root.querySelectorAll( '.sgs-trust-bar__badge' ) ];

		expect( hidden( root ) ).toEqual( [ false, false, false, true, false, false, false, true ] );
		expect( badges[ 3 ].hasAttribute( 'hidden' ) ).toBe( false ); // a dropped grid badge is not display:none
		expect( badges[ 3 ].getAttribute( 'data-sgs-overflow-dropped' ) ).toBe( 'keep' );
		expect( badges[ 3 ].hasAttribute( 'inert' ) ).toBe( true );
		expect( badges[ 3 ].getAttribute( 'aria-hidden' ) ).toBe( 'true' );
		// b3 and b7 sit beside a dropped badge: no glyph to their right.
		const cells = badges.map( ( b ) => b.querySelector( '.sgs-trust-bar__separator--cell' ).hasAttribute( 'hidden' ) );
		expect( cells ).toEqual( [ false, false, true, false, false, false, true, false ] );

		restoreDropped( root );
		expect( badges[ 3 ].hasAttribute( 'inert' ) ).toBe( false );
		expect( badges[ 3 ].hasAttribute( 'aria-hidden' ) ).toBe( false );
		expect( badges[ 0 ].querySelector( '.sgs-trust-bar__separator--cell' ).getAttribute( 'aria-hidden' ) ).toBe( 'true' );
	} );
} );
