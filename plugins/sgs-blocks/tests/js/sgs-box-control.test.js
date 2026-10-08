/**
 * SgsBoxControl — the shared padding / margin / radius control.
 *
 * The real component renders into jsdom; core's inputs are replaced by stand-ins that expose their props, so a
 * test can operate a control and read back what the component wrote.
 *
 * Negative control: with `customRows` taken out of `presetRow`'s select value (the select derived from the stored
 * value alone, as it did before), "Custom… picked from Default stays on Custom" fails.
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const h = React.createElement;

const SIZES = [
	{ slug: '30', name: 'S', size: '1rem' },
	{ slug: '40', name: 'M', size: '1.5rem' },
];

jest.mock( '@wordpress/block-editor', () => ( {
	useSettings: jest.fn( () => [ SIZES ] ),
} ) );

jest.mock( '@wordpress/icons', () => {
	const names = [
		'link',
		'linkOff',
		'sidesAll',
		'sidesTop',
		'sidesRight',
		'sidesBottom',
		'sidesLeft',
		'cornerAll',
		'cornerTopLeft',
		'cornerTopRight',
		'cornerBottomRight',
		'cornerBottomLeft',
	];
	const icons = Object.fromEntries( names.map( ( n ) => [ n, { iconName: n } ] ) );
	icons.Icon = ( { icon } ) => require( 'react' ).createElement( 'span', { 'data-icon': icon.iconName } );
	return icons;
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const box =
		( name ) =>
		( { children, className } ) =>
			R.createElement( 'div', { 'data-testid': name, className }, children );
	const BaseControl = box( 'BaseControl' );
	BaseControl.VisualLabel = ( { children, id } ) => R.createElement( 'span', { id, 'data-testid': 'label' }, children );
	return {
		BaseControl,
		Flex: box( 'Flex' ),
		FlexItem: box( 'FlexItem' ),
		FlexBlock: box( 'FlexBlock' ),
		__experimentalVStack: box( 'VStack' ),
		Button: ( { label, onClick, size, isPressed, icon } ) =>
			R.createElement( 'button', {
				'data-testid': 'link-button',
				'aria-label': label,
				'data-size': size,
				'data-pressed': isPressed === undefined ? 'none' : String( isPressed ),
				'data-icon': icon?.iconName,
				onClick,
			} ),
		SelectControl: ( { label, value, options, onChange } ) =>
			R.createElement(
				'select',
				{ 'aria-label': label, value, onChange: ( e ) => onChange( e.target.value ) },
				options.map( ( o ) => R.createElement( 'option', { key: o.value, value: o.value }, o.label ) )
			),
		__experimentalUnitControl: ( { label, value, placeholder, onChange } ) =>
			R.createElement( 'input', {
				'data-testid': 'value-box',
				'aria-label': label,
				value,
				placeholder,
				onChange: ( e ) => onChange( e.target.value ),
			} ),
		RangeControl: () => R.createElement( 'input', { 'data-testid': 'slider', type: 'range' } ),
	};
} );

const SgsBoxControl = require( '../../src/components/SgsBoxControl' ).default;

let container;
let root;
beforeEach( () => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );
afterEach( () => {
	act( () => root.unmount() );
	container.remove();
} );

/** Renders a controlled box whose stored values follow every onChange; returns the onChange spy. */
function renderControlled( initial = {}, props = {} ) {
	const writes = [];
	function Harness() {
		const [ values, setValues ] = React.useState( initial );
		return h( SgsBoxControl, {
			label: 'Padding',
			presets: true,
			...props,
			values,
			onChange: ( next ) => {
				writes.push( next );
				setValues( next );
			},
		} );
	}
	act( () => root.render( h( Harness ) ) );
	return writes;
}

const selects = () => [ ...container.querySelectorAll( 'select' ) ];
const valueBoxes = () => [ ...container.querySelectorAll( '[data-testid="value-box"]' ) ];

function change( el, value ) {
	const setter = Object.getOwnPropertyDescriptor( Object.getPrototypeOf( el ), 'value' ).set;
	act( () => {
		setter.call( el, value );
		el.dispatchEvent( new Event( el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true } ) );
	} );
}

