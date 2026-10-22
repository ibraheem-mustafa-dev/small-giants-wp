import { reasons } from '../../src/blocks/form/custom-messages';

const field = ( flags, type = 'text' ) => ( {
	type,
	validity: {
		valueMissing: false,
		typeMismatch: false,
		patternMismatch: false,
		tooShort: false,
		tooLong: false,
		rangeUnderflow: false,
		rangeOverflow: false,
		stepMismatch: false,
		badInput: false,
		...flags,
	},
} );

describe( 'custom message reasons', () => {
	test( 'valueMissing maps to required only', () => {
		expect( reasons( field( { valueMissing: true } ) ) ).toEqual( [ 'required' ] );
	} );

	test.each( [
		'typeMismatch',
		'patternMismatch',
		'rangeUnderflow',
		'rangeOverflow',
		'stepMismatch',
		'badInput',
		'tooShort',
	] )( '%s maps to invalid', ( reason ) => {
		expect( reasons( field( { [ reason ]: true } ) ) ).toContain( 'invalid' );
	} );

	test( 'tooLong maps to toolong', () => {
		expect( reasons( field( { tooLong: true } ) ) ).toContain( 'toolong' );
	} );

	test( 'tooLong is not invalid', () => {
		expect( reasons( field( { tooLong: true } ) ) ).not.toContain( 'invalid' );
	} );
} );
