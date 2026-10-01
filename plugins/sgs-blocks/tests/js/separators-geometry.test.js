/**
 * Separators geometry: the lines the runtime overlay draws for browsers without
 * gap decorations. The fixture is the 800px auto-fit grid measured in Chrome 154,
 * Chromium, Firefox and WebKit (7 items, 4 columns, 90px rows, 24px gap, 32px
 * padding): native gap decorations drew vertical lines at x = 210, 400, 590 and
 * a horizontal line at y = 134.
 */
import { groupRows, separatorSegments } from '../../src/shared/separators/geometry';

const box = ( col, row ) => ( {
	left: 32 + col * 190,
	right: 32 + col * 190 + 166,
	top: 32 + row * 114,
	bottom: 32 + row * 114 + 90,
} );

// Seven items in a four-column grid: row 1 full, row 2 holds three.
const grid = [ box( 0, 0 ), box( 1, 0 ), box( 2, 0 ), box( 3, 0 ), box( 0, 1 ), box( 1, 1 ), box( 2, 1 ) ];

describe( 'separatorSegments', () => {
	test( 'groups an auto-fit grid into rows', () => {
		const rows = groupRows( grid );
		expect( rows.map( ( r ) => r.items.length ) ).toEqual( [ 4, 3 ] );
	} );

	test( 'draws a vertical line centred in every gap, as native decorations do', () => {
		const { column } = separatorSegments( grid, { column: true, row: true } );
		expect( column.map( ( s ) => s.at ) ).toEqual( [ 210, 400, 590 ] );
	} );

	test( 'a line beside an empty last-row cell stops with the row above it', () => {
		const { column } = separatorSegments( grid, { column: true, row: false } );
		const third = column[ 2 ];
		expect( third.to ).toBe( 122 ); // end of row 1, not row 2
		const first = column[ 0 ];
		expect( first.from ).toBe( 32 );
		expect( first.to ).toBe( 236 ); // runs on through both rows
	} );

	test( 'draws a horizontal line centred between the rows, above items that have something above them', () => {
		const { row } = separatorSegments( grid, { column: false, row: true } );
		expect( row ).toHaveLength( 1 );
		expect( row[ 0 ].at ).toBe( 134 );
		expect( row[ 0 ].from ).toBe( 32 );
		expect( row[ 0 ].to ).toBe( 32 + 2 * 190 + 166 ); // ends at the third item of row 2
	} );

	test( 'axes that are off draw nothing', () => {
		const none = separatorSegments( grid, { column: false, row: false } );
		expect( none.column ).toEqual( [] );
		expect( none.row ).toEqual( [] );
	} );

	test( 'a single item draws nothing', () => {
		const one = separatorSegments( [ box( 0, 0 ) ], { column: true, row: true } );
		expect( one ).toEqual( { column: [], row: [] } );
	} );

	test( 'a wrapped flex line with items of different heights is still one row', () => {
		const flex = [
			{ left: 0, right: 100, top: 0, bottom: 60 },
			{ left: 124, right: 224, top: 10, bottom: 40 },
			{ left: 0, right: 100, top: 84, bottom: 120 },
		];
		const { column, row } = separatorSegments( flex, { column: true, row: true } );
		expect( column ).toHaveLength( 1 );
		expect( column[ 0 ].at ).toBe( 112 );
		expect( row[ 0 ].at ).toBe( 72 ); // between the tallest item above (60) and the item below (84)
	} );

	test( 'negative control: a geometry that ignored empty cells would extend the third line', () => {
		const { column } = separatorSegments( grid, { column: true, row: false } );
		expect( column[ 2 ].to ).not.toBe( 236 );
	} );
} );
