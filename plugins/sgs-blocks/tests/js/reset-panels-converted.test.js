/**
 * Stage E2 item 2: a ToolsPanel whose items were all shown by default is now a panel with one small Reset. Two of the
 * converted panels, mounted for real: Reset is absent while nothing is set, present once a control holds a value, and
 * clears every control the old panel's items cleared.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () =>
	jest.requireActual( '../../node_modules/@wordpress/i18n' )
);
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const Box =
		( tag ) =>
		( { children } ) =>
			R.createElement( tag, null, children );
	return {
		PanelBody: ( { title, children, initialOpen, className } ) =>
			R.createElement(
				'section',
				{
					className,
					'data-title': title,
					'data-open': String( initialOpen ),
				},
				children
			),
		Button: ( { children, onClick, className } ) =>
			R.createElement(
				'button',
				{ type: 'button', onClick, className },
				children
			),
		RangeControl: Box( 'div' ),
		TextControl: Box( 'div' ),
	};
} );
jest.mock( '../../src/components', () => {
	const R = require( 'react' );
	const Stub = () => null;
	return {
		BOX_UNITS: [],
		normaliseResponsiveBox: ( v ) => v,
		ResponsiveOverride: ( { children } ) =>
			R.createElement(
				'div',
				null,
				children( { ownValue: {}, setOwnValue: () => {} } )
			),
		SgsBoxControl: Stub,
		DesignTokenPicker: Stub,
		ResponsiveLengthControl: Stub,
	};
} );
jest.mock( '../../src/utils/spacing-defaults', () => ( {
	spacingDefaultsFor: () => undefined,
} ) );
jest.mock( '../../src/components/motion/EasingAtom', () => ( {
	__esModule: true,
	default: () => null,
} ) );

const DrawerHoverControls =
	require( '../../src/blocks/mega-panel/DrawerHoverControls' ).default;
const FieldMarksPanel =
	require( '../../src/blocks/form/FieldMarksPanel' ).default;

const h = React.createElement;
function mountNode( node ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( node ) );
	return { container, unmount: () => act( () => root.unmount() ) };
}
const click = ( el ) =>
	act( () =>
		el.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
	);
const merged = ( mock ) =>
	Object.assign( {}, ...mock.mock.calls.map( ( c ) => c[ 0 ] ) );

describe( 'a nested converted panel (Drawer hover effects)', () => {
	const ALL_SET = {
		drawerLinkTextShiftHover: 6,
		drawerLinkTrailingColourHover: 'accent',
		drawerCardHoverLift: 4,
		drawerCardHoverRotate: 2,
		drawerCardLinkShiftHover: 3,
		drawerHoverDuration: 500,
		drawerHoverEasing: 'linear',
		drawerHoverEasingCustom: '',
	};

	it( 'draws a light inner section, not a second panel, and no Reset while at the defaults', () => {
		const { container, unmount } = mountNode(
			h( DrawerHoverControls, {
				attributes: {},
				setAttributes: jest.fn(),
			} )
		);
		expect(
			container.querySelector( 'section.sgs-inner-section' )
		).not.toBeNull();
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		unmount();
	} );

	it( 'shows Reset when any one of its range rows is set (the rows come from a helper)', () => {
		const { container, unmount } = mountNode(
			h( DrawerHoverControls, {
				attributes: { drawerCardHoverLift: 4 },
				setAttributes: jest.fn(),
			} )
		);
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).not.toBeNull();
		unmount();
	} );

	it( 'Reset clears every attribute the old panel cleared', () => {
		const setAttributes = jest.fn();
		const { container, unmount } = mountNode(
			h( DrawerHoverControls, { attributes: ALL_SET, setAttributes } )
		);
		click( container.querySelector( '.sgs-panel-reset__button' ) );
		expect( merged( setAttributes ) ).toEqual( {
			drawerLinkTextShiftHover: 0,
			drawerLinkTrailingColourHover: '',
			drawerCardHoverLift: 0,
			drawerCardHoverRotate: 0,
			drawerCardLinkShiftHover: 0,
			drawerHoverDuration: 300,
			drawerHoverEasing: 'ease',
			drawerHoverEasingCustom: '',
		} );
		unmount();
	} );
} );

describe( 'a nested converted panel (Label marks)', () => {
	it( 'shows Reset only while the optional text or the gap is set', () => {
		const empty = mountNode(
			h( FieldMarksPanel, { attributes: {}, setAttributes: jest.fn() } )
		);
		expect(
			empty.container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		empty.unmount();
		const setAttributes = jest.fn();
		const held = mountNode(
			h( FieldMarksPanel, {
				attributes: { optionalText: '(optional)' },
				setAttributes,
			} )
		);
		click( held.container.querySelector( '.sgs-panel-reset__button' ) );
		expect( Object.keys( merged( setAttributes ) ) ).toEqual(
			expect.arrayContaining( [ 'optionalText' ] )
		);
		held.unmount();
	} );
} );
