/**
 * `spacingAxesFor()` reads `block.json::supports.sgs.spacingAxes`, the per-attribute opt-in to the Vertical /
 * Horizontal paired mode of `SgsBoxControl`.
 *
 * Negative control: an undeclared attribute, a falsy or non-boolean entry, an unknown block and a block with no
 * `spacingAxes` at all each read false, so a mount never gains the paired mode by accident.
 */

jest.mock( '@wordpress/blocks', () => ( { getBlockType: jest.fn() } ) );

const { getBlockType } = require( '@wordpress/blocks' );
const { spacingAxesFor } = require( '../../src/utils/spacing-axes' );

describe( 'spacingAxesFor', () => {
	afterEach( () => getBlockType.mockReset() );

	it( 'is true for an attribute declared true, and reads the block by name', () => {
		getBlockType.mockReturnValue( { supports: { sgs: { spacingAxes: { padding: true, margin: false } } } } );
		expect( spacingAxesFor( 'sgs/x', 'padding' ) ).toBe( true );
		expect( getBlockType ).toHaveBeenCalledWith( 'sgs/x' );
	} );

	it( 'is false for an attribute declared false or left undeclared', () => {
		getBlockType.mockReturnValue( { supports: { sgs: { spacingAxes: { padding: true, margin: false } } } } );
		expect( spacingAxesFor( 'sgs/x', 'margin' ) ).toBe( false );
		expect( spacingAxesFor( 'sgs/x', 'other' ) ).toBe( false );
	} );

	it( 'is false for a non-boolean entry, a malformed declaration, no declaration or an unknown block', () => {
		getBlockType.mockReturnValue( { supports: { sgs: { spacingAxes: { padding: 'yes', margin: 1 } } } } );
		expect( spacingAxesFor( 'sgs/x', 'padding' ) ).toBe( false );
		expect( spacingAxesFor( 'sgs/x', 'margin' ) ).toBe( false );
		getBlockType.mockReturnValue( { supports: { sgs: { spacingAxes: [ 'padding' ] } } } );
		expect( spacingAxesFor( 'sgs/x', 'padding' ) ).toBe( false );
		getBlockType.mockReturnValue( { supports: { sgs: {} } } );
		expect( spacingAxesFor( 'sgs/x', 'padding' ) ).toBe( false );
		getBlockType.mockReturnValue( undefined );
		expect( spacingAxesFor( 'sgs/missing', 'padding' ) ).toBe( false );
	} );
} );
