/**
 * SgsLengthControl — the shared single-length control, both scales.
 *
 * The real component renders into jsdom; core's inputs are replaced by stand-ins that expose their props, so a test
 * can operate the control and read back what it wrote and which slider range it gave core's RangeControl.
 *
 * Negative control: if the slider wrote the bare number (no unit) the "slider stores a length with a unit" test
 * fails, and if the unit lookup in `sliderRange` ignored the unit the "core ranges per unit" test fails.
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

const mockSettings = { sizes: SIZES };

jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		useSettings: jest.fn( () => [ mockSettings.sizes ] ),
		FontSizePicker: ( { value, valueMode, units, withSlider, onChange } ) =>
			R.createElement(
				'div',
				{
					'data-testid': 'font-size-picker',
					'data-value': value ?? '',
					'data-mode': valueMode,
					'data-units': units.join( ',' ),
					'data-slider': String( !! withSlider ),
				},
				R.createElement( 'button', {
					'data-testid': 'pick-preset',
					onClick: () => onChange( '1.5rem', { slug: 'large' } ),
				} ),
				R.createElement( 'button', {
					'data-testid': 'type-size',
					onClick: () => onChange( '24px' ),
				} ),
				R.createElement( 'button', {
					'data-testid': 'clear-size',
					onClick: () => onChange( undefined ),
				} )
			),
	};
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const box =
		( name ) =>
		( { children, className, style } ) =>
			R.createElement(
				'div',
				{ 'data-testid': name, className, style },
				children
			);
	const BaseControl = box( 'BaseControl' );
	BaseControl.VisualLabel = ( { children } ) =>
		R.createElement( 'span', { 'data-testid': 'label' }, children );
	return {
		BaseControl,
		Flex: box( 'Flex' ),
		FlexItem: box( 'FlexItem' ),
		FlexBlock: box( 'FlexBlock' ),
		__experimentalVStack: box( 'VStack' ),
		SelectControl: ( { label, value, options, onChange, disabled } ) =>
			R.createElement(
				'select',
				{
					'aria-label': label,
					value,
					disabled,
					onChange: ( e ) => onChange( e.target.value ),
				},
				options.map( ( o ) =>
					R.createElement(
						'option',
						{ key: o.value, value: o.value },
						o.label
					)
				)
			),
		__experimentalUnitControl: ( {
			label,
			value,
			placeholder,
			onChange,
			units,
			disabled,
		} ) =>
			R.createElement( 'input', {
				'data-testid': 'value-box',
				'aria-label': label,
				'data-units': units.map( ( u ) => u.value ).join( ',' ),
				value,
				placeholder,
				disabled,
				onChange: ( e ) => onChange( e.target.value ),
			} ),
		RangeControl: ( { value, min, max, step, onChange } ) =>
			R.createElement( 'input', {
				'data-testid': 'slider',
				type: 'range',
				value,
				'data-min': min,
				'data-max': max,
				'data-step': step,
				onChange: ( e ) => onChange( parseFloat( e.target.value ) ),
			} ),
	};
} );

const SgsLengthControl =
	require( '../../src/components/SgsLengthControl' ).default;
const { sliderRange } = require( '../../src/components/SgsLengthControl' );

let container;
let root;
beforeEach( () => {
	mockSettings.sizes = SIZES;
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );
afterEach( () => {
	act( () => root.unmount() );
	container.remove();
} );

/**
 * Renders a controlled length whose stored value follows every onChange; returns the writes.
 * @param initial
 * @param props
 */
function renderControlled( initial = '', props = {} ) {
	const writes = [];
	function Harness() {
		const [ value, setValue ] = React.useState( initial );
		return h( SgsLengthControl, {
			label: 'Gap',
			presets: true,
			...props,
			value,
			onChange: ( next ) => {
				writes.push( next );
				setValue( next );
			},
		} );
	}
	act( () => root.render( h( Harness ) ) );
	return writes;
}

