/**
 * The shared border control's upgrades from `sgs/media`'s border panel (Bean, 2026-11-25): the nine border styles, and rows
 * that grey out with a plain reason. Both are opt-in, so a block that passes neither renders as before.
 *
 * `SgsBorderControl`'s children are replaced by stand-ins that print their props; `DisabledRow` and `borderWidthIsSet` are
 * the real ones.
 *
 * Guards (each was proven able to fail by breaking the rule in turn):
 *   1 a zero or empty width counts as a width              -> "borderWidthIsSet"
 *   2 the default style control stops being the icon row   -> "BorderStyleControl keeps the three icons by default"
 *   3 the nine styles are not offered when asked for       -> "BorderStyleControl offers nine styles as a select"
 *   4 requireWidth is on without being asked               -> "a block that asks for nothing keeps every row live"
 *   5 Style and Colour stay live with no width             -> "requireWidth greys Style and Colour out until a width is set"
 */
'use strict';

const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

import { borderWidthIsSet } from '../../src/utils/border-style';
import BorderStyleControl, {
	ALL_BORDER_STYLES,
} from '../../src/components/BorderStyleControl';
import SgsBorderControl from '../../src/components/SgsBorderControl';

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	Flex: ( { children } ) => require( 'react' ).createElement( 'div', null, children ),
	FlexItem: ( { children } ) => require( 'react' ).createElement( 'div', null, children ),
	SelectControl: ( { label, value, options, onChange } ) =>
		require( 'react' ).createElement(
			'select',
			{ 'aria-label': label, value, onChange: ( e ) => onChange( e.target.value ) },
			options.map( ( o ) =>
				require( 'react' ).createElement( 'option', { key: o.value, value: o.value }, o.label )
			)
		),
} ) );

jest.mock( '@wordpress/compose', () => ( {
	__esModule: true,
	useInstanceId: ( component, prefix ) => `${ prefix }-1`,
} ) );

jest.mock( '../../src/components/primitives', () => ( {
	__esModule: true,
	ToggleGroupControl: ( { children } ) =>
		require( 'react' ).createElement( 'div', { 'data-icons': 'true' }, children ),
	ToggleGroupControlOptionIcon: ( { value } ) =>
		require( 'react' ).createElement( 'i', { 'data-icon': value } ),
} ) );

jest.mock( '../../src/components/ResponsiveBoxControl', () => ( {
	__esModule: true,
	default: () => require( 'react' ).createElement( 'div', { 'data-row': 'width' } ),
	ResponsiveBorderRadiusControl: () =>
		require( 'react' ).createElement( 'div', { 'data-row': 'radius' } ),
} ) );

jest.mock( '../../src/components/GradientCapableColourControl', () => ( {
	__esModule: true,
	default: ( { borderStyles, borderStyleReason, onBorderStyleChange } ) =>
		require( 'react' ).createElement( 'div', {
			'data-row': 'colour',
			'data-style-inside': 'function' === typeof onBorderStyleChange ? 'true' : 'false',
			'data-border-styles': ( borderStyles || [] ).join( ',' ),
			'data-style-reason': borderStyleReason,
		} ),
} ) );

global.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
const mount = ( element ) => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
	act( () => root.render( element ) );
	return container;
};
afterEach( () => {
	if ( root ) {
		act( () => root.unmount() );
		container.remove();
		root = null;
	}
} );

const noop = () => {};

describe( 'borderWidthIsSet', () => {
	test.each( [
		[ undefined, false ],
		[ {}, false ],
		[ { top: '', right: '0', bottom: '0px', left: undefined }, false ],
		[ { top: '1px' }, true ],
		[ { top: 'var(--wp--preset--spacing--20)' }, true ],
		[ { desktop: { top: '' }, tablet: { left: '2px' } }, true ],
		[ { desktop: { top: '0' } }, false ],
	] )( '%j -> %s', ( width, expected ) => {
		expect( borderWidthIsSet( width ) ).toBe( expected );
	} );
} );

