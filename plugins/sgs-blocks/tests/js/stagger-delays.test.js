/**
 * The one stagger delay function (Spec 38A FR-38A-24, plan reconciliation R3). Pure arithmetic, so no React and no DOM.
 * The cases are the spec's done-when sequences plus the contract the PHP mirror (M4.1) must reproduce.
 */
const defs = require( '../../src/components/motion/generated-motion-defs.json' );
const {
	computeStaggerDelays,
	computeCloseDelays,
	STAGGER_ORDERS,
} = require( '../../src/components/motion/stagger-delays' );

const delays = ( settings ) => computeStaggerDelays( settings );

describe( 'row-first, the default order', () => {
	it( '3 columns by 6 children, step 80, restarting each row, gives 0, 80, 160, 0, 80, 160', () => {
		expect( delays( { count: 6, columns: 3, step: 80 } ) ).toEqual( [ 0, 80, 160, 0, 80, 160 ] );
	} );

	it( 'a start offset of 40 shifts every delay: 40, 120, 200, 40, 120, 200', () => {
		expect( delays( { count: 6, columns: 3, step: 80, offset: 40 } ) ).toEqual( [ 40, 120, 200, 40, 120, 200 ] );
	} );

	it( 'a single column of four with offset 50 and step 50 is a plain ladder: 50, 100, 150, 200', () => {
		expect( delays( { count: 4, columns: 1, step: 50, offset: 50 } ) ).toEqual( [ 50, 100, 150, 200 ] );
	} );

	it( 'no column count is treated as a single column, and the restart toggle does nothing there', () => {
		const ladder = [ 0, 100, 200, 300 ];
		expect( delays( { count: 4, step: 100 } ) ).toEqual( ladder );
		expect( delays( { count: 4, columns: null, step: 100, perRow: true } ) ).toEqual( ladder );
		expect( delays( { count: 4, columns: 0, step: 100 } ) ).toEqual( ladder );
		expect( delays( { count: 4, columns: 'wide', step: 100 } ) ).toEqual( ladder );
	} );

	it( 'without a row restart the ladder runs on across the rows', () => {
		expect( delays( { count: 6, columns: 3, step: 80, perRow: false } ) ).toEqual( [ 0, 80, 160, 240, 320, 400 ] );
	} );

	it( 'a last row that is not full keeps its columns', () => {
		expect( delays( { count: 5, columns: 3, step: 10 } ) ).toEqual( [ 0, 10, 20, 0, 10 ] );
	} );
} );

describe( 'the cap counts the offset', () => {
	it( 'clips a long single column', () => {
		expect( delays( { count: 8, step: 100, offset: 50, cap: 400 } ) ).toEqual( [ 50, 150, 250, 350, 400, 400, 400, 400 ] );
	} );

	it( 'a cap below the offset gives every child the cap', () => {
		expect( delays( { count: 3, step: 100, offset: 500, cap: 200 } ) ).toEqual( [ 200, 200, 200 ] );
	} );

	it( 'a missing, null or blank cap means no cap, and a cap of 0 is a real cap', () => {
		const free = [ 0, 100, 200, 300 ];
		expect( delays( { count: 4, step: 100 } ) ).toEqual( free );
		expect( delays( { count: 4, step: 100, cap: null } ) ).toEqual( free );
		expect( delays( { count: 4, step: 100, cap: '' } ) ).toEqual( free );
		expect( delays( { count: 4, step: 100, cap: 0 } ) ).toEqual( [ 0, 0, 0, 0 ] );
	} );
} );

describe( 'the other orders', () => {
	it( 'reverse counts each row backwards', () => {
		expect( delays( { count: 6, columns: 3, step: 80, order: 'reverse' } ) ).toEqual( [ 160, 80, 0, 160, 80, 0 ] );
		expect( delays( { count: 4, step: 100, order: 'reverse' } ) ).toEqual( [ 300, 200, 100, 0 ] );
	} );

	it( 'from centre starts the middle first and works outwards', () => {
		expect( delays( { count: 5, step: 100, order: 'from-centre' } ) ).toEqual( [ 200, 100, 0, 100, 200 ] );
		expect( delays( { count: 4, step: 100, order: 'from-centre' } ) ).toEqual( [ 100, 0, 0, 100 ] );
		expect( delays( { count: 6, columns: 3, step: 100, order: 'from-centre' } ) ).toEqual( [ 100, 0, 100, 100, 0, 100 ] );
	} );

	it( 'column-first runs down the columns: by row with a restart, by column rank without', () => {
		expect( delays( { count: 6, columns: 3, step: 100, order: 'column-first' } ) ).toEqual( [ 0, 0, 0, 100, 100, 100 ] );
		expect( delays( { count: 6, columns: 3, step: 100, order: 'column-first', perRow: false } ) ).toEqual( [ 0, 200, 400, 100, 300, 500 ] );
		expect( delays( { count: 4, step: 100, order: 'column-first' } ) ).toEqual( [ 0, 100, 200, 300 ] );
	} );

	it( 'flatten is one running index across every child whatever the columns', () => {
		expect( delays( { count: 6, columns: 3, step: 50, order: 'flatten' } ) ).toEqual( [ 0, 50, 100, 150, 200, 250 ] );
	} );

	it( 'an unknown order falls back to row-first', () => {
		expect( delays( { count: 6, columns: 3, step: 80, order: 'diagonal' } ) ).toEqual( [ 0, 80, 160, 0, 80, 160 ] );
	} );

	it( 'every order the schema lists is implemented', () => {
		defs.$defs.Stagger.properties.order.enum.forEach( ( name ) => {
			expect( Object.keys( STAGGER_ORDERS ) ).toContain( name );
		} );
	} );
} );

describe( 'bad input', () => {
	it( 'gives an empty list for no children and never throws', () => {
		expect( delays( { count: 0, step: 80 } ) ).toEqual( [] );
		expect( delays( { count: -3 } ) ).toEqual( [] );
		expect( delays( { count: 'many' } ) ).toEqual( [] );
		expect( delays() ).toEqual( [] );
	} );

	it( 'treats negative or non-numeric step and offset as 0, and rounds to whole milliseconds', () => {
		expect( delays( { count: 3, step: -50, offset: 'soon' } ) ).toEqual( [ 0, 0, 0 ] );
		expect( delays( { count: 3, step: 33.4 } ) ).toEqual( [ 0, 33, 67 ] );
	} );
} );

describe( 'close delays', () => {
	it( 'same repeats the open delays', () => {
		expect( computeCloseDelays( [ 0, 80, 160, 0, 80, 160 ], 'same' ) ).toEqual( [ 0, 80, 160, 0, 80, 160 ] );
	} );

	it( 'reversed mirrors them inside their own range, so the cap still holds', () => {
		expect( computeCloseDelays( [ 50, 100, 150, 200 ], 'reversed' ) ).toEqual( [ 200, 150, 100, 50 ] );
		expect( computeCloseDelays( [], 'reversed' ) ).toEqual( [] );
	} );
} );

describe( 'a planted wrong delay fails (MUST FAIL control)', () => {
	it( 'the assertion rejects a sequence that forgets the row restart', () => {
		const wrong = [ 0, 80, 160, 240, 320, 400 ];
		expect( () => expect( wrong ).toEqual( delays( { count: 6, columns: 3, step: 80 } ) ) ).toThrow();
	} );
} );
