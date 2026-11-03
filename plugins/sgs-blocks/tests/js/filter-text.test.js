import { normalise, matches, squash } from '../../src/utils/filter-text';

describe( 'filter-text', () => {
	test( 'normalise trims and lower-cases', () => {
		expect( normalise( '  Gift Boxes ' ) ).toBe( 'gift boxes' );
		expect( normalise( null ) ).toBe( '' );
		expect( normalise( undefined ) ).toBe( '' );
	} );
	test( 'normalise keeps inner whitespace; squash collapses it', () => {
		expect( normalise( 'a  b' ) ).toBe( 'a  b' );
		expect( squash( ' A ' + String.fromCharCode( 10 ) + '  b ' ) ).toBe( 'A b' );
	} );
	test( 'matches is a normalised substring test', () => {
		expect( matches( 'Delivery Areas', 'AREA' ) ).toBe( true );
		expect( matches( 'Delivery Areas', '  deliv ' ) ).toBe( true );
		expect( matches( 'Delivery Areas', 'refund' ) ).toBe( false );
	} );
	test( 'an empty or blank query matches everything', () => {
		expect( matches( 'anything', '' ) ).toBe( true );
		expect( matches( 'anything', '   ' ) ).toBe( true );
		expect( matches( '', '' ) ).toBe( true );
	} );
} );
