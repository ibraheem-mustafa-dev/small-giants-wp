/**
 * SgsGapControl — row gap and column gap in one control.
 *
 * SgsLengthControl is replaced by a stand-in that shows its label and value and lets a test write a value, so the
 * test reads what the gap control passes down and what it stores.
 *
 * Negative control: if `composeGap` wrote a bare preset slug inside the pair ("50 12px") the "preset inside a pair"
 * test fails, and if `parseGap` split inside `calc()` the "calc() stays one part" test fails.
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const h = React.createElement;

jest.mock( '../../src/components/SgsLengthControl', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		default: ( { label, value, placeholder, onChange } ) =>
			R.createElement(
				'div',
				{
					'data-testid': 'length',
					'data-label': label ?? '',
					'data-value': value ?? '',
					'data-placeholder': placeholder ?? '',
				},
				R.createElement( 'button', {
					'data-testid': `write-${ label ?? 'none' }`,
					onClick: () => onChange( '40' ),
				} ),
				R.createElement( 'button', {
					'data-testid': `len-${ label ?? 'none' }`,
					onClick: () => onChange( '8px' ),
				} )
			),
	};
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const box =
		( tag = 'div' ) =>
		( { children } ) =>
			R.createElement( tag, null, children );
	const BaseControl = box();
	BaseControl.VisualLabel = box( 'span' );
	return {
		BaseControl,
		Flex: box(),
		FlexBlock: box(),
		FlexItem: box(),
		Button: ( { label, onClick } ) =>
			R.createElement( 'button', { 'aria-label': label, onClick } ),
	};
} );

jest.mock( '@wordpress/icons', () => ( { link: 'link', linkOff: 'linkOff' } ) );

const SgsGapControl = require( '../../src/components/SgsGapControl' ).default;
const {
	parseGap,
	composeGap,
	splitTopLevel,
} = require( '../../src/components/SgsGapControl' );

let container;
let root;

function mount( props ) {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
	act( () => {
		root.render( h( SgsGapControl, props ) );
	} );
}

afterEach( () => {
	if ( root ) {
		act( () => root.unmount() );
		container.remove();
		root = null;
	}
} );

const rows = () => [
	...container.querySelectorAll( '[data-testid="length"]' ),
];
const press = ( id ) =>
	act( () => {
		container.querySelector( `[data-testid="${ id }"]` ).click();
	} );
const button = ( name ) =>
	container.querySelector( `button[aria-label="${ name }"]` );

describe( 'parseGap and composeGap', () => {
	test( 'one value is both gaps', () => {
		expect( parseGap( '20px' ) ).toEqual( {
			row: '20px',
			column: '',
			pair: false,
		} );
		expect( parseGap( '50' ) ).toEqual( {
			row: '50',
			column: '',
			pair: false,
		} );
		expect( parseGap( '' ).pair ).toBe( false );
	} );

	test( 'a pair reads row then column, and a preset var inside it comes back as its slug', () => {
		expect( parseGap( '16px 12px' ) ).toEqual( {
			row: '16px',
			column: '12px',
			pair: true,
		} );
		expect( parseGap( 'var(--wp--preset--spacing--50) 12px' ) ).toEqual( {
			row: '50',
			column: '12px',
			pair: true,
		} );
	} );

	test( 'calc() stays one part', () => {
		expect( splitTopLevel( 'calc(1rem + 2px) 4px' ) ).toEqual( [
			'calc(1rem + 2px)',
			'4px',
		] );
		expect( parseGap( 'calc(1rem + 2px)' ).pair ).toBe( false );
	} );

	test( 'matching parts store one value, different parts store the shorthand', () => {
		expect( composeGap( '20px', '20px' ) ).toBe( '20px' );
		expect( composeGap( '50', '50' ) ).toBe( '50' );
		expect( composeGap( '16px', '12px' ) ).toBe( '16px 12px' );
	} );

	test( 'a preset inside a pair is its var, an empty part is 0', () => {
		expect( composeGap( '50', '12px' ) ).toBe(
			'var(--wp--preset--spacing--50) 12px'
		);
		expect( composeGap( '16px', '' ) ).toBe( '16px 0' );
	} );
} );

describe( 'SgsGapControl', () => {
	test( 'a single stored value opens linked: one row, the stored value', () => {
		mount( { label: 'Gap', value: '20px', onChange: jest.fn() } );
		expect( rows() ).toHaveLength( 1 );
		expect( rows()[ 0 ].dataset.label ).toBe( 'Gap' );
		expect( rows()[ 0 ].dataset.value ).toBe( '20px' );
	} );

	test( 'a stored pair with two different parts opens unlinked with a Row gap and a Column gap', () => {
		mount( { label: 'Gap', value: '16px 12px', onChange: jest.fn() } );
		expect(
			rows().map( ( r ) => [ r.dataset.label, r.dataset.value ] )
		).toEqual( [
			[ 'Row gap', '16px' ],
			[ 'Column gap', '12px' ],
		] );
	} );

	test( 'linked writes one value', () => {
		const onChange = jest.fn();
		mount( { label: 'Gap', value: '', onChange } );
		press( 'len-Gap' );
		expect( onChange ).toHaveBeenCalledWith( '8px' );
	} );

	test( 'unlinking shows both rows without writing, then a column edit stores the pair', () => {
		const onChange = jest.fn();
		mount( { label: 'Gap', value: '20px', onChange } );
		act( () => button( 'Set row and column gaps separately' ).click() );
		expect( onChange ).not.toHaveBeenCalled();
		expect( rows().map( ( r ) => r.dataset.label ) ).toEqual( [
			'Row gap',
			'Column gap',
		] );
		press( 'len-Column gap' );
		expect( onChange ).toHaveBeenCalledWith( '20px 8px' );
	} );

	test( 'a preset picked in one part is a var inside the pair', () => {
		const onChange = jest.fn();
		mount( { label: 'Gap', value: '16px 12px', onChange } );
		press( 'write-Row gap' );
		expect( onChange ).toHaveBeenCalledWith(
			'var(--wp--preset--spacing--40) 12px'
		);
	} );

	test( 'relinking collapses the pair to its row value', () => {
		const onChange = jest.fn();
		mount( { label: 'Gap', value: '16px 12px', onChange } );
		act( () => button( 'Link row and column gaps' ).click() );
		expect( onChange ).toHaveBeenCalledWith( '16px' );
	} );

	test( 'an inherited pair shows as the two placeholders', () => {
		mount( {
			label: 'Gap',
			value: '16px 12px',
			placeholder: '30px 10px',
			onChange: jest.fn(),
		} );
		expect( rows().map( ( r ) => r.dataset.placeholder ) ).toEqual( [
			'30px',
			'10px',
		] );
	} );

	test( 'a value that is not one or two lengths goes to the linked row whole', () => {
		mount( { label: 'Gap', value: '1px 2px 3px', onChange: jest.fn() } );
		expect( rows() ).toHaveLength( 1 );
		expect( rows()[ 0 ].dataset.value ).toBe( '1px 2px 3px' );
	} );
} );