const select = () => container.querySelector( 'select' );
const box = () => container.querySelector( '[data-testid="value-box"]' );
const slider = () => container.querySelector( '[data-testid="slider"]' );
const click = ( id ) =>
	act( () => {
		container
			.querySelector( `[data-testid="${ id }"]` )
			.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
	} );

function change( el, value ) {
	const setter = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf( el ),
		'value'
	).set;
	act( () => {
		setter.call( el, value );
		el.dispatchEvent(
			new Event( el.tagName === 'SELECT' ? 'change' : 'input', {
				bubbles: true,
			} )
		);
	} );
}

describe( 'SgsLengthControl spacing scale', () => {
	test( 'one row: names-only preset select, value box and slider', () => {
		renderControlled();
		expect( [ ...select().options ].map( ( o ) => o.textContent ) ).toEqual(
			[ '— none —', 'S', 'M', 'Custom…' ]
		);
		expect( box() ).not.toBeNull();
		expect( slider() ).not.toBeNull();
	} );

	test( 'a preset stores its slug and the value box shows its size', () => {
		const writes = renderControlled();
		change( select(), '40' );
		expect( writes.at( -1 ) ).toBe( '40' );
		expect( select().value ).toBe( '40' );
		expect( box().value ).toBe( '1.5rem' );
		expect( slider().value ).toBe( '1.5' );
	} );

	test( 'typing over a preset stores a length with a unit and flips the select to Custom', () => {
		const writes = renderControlled( '40' );
		change( box(), '30px' );
		expect( writes.at( -1 ) ).toBe( '30px' );
		expect( select().value ).toBe( '__custom__' );
	} );

	test( 'the slider stores a length WITH a unit, from the preset it started on', () => {
		const writes = renderControlled( '40' );
		change( slider(), '2' );
		expect( writes.at( -1 ) ).toBe( '2rem' );
		expect( select().value ).toBe( '__custom__' );
	} );

	test( 'Custom… from a preset starts from that preset size; from none it waits for a value', () => {
		const writes = renderControlled( '30' );
		change( select(), '__custom__' );
		expect( writes.at( -1 ) ).toBe( '1rem' );
		const none = renderControlled( '' );
		change( select(), '__custom__' );
		expect( none ).toEqual( [] );
	} );

	test( 'an unset value shows the inherited placeholder and the slider rests at it, writing nothing', () => {
		const writes = renderControlled( '', { placeholder: '24px' } );
		expect( box().placeholder ).toBe( '24px' );
		expect( slider().value ).toBe( '24' );
		expect( writes ).toEqual( [] );
	} );

	test( 'clearing the box writes an empty string', () => {
		const writes = renderControlled( '20px' );
		change( box(), '' );
		expect( writes.at( -1 ) ).toBe( '' );
	} );
} );

describe( 'SgsLengthControl core ranges per unit', () => {
	test( 'sliderRange returns core CUSTOM_VALUE_SETTINGS', () => {
		expect( sliderRange( 'px' ) ).toEqual( { min: 0, max: 300, step: 1 } );
		expect( sliderRange( 'rem' ) ).toEqual( {
			min: 0,
			max: 10,
			step: 0.1,
		} );
		expect( sliderRange( 'em' ) ).toEqual( { min: 0, max: 10, step: 0.1 } );
		expect( sliderRange( '%' ) ).toEqual( { min: 0, max: 100, step: 1 } );
		expect( sliderRange( 'vw' ) ).toEqual( { min: 0, max: 100, step: 1 } );
	} );

	test( 'a caller max tightens px (and rem/em by 16) but never % or the viewport units', () => {
		expect( sliderRange( 'px', 60 ).max ).toBe( 60 );
		expect( sliderRange( 'rem', 64 ).max ).toBe( 4 );
		expect( sliderRange( '%', 60 ).max ).toBe( 100 );
		expect( sliderRange( 'vw', 60 ).max ).toBe( 100 );
	} );

	test( 'the mounted slider takes the range of the stored unit', () => {
		renderControlled( '50%' );
		expect( slider().getAttribute( 'data-max' ) ).toBe( '100' );
		act( () => root.unmount() );
		root = createRoot( container );
		renderControlled( '2rem', { max: 60 } );
		// A caller max of 60px is 4rem; the step stays core's 0.1 for rem.
		expect( slider().getAttribute( 'data-max' ) ).toBe( '4' );
		expect( slider().getAttribute( 'data-step' ) ).toBe( '0.1' );
	} );
} );

