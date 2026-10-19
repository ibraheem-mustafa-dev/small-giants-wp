/**
 * DesignTokenPicker — one shape: the thin swatch row whose palette pops out.
 *
 * A caller that passes no `states` still gets the popover row (one state, no tabs). The palette must not be in the
 * DOM until the trigger is opened, and picking a swatch in `linked` mode stores the theme token slug.
 *
 * Core's Dropdown renders its content only while open, and the colour palette fork is replaced by a stand-in that
 * lists one button per colour, so "palette swatch buttons present" is observable.
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const PALETTE = [
	{ slug: 'primary', color: '#112233' },
	{ slug: 'accent', color: '#ff8800' },
];

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	useSettings: () => [ [ { slug: 'primary', color: '#112233' }, { slug: 'accent', color: '#ff8800' } ] ],
} ) );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const el = R.createElement;
	return {
		__esModule: true,
		BaseControl: ( { children } ) => el( 'div', { 'data-legacy-basecontrol': 'true' }, children ),
		Button: ( { children, onClick, ...rest } ) =>
			el( 'button', { type: 'button', onClick, 'aria-expanded': rest[ 'aria-expanded' ] }, children ),
		ColorIndicator: () => el( 'i', { 'data-colour-indicator': 'true' } ),
		Dropdown: ( { renderToggle, renderContent } ) => {
			const [ isOpen, setOpen ] = R.useState( false );
			return el(
				'div',
				{ 'data-dropdown': 'true' },
				renderToggle( { isOpen, onToggle: () => setOpen( ( o ) => ! o ) } ),
				isOpen ? el( 'div', { 'data-popover': 'true' }, renderContent() ) : null
			);
		},
		Flex: ( { children } ) => el( 'div', null, children ),
		FlexItem: ( { children } ) => el( 'span', null, children ),
		TabPanel: ( { children, tabs } ) => el( 'div', null, children( tabs[ 0 ] ) ),
	};
} );

jest.mock( '../../src/components/primitives', () => {
	const R = require( 'react' );
	const pass = ( { children } ) => R.createElement( 'div', null, children );
	return {
		__esModule: true,
		HStack: pass,
		Item: pass,
		ItemGroup: pass,
		ZStack: pass,
		ToggleGroupControl: pass,
		ToggleGroupControlOption: pass,
	};
} );

jest.mock( '../../src/components/colour-picker', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		ColorPalette: ( { colors, onChange } ) =>
			R.createElement(
				'div',
				null,
				colors.map( ( c ) =>
					R.createElement( 'button', { key: c.slug, type: 'button', 'data-swatch': c.slug, onClick: () => onChange( c.color ) } )
				)
			),
	};
} );

jest.mock( '../../src/components/gradient-picker', () => ( { __esModule: true, default: () => null } ) );
jest.mock( '../../src/components/BorderStyleControl', () => ( { __esModule: true, default: () => null } ) );

const DesignTokenPicker = require( '../../src/components/DesignTokenPicker' ).default;

function mount( props ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( React.createElement( DesignTokenPicker, props ) ) );
	return { container, root };
}

describe( 'DesignTokenPicker without `states`', () => {
	it( 'renders a trigger and no palette until the trigger is clicked, then picks a slug in linked mode', () => {
		const onChange = jest.fn();
		const { container, root } = mount( { label: 'Shadow colour', value: 'primary', linked: true, onChange } );

		expect( container.querySelector( '[data-legacy-basecontrol]' ) ).toBeNull();
		const trigger = container.querySelector( '[data-dropdown] > button' );
		expect( trigger ).not.toBeNull();
		expect( trigger.textContent ).toContain( 'Shadow colour' );
		expect( container.querySelectorAll( '[data-swatch]' ) ).toHaveLength( 0 );

		act( () => trigger.click() );

		const popover = container.querySelector( '[data-popover]' );
		expect( popover ).not.toBeNull();
		expect( popover.querySelectorAll( '[data-swatch]' ) ).toHaveLength( PALETTE.length );

		act( () => popover.querySelector( '[data-swatch="accent"]' ).click() );
		expect( onChange ).toHaveBeenCalledWith( 'accent' );

		act( () => root.unmount() );
	} );

	it( 'stores the hex when not linked', () => {
		const onChange = jest.fn();
		const { container, root } = mount( { label: 'Swatch colour', value: '', onChange } );
		act( () => container.querySelector( '[data-dropdown] > button' ).click() );
		act( () => container.querySelector( '[data-swatch="primary"]' ).click() );
		expect( onChange ).toHaveBeenCalledWith( '#112233' );
		act( () => root.unmount() );
	} );
} );
