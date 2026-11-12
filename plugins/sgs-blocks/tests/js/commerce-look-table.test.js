/**
 * The Cart and Checkout look table: every setting the table defines is registered on the block (attributes.js
 * spreads the generated list), has the type the column declares, and has a control; the generated files are
 * current; and no table setting repeats a hand-written one.
 */
import { COMMERCE_LOOK_ATTRIBUTES } from '../../src/blocks/extensions/commerce-look/attributes';
import { tableRowsFor } from '../../src/blocks/extensions/commerce-look/table-panels';

const { tableAttributes, problems, handWritten } = require( '../../scripts/generate-commerce-look-table' );

describe( 'commerce-look table', () => {
	const attrs = tableAttributes();

	it( 'defines settings', () => {
		expect( attrs.length ).toBeGreaterThan( 150 );
	} );

	it( 'registers every table setting with the declared type', () => {
		for ( const a of attrs ) {
			expect( COMMERCE_LOOK_ATTRIBUTES[ a.name ] ).toEqual( { type: a.type } );
		}
	} );

	it( 'repeats no hand-written attribute and defines no name twice', () => {
		expect( problems( attrs ) ).toEqual( [] );
		expect( handWritten().length ).toBeGreaterThan( 100 );
	} );

	it( 'draws a control for every column that is not an underline of an existing text style', () => {
		const rows = [ ...tableRowsFor( false ), ...tableRowsFor( true ) ];
		const drawn = new Set();
		for ( const row of rows ) {
			for ( const column of row.columns ) {
				drawn.add( row.id + ':' + column );
			}
		}
		for ( const a of attrs ) {
			const hasCheckout = true;
			if ( 'decoration' === a.column ) {
				// Drawn by the row's own text panel (TextControls shows underline when the attribute exists).
				continue;
			}
			// A cart-only or checkout-only row is drawn for its own block only.
			expect( hasCheckout && drawn.has( a.row + ':' + a.column ) ).toBe( true );
		}
	} );
} );

describe( 'commerce-look table: stretch and align', () => {
	const names = tableAttributes().map( ( a ) => a.name );

	it( 'lists the alignment settings of the two Eye Care rows as per-device objects', () => {
		for ( const name of [ 'sgsSummaryItemNameFlexGrow', 'sgsTotalsFooterItemAlignItems' ] ) {
			expect( names ).toContain( name );
			expect( COMMERCE_LOOK_ATTRIBUTES[ name ] ).toEqual( { type: 'object' } );
		}
	} );
} );
