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
		'sidesAxial',
		'sidesVertical',
		'sidesHorizontal',
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

describe( 'SgsBoxControl declared defaults', () => {
	const preset = ( slug ) => `var(--wp--preset--spacing--${ slug })`;
	const footer = { top: preset( 30 ), right: preset( 40 ), bottom: preset( 30 ), left: preset( 40 ) };

	test( 'an untouched side shows its declared preset as "Default (name)" with the size as placeholder, writing nothing', () => {
		const writes = renderControlled( {}, { defaults: footer } );
		// The sides differ, so the box starts unlinked: one row per side.
		expect( selects() ).toHaveLength( 4 );
		expect( selects().map( ( s ) => s.value ) ).toEqual( [ '', '', '', '' ] );
		expect( selects().map( ( s ) => s.options[ 0 ].textContent ) ).toEqual( [
			'Default (S)',
			'Default (M)',
			'Default (S)',
			'Default (M)',
		] );
		expect( valueBoxes().map( ( b ) => b.placeholder ) ).toEqual( [ '1rem', '1.5rem', '1rem', '1.5rem' ] );
		expect( valueBoxes().map( ( b ) => b.value ) ).toEqual( [ '', '', '', '' ] );
		expect( writes ).toEqual( [] );
	} );

	test( 'a side with only some sides declared names the declared ones and leaves the rest plain', () => {
		renderControlled( {}, { defaults: { top: preset( 40 ), bottom: preset( 40 ) } } );
		expect( selects().map( ( s ) => s.options[ 0 ].textContent ) ).toEqual( [
			'Default (M)',
			'Default',
			'Default (M)',
			'Default',
		] );
	} );

	test( 'a value inherited from a wider tier beats the declared default', () => {
		renderControlled(
			{},
			{ defaults: footer, inherited: { top: '20px', right: '20px', bottom: '20px', left: '20px' } }
		);
		expect( selects() ).toHaveLength( 1 );
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default (20px)' );
		expect( valueBoxes()[ 0 ].placeholder ).toBe( '20px' );
	} );

	test( 'a stored side shows its own value, not the default', () => {
		renderControlled( { top: preset( 40 ) }, { defaults: footer } );
		expect( selects()[ 0 ].value ).toBe( '40' );
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default' );
		expect( selects()[ 1 ].options[ 0 ].textContent ).toBe( 'Default (M)' );
	} );

	test( 'a declared literal length reads "Default (20px)" with the length as placeholder, writing nothing', () => {
		const writes = renderControlled(
			{},
			{ defaults: { top: preset( 30 ), right: '20px', bottom: preset( 30 ), left: '20px' } }
		);
		expect( selects().map( ( s ) => s.value ) ).toEqual( [ '', '', '', '' ] );
		expect( selects().map( ( s ) => s.options[ 0 ].textContent ) ).toEqual( [
			'Default (S)',
			'Default (20px)',
			'Default (S)',
			'Default (20px)',
		] );
		expect( valueBoxes().map( ( b ) => b.placeholder ) ).toEqual( [ '1rem', '20px', '1rem', '20px' ] );
		expect( valueBoxes().map( ( b ) => b.value ) ).toEqual( [ '', '', '', '' ] );
		expect( writes ).toEqual( [] );
	} );

	test( 'without presets the value box shows the declared default as its placeholder (a preset as its size)', () => {
		const writes = renderControlled( {}, { presets: false, defaults: { top: preset( 40 ), right: '20px' }, sides: [ 'top', 'right' ] } );
		expect( selects() ).toHaveLength( 0 );
		expect( valueBoxes().map( ( b ) => b.placeholder ) ).toEqual( [ '1.5rem', '20px' ] );
		expect( valueBoxes().map( ( b ) => b.value ) ).toEqual( [ '', '' ] );
		expect( writes ).toEqual( [] );
	} );

	test( 'negative control: without defaults an untouched side reads plain Default with no placeholder', () => {
		renderControlled();
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default' );
		expect( valueBoxes()[ 0 ].placeholder ).toBe( '' );
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

describe( 'SgsBoxControl Custom state across link and unlink', () => {
	const linkButton = () => container.querySelector( '[data-testid="link-button"]' );
	const toggle = () => act( () => linkButton().click() );

	// Rule: the linked row reads Custom when ANY side was Custom (or holds a typed length) before it linked.
	test( 'Custom picked on the linked row (nothing typed) carries to every side row on unlink', () => {
		renderControlled();
		change( selects()[ 0 ], '__custom__' );
		toggle();
		expect( selects() ).toHaveLength( 4 );
		expect( selects().map( ( s ) => s.value ) ).toEqual( [ '__custom__', '__custom__', '__custom__', '__custom__' ] );
	} );

	test( 'a side set to Custom (nothing typed) makes the linked row Custom after re-linking, with no stale key', () => {
		renderControlled( { right: '2px' } ); // Sides differ, so the box starts unlinked.
		expect( selects() ).toHaveLength( 4 );
		change( selects()[ 2 ], '__custom__' ); // Bottom: Custom, nothing typed.
		toggle();
		expect( selects() ).toHaveLength( 1 );
		expect( selects()[ 0 ].value ).toBe( '__custom__' );
		toggle(); // Back to sides: the linked key is spent, each side carries Custom.
		expect( selects().map( ( s ) => s.value ) ).toEqual( [ '__custom__', '__custom__', '__custom__', '__custom__' ] );
	} );

	test( 'negative control: nothing Custom stays Default through unlink and re-link', () => {
		renderControlled();
		toggle();
		expect( selects().map( ( s ) => s.value ) ).toEqual( [ '', '', '', '' ] );
		toggle();
		expect( selects().map( ( s ) => s.value ) ).toEqual( [ '' ] );
	} );

	test( 'a side row switched off Custom does not leave the linked row on Custom', () => {
		renderControlled();
		change( selects()[ 0 ], '__custom__' );
		toggle();
		selects().forEach( ( s ) => change( s, '' ) );
		toggle();
		expect( selects()[ 0 ].value ).toBe( '' );
	} );
} );

describe( 'SgsBoxControl never shows a raw var()', () => {
	const preset = ( slug, fallback ) => `var(--wp--preset--spacing--${ slug }${ fallback ? `, ${ fallback }` : '' })`;
	const all = ( value ) => ( { top: value, right: value, bottom: value, left: value } );

	test( 'an unknown slug with no fallback reads plain Default with an empty placeholder', () => {
		renderControlled( {}, { defaults: all( preset( 90 ) ) } );
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default' );
		expect( valueBoxes()[ 0 ].placeholder ).toBe( '' );
	} );

	test( 'an unknown slug with a fallback length uses the fallback', () => {
		renderControlled( {}, { defaults: all( preset( 90, '2rem' ) ) } );
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default (2rem)' );
		expect( valueBoxes()[ 0 ].placeholder ).toBe( '2rem' );
	} );

	test( 'a known slug still resolves to its name and size', () => {
		renderControlled( {}, { defaults: all( preset( 40 ) ) } );
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default (M)' );
		expect( valueBoxes()[ 0 ].placeholder ).toBe( '1.5rem' );
	} );

	test( 'an inherited unknown slug is not shown raw either', () => {
		renderControlled( {}, { inherited: all( preset( 90 ) ) } );
		expect( selects()[ 0 ].options[ 0 ].textContent ).toBe( 'Default' );
		expect( valueBoxes()[ 0 ].placeholder ).toBe( '' );
	} );
} );

describe( 'SgsBoxControl paired vertical / horizontal mode (splitOnAxis)', () => {
	const linkButton = () => container.querySelector( '[data-testid="link-button"]' );
	const toggle = () => act( () => linkButton().click() );
	const rowIcons = () =>
		[ ...container.querySelectorAll( '.sgs-box-control__side-icon [data-icon]' ) ].map( ( el ) => el.dataset.icon );
	const rowLabels = () => selects().map( ( s ) => s.getAttribute( 'aria-label' ) );
	const selectValues = () => selects().map( ( s ) => s.value );
	const preset = ( slug ) => `var(--wp--preset--spacing--${ slug })`;
	const pair = { top: '10px', right: '20px', bottom: '10px', left: '20px' };
	const SIDES_LABELS = [ 'Top', 'Right', 'Bottom', 'Left' ];

	test( 'cycles linked, then Vertical and Horizontal, then each side, then linked again', () => {
		renderControlled( {}, { splitOnAxis: true } );
		expect( rowLabels() ).toEqual( [ 'Padding' ] );
		expect( linkButton().getAttribute( 'aria-label' ) ).toBe( 'Set vertical and horizontal separately' );
		toggle();
		expect( rowLabels() ).toEqual( [ 'Vertical', 'Horizontal' ] );
		expect( rowIcons() ).toEqual( [ 'sidesVertical', 'sidesHorizontal' ] );
		expect( linkButton().getAttribute( 'aria-label' ) ).toBe( 'Set each side separately' );
		toggle();
		expect( rowLabels() ).toEqual( SIDES_LABELS );
		expect( linkButton().getAttribute( 'aria-label' ) ).toBe( 'Link sides' );
		toggle();
		expect( rowLabels() ).toEqual( [ 'Padding' ] );
	} );

	test( 'negative control: without the prop it is two states and never shows Vertical or Horizontal', () => {
		renderControlled( {} );
		expect( linkButton().getAttribute( 'aria-label' ) ).toBe( 'Unlink sides' );
		toggle();
		expect( rowLabels() ).toEqual( SIDES_LABELS );
		expect( linkButton().getAttribute( 'aria-label' ) ).toBe( 'Link sides' );
		toggle();
		expect( rowLabels() ).toEqual( [ 'Padding' ] );
		expect( container.textContent ).not.toMatch( /Vertical|Horizontal/ );
		expect( rowIcons() ).not.toContain( 'sidesVertical' );
	} );

	test( 'opens paired when top equals bottom and left equals right but not all four', () => {
		renderControlled( pair, { splitOnAxis: true } );
		expect( rowLabels() ).toEqual( [ 'Vertical', 'Horizontal' ] );
		expect( valueBoxes().map( ( b ) => b.value ) ).toEqual( [ '10px', '20px' ] );
	} );

	test( 'opens linked when all four are equal', () => {
		renderControlled( { top: '5px', right: '5px', bottom: '5px', left: '5px' }, { splitOnAxis: true } );
		expect( rowLabels() ).toEqual( [ 'Padding' ] );
	} );

	test( 'opens per side when the sides do not pair up', () => {
		renderControlled( { top: '1px', right: '2px', bottom: '3px', left: '4px' }, { splitOnAxis: true } );
		expect( rowLabels() ).toEqual( SIDES_LABELS );
	} );

	test( 'without the prop a paired value still opens per side', () => {
		renderControlled( pair );
		expect( rowLabels() ).toEqual( SIDES_LABELS );
	} );

	test( 'Vertical writes top and bottom only; Horizontal writes left and right only', () => {
		const writes = renderControlled( pair, { splitOnAxis: true } );
		change( valueBoxes()[ 0 ], '30px' );
		expect( writes.at( -1 ) ).toEqual( { top: '30px', right: '20px', bottom: '30px', left: '20px' } );
		change( valueBoxes()[ 1 ], '40px' );
		expect( writes.at( -1 ) ).toEqual( { top: '30px', right: '40px', bottom: '30px', left: '40px' } );
	} );

	test( 'a preset picked on Vertical stores its var() on top and bottom only', () => {
		const writes = renderControlled( pair, { splitOnAxis: true } );
		change( selects()[ 0 ], '40' );
		expect( writes.at( -1 ) ).toEqual( { top: preset( 40 ), right: '20px', bottom: preset( 40 ), left: '20px' } );
	} );

	test( 'moving from paired to each side writes nothing, so no value is invented', () => {
		const writes = renderControlled( pair, { splitOnAxis: true } );
		toggle();
		expect( writes ).toEqual( [] );
		expect( valueBoxes().map( ( b ) => b.value ) ).toEqual( [ '10px', '20px', '10px', '20px' ] );
	} );

	test( 'from each side to linked collapses to the first side, and linked to paired needs no further write', () => {
		const writes = renderControlled( { top: '1px', right: '2px', bottom: '3px', left: '4px' }, { splitOnAxis: true } );
		toggle();
		expect( writes.at( -1 ) ).toEqual( { top: '1px', right: '1px', bottom: '1px', left: '1px' } );
		const count = writes.length;
		toggle();
		expect( rowLabels() ).toEqual( [ 'Vertical', 'Horizontal' ] );
		expect( writes ).toHaveLength( count );
	} );

	test( 'Custom on Vertical (a typed length) carries to top and bottom only, and back up through linked', () => {
		renderControlled( pair, { splitOnAxis: true } );
		expect( selectValues() ).toEqual( [ '__custom__', '__custom__' ] );
		change( selects()[ 1 ], '' ); // Horizontal back to Default
		expect( selectValues() ).toEqual( [ '__custom__', '' ] );
		toggle(); // each side
		expect( rowLabels() ).toEqual( SIDES_LABELS );
		expect( selectValues() ).toEqual( [ '__custom__', '', '__custom__', '' ] );
	} );

	test( 'Custom picked with nothing typed on Vertical carries to top and bottom', () => {
		renderControlled( {}, { splitOnAxis: true } );
		toggle(); // paired, nothing stored
		change( selects()[ 0 ], '__custom__' );
		expect( selectValues() ).toEqual( [ '__custom__', '' ] );
		toggle(); // each side
		expect( selectValues() ).toEqual( [ '__custom__', '', '__custom__', '' ] );
		toggle(); // linked: a Custom side makes the linked row Custom
		expect( selectValues() ).toEqual( [ '__custom__' ] );
		toggle(); // paired again: the linked Custom reaches both axes
		expect( selectValues() ).toEqual( [ '__custom__', '__custom__' ] );
	} );

	test( 'Custom on the linked row carries to Vertical and Horizontal and on to every side', () => {
		renderControlled( {}, { splitOnAxis: true } );
		change( selects()[ 0 ], '__custom__' );
		toggle();
		expect( selectValues() ).toEqual( [ '__custom__', '__custom__' ] );
		toggle();
		expect( selectValues() ).toEqual( [ '__custom__', '__custom__', '__custom__', '__custom__' ] );
	} );

	test( 'negative control: nothing Custom stays Default through every transition', () => {
		renderControlled( {}, { splitOnAxis: true } );
		toggle();
		expect( selectValues() ).toEqual( [ '', '' ] );
		toggle();
		expect( selectValues() ).toEqual( [ '', '', '', '' ] );
		toggle();
		expect( selectValues() ).toEqual( [ '' ] );
	} );

	test( 'declared defaults show on the axis rows, writing nothing', () => {
		const writes = renderControlled(
			{},
			{ splitOnAxis: true, defaults: { top: preset( 30 ), bottom: preset( 30 ), left: preset( 40 ), right: preset( 40 ) } }
		);
		expect( rowLabels() ).toEqual( [ 'Vertical', 'Horizontal' ] );
		expect( selects().map( ( s ) => s.options[ 0 ].textContent ) ).toEqual( [ 'Default (S)', 'Default (M)' ] );
		expect( valueBoxes().map( ( b ) => b.placeholder ) ).toEqual( [ '1rem', '1.5rem' ] );
		expect( writes ).toEqual( [] );
	} );

	test( 'a value inherited from a wider tier shows on the axis rows', () => {
		renderControlled( {}, { splitOnAxis: true, inherited: { top: '8px', bottom: '8px', left: '12px', right: '12px' } } );
		expect( rowLabels() ).toEqual( [ 'Vertical', 'Horizontal' ] );
		expect( valueBoxes().map( ( b ) => b.placeholder ) ).toEqual( [ '8px', '12px' ] );
	} );

	test( 'paired rows without presets are value boxes and write both sides', () => {
		const writes = renderControlled( pair, { splitOnAxis: true, presets: false } );
		expect( selects() ).toHaveLength( 0 );
		expect( valueBoxes() ).toHaveLength( 2 );
		change( valueBoxes()[ 1 ], '50px' );
		expect( writes.at( -1 ) ).toEqual( { top: '10px', right: '50px', bottom: '10px', left: '50px' } );
	} );

	test( 'a radius (corners) never offers the paired mode', () => {
		renderControlled( {}, { splitOnAxis: true, sides: [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ], presets: false } );
		expect( linkButton().getAttribute( 'aria-label' ) ).toBe( 'Unlink sides' );
		toggle();
		expect( container.textContent ).not.toMatch( /Vertical|Horizontal/ );
	} );
} );