describe( 'BorderStyleControl', () => {
	test( 'keeps the three icons by default', () => {
		const out = mount( <BorderStyleControl value="solid" onChange={ noop } /> );
		expect( out.querySelector( '[data-icons]' ) ).not.toBeNull();
		expect( [ ...out.querySelectorAll( '[data-icon]' ) ].map( ( i ) => i.dataset.icon ) ).toEqual( [
			'solid',
			'dashed',
			'dotted',
		] );
		expect( out.querySelector( 'select' ) ).toBeNull();
	} );

	test( 'offers nine styles as a select when asked', () => {
		const seen = [];
		const out = mount(
			<BorderStyleControl
				value=""
				styles={ ALL_BORDER_STYLES }
				onChange={ ( next ) => seen.push( next ) }
			/>
		);
		const select = out.querySelector( 'select' );
		expect( [ ...select.options ].map( ( o ) => o.value ) ).toEqual( [
			'solid',
			'dashed',
			'dotted',
			'double',
			'groove',
			'ridge',
			'inset',
			'outset',
			'none',
		] );
		expect( select.value ).toBe( 'solid' );
		act( () => {
			select.value = 'ridge';
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );
		expect( seen ).toEqual( [ 'ridge' ] );
	} );

	test( 'a stored style the list lacks shows as itself', () => {
		const out = mount(
			<BorderStyleControl value="groove" styles={ [ 'solid', 'double' ] } onChange={ noop } />
		);
		const select = out.querySelector( 'select' );
		expect( select.value ).toBe( 'groove' );
		expect( [ ...select.options ].map( ( o ) => o.value ) ).toEqual( [ 'groove', 'solid', 'double' ] );
	} );
} );

describe( 'SgsBorderControl rows', () => {
	const base = {
		onWidthChange: noop,
		onStyleChange: noop,
		onColourChange: noop,
		onRadiusChange: noop,
	};

	test( 'a block that asks for nothing keeps every row live', () => {
		const out = mount( <SgsBorderControl { ...base } widthValues={ {} } /> );
		expect( out.querySelector( 'fieldset' ) ).toBeNull();
		expect( out.textContent ).toBe( '' );
	} );

	test( 'requireWidth greys Style and Colour out until a width is set', () => {
		const out = mount( <SgsBorderControl { ...base } widthValues={ {} } requireWidth /> );
		const sets = [ ...out.querySelectorAll( 'fieldset' ) ];
		expect( sets ).toHaveLength( 1 );
		expect( sets[ 0 ].disabled ).toBe( true );
		expect( sets[ 0 ].querySelector( '[data-row="colour"]' ) ).not.toBeNull();
		expect( out.textContent ).toContain( 'Set a border width first.' );
		expect( out.querySelector( '[data-row="width"]' ).closest( 'fieldset' ) ).toBeNull();
		expect( out.querySelector( '[data-row="radius"]' ).closest( 'fieldset' ) ).toBeNull();
		act( () => root.render( <SgsBorderControl { ...base } widthValues={ { top: '2px' } } requireWidth /> ) );
		expect( out.querySelector( 'fieldset' ) ).toBeNull();
	} );

	test( 'with no colour row the Style row carries the reason', () => {
		const out = mount(
			<SgsBorderControl { ...base } widthValues={ {} } requireWidth showColour={ false } />
		);
		const set = out.querySelector( 'fieldset' );
		expect( set.disabled ).toBe( true );
		expect( set.querySelector( 'select, [data-icons]' ) ).not.toBeNull();
	} );

	test( 'a reason a block names wins and reaches its own row', () => {
		const out = mount(
			<SgsBorderControl
				{ ...base }
				widthValues={ { top: '1px' } }
				requireWidth
				disabledRows={ { radius: 'Corners are not used with this shape.' } }
			/>
		);
		const radius = out.querySelector( '[data-row="radius"]' ).closest( 'fieldset' );
		expect( radius.disabled ).toBe( true );
		expect( radius.textContent ).toContain( 'Corners are not used with this shape.' );
	} );

	test( 'a greyed Colour row does not lock Style: Style is drawn beside it, live', () => {
		const out = mount(
			<SgsBorderControl
				{ ...base }
				widthValues={ { top: '1px' } }
				disabledRows={ { colour: 'Colour comes from the theme.' } }
			/>
		);
		const colour = out.querySelector( '[data-row="colour"]' );
		expect( colour.closest( 'fieldset' ).disabled ).toBe( true );
		expect( colour.dataset.styleInside ).toBe( 'false' );
		const style = out.querySelector( '[data-icons]' );
		expect( style ).not.toBeNull();
		expect( style.closest( 'fieldset' ) ).toBeNull();
		expect( out.textContent ).toContain( 'Colour comes from the theme.' );
		// With nothing greyed the style stays inside the colour popover, as before.
		act( () => root.render( <SgsBorderControl { ...base } widthValues={ { top: '1px' } } /> ) );
		expect( out.querySelector( '[data-row="colour"]' ).dataset.styleInside ).toBe( 'true' );
		expect( out.querySelector( '[data-icons]' ) ).toBeNull();
	} );

	test( 'the styles a block asks for reach the style control', () => {
		const out = mount(
			<SgsBorderControl { ...base } widthValues={ {} } styleOptions={ ALL_BORDER_STYLES } />
		);
		expect( out.querySelector( '[data-row="colour"]' ).dataset.borderStyles ).toContain( 'groove' );
	} );
} );