describe( 'SgsLengthControl fallbacks and passthroughs', () => {
	test( 'no theme scale falls back to the plain value box and slider, no select', () => {
		mockSettings.sizes = [];
		renderControlled( '12px' );
		expect( select() ).toBeNull();
		expect( box().value ).toBe( '12px' );
		expect( slider() ).not.toBeNull();
	} );

	test( 'presets off is the plain control even when the theme has a scale', () => {
		renderControlled( '', { presets: false } );
		expect( select() ).toBeNull();
	} );

	test( 'an origin-keyed useSettings object still offers the scale', () => {
		mockSettings.sizes = { default: [], theme: SIZES };
		renderControlled();
		expect(
			[ ...select().options ].map( ( o ) => o.textContent )
		).toContain( 'M' );
	} );

	test( 'tokenPresets are stored verbatim after the scale', () => {
		const writes = renderControlled( '', {
			tokenPresets: [
				{ label: 'Medium distance', value: 'token:distance.md' },
			],
		} );
		expect( [ ...select().options ].map( ( o ) => o.textContent ) ).toEqual(
			[ '— none —', 'S', 'M', 'Medium distance', 'Custom…' ]
		);
		change( select(), 'token:distance.md' );
		expect( writes.at( -1 ) ).toBe( 'token:distance.md' );
		expect( select().value ).toBe( 'token:distance.md' );
	} );

	test( 'hideLabelFromVision drops the visible label; disabled reaches every part', () => {
		renderControlled( '20px', {
			hideLabelFromVision: true,
			disabled: true,
		} );
		expect( container.querySelector( '[data-testid="label"]' ) ).toBeNull();
		expect( select().disabled ).toBe( true );
		expect( box().disabled ).toBe( true );
	} );

	test( 'a visible label and help render', () => {
		renderControlled( '', { help: 'Some help' } );
		expect(
			container.querySelector( '[data-testid="label"]' ).textContent
		).toBe( 'Gap' );
		expect( container.textContent ).toContain( 'Some help' );
	} );
} );

describe( 'SgsLengthControl font-size scale', () => {
	const picker = () =>
		container.querySelector( '[data-testid="font-size-picker"]' );

	test( 'renders core FontSizePicker with the slider and core units, in literal mode for a length', () => {
		renderControlled( '24px', { scale: 'font-size' } );
		expect( picker().getAttribute( 'data-mode' ) ).toBe( 'literal' );
		expect( picker().getAttribute( 'data-value' ) ).toBe( '24px' );
		expect( picker().getAttribute( 'data-slider' ) ).toBe( 'true' );
		expect( picker().getAttribute( 'data-units' ) ).toBe(
			'px,em,rem,vw,vh'
		);
		expect( select() ).toBeNull();
	} );

	test( 'a stored preset var is read back as the slug', () => {
		renderControlled( 'var(--wp--preset--font-size--large)', {
			scale: 'font-size',
		} );
		expect( picker().getAttribute( 'data-mode' ) ).toBe( 'slug' );
		expect( picker().getAttribute( 'data-value' ) ).toBe( 'large' );
	} );

	test( 'a picked preset is stored as the font-size var; a typed size as its length; cleared as empty', () => {
		const writes = renderControlled( '', { scale: 'font-size' } );
		click( 'pick-preset' );
		expect( writes.at( -1 ) ).toBe( 'var(--wp--preset--font-size--large)' );
		click( 'type-size' );
		expect( writes.at( -1 ) ).toBe( '24px' );
		click( 'clear-size' );
		expect( writes.at( -1 ) ).toBe( '' );
	} );

	test( 'a number stored by an older save reads as px', () => {
		renderControlled( 32, { scale: 'font-size' } );
		expect( picker().getAttribute( 'data-value' ) ).toBe( '32px' );
	} );
} );