describe( 'SgsBoxControl preset row', () => {
	test( 'Custom… picked from Default stays on Custom and writes nothing until a value is typed', () => {
		const writes = renderControlled();
		change( selects()[ 0 ], '__custom__' );
		expect( selects()[ 0 ].value ).toBe( '__custom__' );
		expect( writes ).toEqual( [] );
		change( valueBoxes()[ 0 ], '20px' );
		expect( writes.at( -1 ) ).toEqual( { top: '20px', right: '20px', bottom: '20px', left: '20px' } );
		expect( selects()[ 0 ].value ).toBe( '__custom__' );
	} );

	test( 'a preset stores its var() and the value box shows its size', () => {
		const writes = renderControlled();
		change( selects()[ 0 ], '40' );
		expect( writes.at( -1 ).top ).toBe( 'var(--wp--preset--spacing--40)' );
		expect( selects()[ 0 ].value ).toBe( '40' );
		expect( valueBoxes()[ 0 ].value ).toBe( '1.5rem' );
	} );

	test( 'typing over a preset stores a length and flips the select to Custom', () => {
		const writes = renderControlled( {
			top: 'var(--wp--preset--spacing--40)',
			right: 'var(--wp--preset--spacing--40)',
			bottom: 'var(--wp--preset--spacing--40)',
			left: 'var(--wp--preset--spacing--40)',
		} );
		change( valueBoxes()[ 0 ], '30px' );
		expect( writes.at( -1 ).left ).toBe( '30px' );
		expect( selects()[ 0 ].value ).toBe( '__custom__' );
	} );

	test( 'preset options show names only, and there is no slider', () => {
		renderControlled();
		const labels = [ ...selects()[ 0 ].options ].map( ( o ) => o.textContent );
		expect( labels ).toEqual( [ 'Default', 'S', 'M', 'Custom…' ] );
		expect( container.querySelector( '[data-testid="slider"]' ) ).toBeNull();
	} );
} );

describe( 'SgsBoxControl header and side icons', () => {
	test( 'the link button sits in the header, small and never pressed', () => {
		renderControlled();
		const buttons = container.querySelectorAll( '[data-testid="link-button"]' );
		expect( buttons ).toHaveLength( 1 );
		expect( buttons[ 0 ].closest( '.sgs-box-control__header' ) ).not.toBeNull();
		expect( buttons[ 0 ].dataset.size ).toBe( 'small' );
		expect( buttons[ 0 ].dataset.pressed ).toBe( 'none' );
		expect( container.querySelector( '[role="group"]' ).getAttribute( 'aria-labelledby' ) ).toBe(
			container.querySelector( '[data-testid="label"]' ).id
		);
	} );

	test( 'linked shows the all-sides icon; unlinked shows one side icon per row, still one link button', () => {
		renderControlled( { top: '1px', right: '2px', bottom: '3px', left: '4px' } );
		const icons = [ ...container.querySelectorAll( '.sgs-box-control__side-icon [data-icon]' ) ].map(
			( el ) => el.dataset.icon
		);
		expect( icons ).toEqual( [ 'sidesTop', 'sidesRight', 'sidesBottom', 'sidesLeft' ] );
		expect( container.querySelectorAll( '[data-testid="link-button"]' ) ).toHaveLength( 1 );
		act( () => container.querySelector( '[data-testid="link-button"]' ).click() );
		const linked = [ ...container.querySelectorAll( '.sgs-box-control__side-icon [data-icon]' ) ].map(
			( el ) => el.dataset.icon
		);
		expect( linked ).toEqual( [ 'sidesAll' ] );
	} );

	test( 'a radius uses corner icons', () => {
		renderControlled( {}, { sides: [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ], presets: false } );
		expect( container.querySelector( '.sgs-box-control__side-icon [data-icon]' ).dataset.icon ).toBe( 'cornerAll' );
		expect( container.querySelector( '[data-testid="slider"]' ) ).not.toBeNull();
	} );
} );
