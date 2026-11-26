/**
 * The shared Background panel (`BackgroundMediaPanel`, 8 blocks) holds "Background surface" and "Extra SVG layer" as
 * collapsed inner sections of its own panel (`panelContent.background`), and mounts no inspector slot of its own.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );
jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: ( name ) => ( {
		attributes:
			'sgs/nav-drawer' === name
				? { surfaceBlur: {} }
				: { backgroundSource: {}, surfaceTone: {}, surfaceBlur: {}, bgSvgContent: {} },
	} ),
} ) );
jest.mock( '@wordpress/block-editor', () => ( {
	InspectorControls: () => {
		throw new Error( 'BackgroundMediaPanel must not mount its own InspectorControls' );
	},
} ) );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const Box = ( tag ) => ( { children } ) => R.createElement( tag, null, children );
	return {
		RangeControl: Box( 'div' ),
		SelectControl: Box( 'div' ),
		TextareaControl: Box( 'div' ),
		ToggleControl: Box( 'div' ),
		Notice: Box( 'div' ),
	};
} );
jest.mock( '../../src/components/primitives', () => {
	const R = require( 'react' );
	const Box = ( tag ) => ( { children } ) => R.createElement( tag, null, children );
	return {
		ToolsPanel: ( { className, children } ) => R.createElement( 'div', { className }, children ),
		ToggleGroupControl: Box( 'div' ),
		ToggleGroupControlOption: Box( 'div' ),
	};
} );
jest.mock( '../../src/components', () => {
	const R = require( 'react' );
	return {
		MediaElementPanel: ( { panelContent, inGroup } ) =>
			R.createElement( 'div', { 'data-testid': 'media-panel', 'data-in-group': inGroup }, panelContent && panelContent.background ),
		SgsInnerSection: ( { title, hasValue, children } ) =>
			R.createElement(
				'section',
				{ 'data-inner': title, 'data-has-value': String( !! hasValue ) },
				children
			),
		SgsLengthControl: () => null,
		SurfaceGroundControls: () => null,
	};
} );

const { BackgroundMediaPanel } = require( '../../src/blocks/container/components/BackgroundMediaPanel' );

function render( name, attributes ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => {
		root.render(
			React.createElement( BackgroundMediaPanel, { name, attributes, setAttributes: jest.fn() } )
		);
	} );
	return { container, unmount: () => act( () => root.unmount() ) };
}

const inner = ( container ) =>
	[ ...container.querySelectorAll( '[data-inner]' ) ].map( ( n ) => n.getAttribute( 'data-inner' ) );

describe( 'BackgroundMediaPanel inner sections', () => {
	it( 'puts Background surface and Extra SVG layer inside the Background panel, with no slot of its own', () => {
		const { container, unmount } = render( 'sgs/container', {} );
		const panel = container.querySelector( '[data-testid="media-panel"]' );
		expect( inner( panel ) ).toEqual( [ 'Background surface', 'Extra SVG layer' ] );
		unmount();
	} );

	it( 'renders in place inside the Styles slot of its block, with no slot of its own', () => {
		const { container, unmount } = render( 'sgs/container', {} );
		expect( container.querySelector( '[data-testid="media-panel"]' ).getAttribute( 'data-in-group' ) ).toBe( 'styles' );
		unmount();
	} );

	it( 'shows the surface section alone on a block with no SVG layer', () => {
		const { container, unmount } = render( 'sgs/nav-drawer', {} );
		expect( inner( container ) ).toEqual( [ 'Background surface' ] );
		unmount();
	} );

	it( 'marks a closed section that holds a value', () => {
		const { container, unmount } = render( 'sgs/container', { surfaceTone: 'dark', bgSvgContent: '<svg/>' } );
		const flags = [ ...container.querySelectorAll( '[data-inner]' ) ].map( ( n ) => n.getAttribute( 'data-has-value' ) );
		expect( flags ).toEqual( [ 'true', 'true' ] );
		unmount();
		const clean = render( 'sgs/container', {} );
		const none = [ ...clean.container.querySelectorAll( '[data-inner]' ) ].map( ( n ) => n.getAttribute( 'data-has-value' ) );
		expect( none ).toEqual( [ 'false', 'false' ] );
		clean.unmount();
	} );

	it( 'hides the nested Surface tools panel title (the section title names it)', () => {
		const { container, unmount } = render( 'sgs/container', {} );
		expect( container.querySelector( '.sgs-nested-tools-panel' ) ).not.toBeNull();
		unmount();
	} );
} );
