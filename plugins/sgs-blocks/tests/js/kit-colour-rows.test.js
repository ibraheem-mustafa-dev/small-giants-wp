/**
 * The kits' colour rows join the block's one Colour panel (Stage E2 item 4).
 *
 * `builtinButtonColourRows` and `carouselDotsColourRows` build the kit's headed rows for a block's own `SgsColourPanel`; the
 * kit panels draw their own Colour panel only while the block does not take the rows (`colourInMainPanel`), and neither the rows
 * nor the panels appear while the declaration's `showWhen` does not hold.
 *
 * Negative controls (each guard was proven able to fail by breaking the source and re-running this file):
 *   1 the kit body ignores `colourInMainPanel`            -> "a block that takes the rows draws no Colour panel from the kit"
 *   2 the row helper ignores `showWhen`                   -> "no rows while the declaration's showWhen does not hold"
 *   3 the row helper drops the heading                    -> "the first row carries the declared label as its heading"
 *   4 CarouselControls drops the dots' rows               -> "carouselControlsColourRows joins the arrow and dot rows"
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { getBlockType } = require( '@wordpress/blocks' );

const h = React.createElement;

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	PanelBody: ( { title, children } ) => require( 'react' ).createElement( 'section', { 'data-panel': title }, children ),
	SelectControl: () => null,
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

const stub = () => ( { __esModule: true, default: () => null } );
jest.mock( '../../src/components/ResponsiveOverride', () => stub() );
jest.mock( '../../src/components/SgsLengthControl', () => stub() );
jest.mock( '../../src/components/SgsBoxControl', () => stub() );
jest.mock( '../../src/components/SgsBorderControl', () => stub() );
jest.mock( '../../src/components/ShadowControl', () => stub() );
jest.mock( '../../src/components/TypographyControls', () => stub() );
jest.mock( '../../src/components/ResponsiveBoxControl', () => ( { __esModule: true, BOX_UNITS: [], normaliseResponsiveBox: ( box ) => box } ) );

jest.mock( '../../src/components/SgsColourPanel', () => ( {
	__esModule: true,
	default: ( { rows } ) =>
		require( 'react' ).createElement(
			'div',
			{ 'data-colour-panel': 'true' },
			rows.filter( Boolean ).map( ( row ) => require( 'react' ).createElement( 'div', { key: row.key, 'data-colour-row': row.key, 'data-heading': row.heading } ) )
		),
} ) );

const BuiltinButtonPanel = require( '../../src/components/BuiltinButtonPanel' );
const CarouselDotsPanel = require( '../../src/components/CarouselDotsPanel' );
const { carouselControlsColourRows } = require( '../../src/components/CarouselControls' );

const ARROW = { prefix: 'arrow', part: 'arrow', label: 'Carousel arrows', groups: [ 'colour', 'size' ] };
const DOTS = { prefix: 'dot', part: 'dot', label: 'Carousel dots' };

/** Serve a block's declarations through the mocked `getBlockType`. */
function declare( sgs ) {
	getBlockType.mockImplementation( () => ( { supports: { sgs } } ) );
}

afterEach( () => {
	getBlockType.mockReset();
	getBlockType.mockImplementation( () => null );
} );

const args = ( extra = {} ) => ( { attributes: {}, setAttributes: jest.fn(), blockName: 'sgs/x', ...extra } );

describe( 'builtinButtonColourRows', () => {
	test( 'the first row carries the declared label as its heading, then Text, then Border', () => {
		declare( { builtinButtons: [ ARROW ] } );
		const rows = BuiltinButtonPanel.builtinButtonColourRows( args( { prefix: 'arrow' } ) );
		expect( rows.map( ( r ) => r.key ) ).toEqual( [ 'arrow-background', 'arrow-text', 'arrow-border' ] );
		expect( rows[ 0 ].heading ).toBe( 'Carousel arrows' );
	} );

	test( 'a button with a border group has no border colour row', () => {
		declare( { builtinButtons: [ { ...ARROW, groups: [ 'colour', 'border' ] } ] } );
		const rows = BuiltinButtonPanel.builtinButtonColourRows( args( { prefix: 'arrow' } ) );
		expect( rows.map( ( r ) => r.key ) ).toEqual( [ 'arrow-background', 'arrow-text' ] );
	} );

	test( 'a button with no colour group gives no rows', () => {
		declare( { builtinButtons: [ { ...ARROW, groups: [ 'size' ] } ] } );
		expect( BuiltinButtonPanel.builtinButtonColourRows( args( { prefix: 'arrow' } ) ) ).toEqual( [] );
	} );

	test( 'an undeclared prefix gives no rows', () => {
		declare( { builtinButtons: [ ARROW ] } );
		expect( BuiltinButtonPanel.builtinButtonColourRows( args( { prefix: 'nope' } ) ) ).toEqual( [] );
	} );

	test( 'no rows while the declaration\'s showWhen does not hold, and rows once it does', () => {
		declare( { builtinButtons: [ { ...ARROW, showWhen: [ { attr: 'showArrows', op: 'on', default: false } ] } ] } );
		expect( BuiltinButtonPanel.builtinButtonColourRows( args( { prefix: 'arrow' } ) ) ).toEqual( [] );
		expect( BuiltinButtonPanel.builtinButtonColourRows( args( { prefix: 'arrow', attributes: { showArrows: true } } ) ).length ).toBe( 3 );
	} );
} );

describe( 'carouselDotsColourRows and carouselControlsColourRows', () => {
	test( 'the dots give the headed Dot row and the Dot border row', () => {
		declare( { carouselDots: DOTS } );
		const rows = CarouselDotsPanel.carouselDotsColourRows( args( { prefix: 'dot' } ) );
		expect( rows.map( ( r ) => r.key ) ).toEqual( [ 'dot-dot', 'dot-border' ] );
		expect( rows[ 0 ].heading ).toBe( 'Carousel dots' );
	} );

	test( 'no dot rows while showWhen does not hold', () => {
		declare( { carouselDots: { ...DOTS, showWhen: [ { attr: 'showDots', op: 'on', default: false } ] } } );
		expect( CarouselDotsPanel.carouselDotsColourRows( args( { prefix: 'dot' } ) ) ).toEqual( [] );
	} );

	test( 'carouselControlsColourRows joins the arrow and dot rows', () => {
		declare( { builtinButtons: [ ARROW ], carouselDots: DOTS } );
		const keys = carouselControlsColourRows( args() ).map( ( r ) => r.key );
		expect( keys ).toEqual( [ 'arrow-background', 'arrow-text', 'arrow-border', 'dot-dot', 'dot-border' ] );
	} );
} );

async function mountPanel( Component, props ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	await act( async () => {
		root.render( h( Component, { attributes: {}, setAttributes: jest.fn(), blockName: 'sgs/x', ...props } ) );
	} );
	return {
		container,
		unmount: () => {
			act( () => root.unmount() );
			container.remove();
		},
	};
}

describe( 'the kit panels: where the colour rows are drawn', () => {
	test( 'by default the button kit draws its own Colour panel with the heading', async () => {
		declare( { builtinButtons: [ ARROW ] } );
		const m = await mountPanel( BuiltinButtonPanel.default, { prefix: 'arrow' } );
		expect( m.container.querySelector( '[data-colour-panel]' ) ).not.toBeNull();
		expect( m.container.querySelector( '[data-colour-row="arrow-background"]' ).getAttribute( 'data-heading' ) ).toBe( 'Carousel arrows' );
		m.unmount();
	} );

	test( 'a block that takes the rows draws no Colour panel from the kit, and keeps the kit\'s own Styles panel', async () => {
		declare( { builtinButtons: [ ARROW ], carouselDots: DOTS } );
		const button = await mountPanel( BuiltinButtonPanel.default, { prefix: 'arrow', colourInMainPanel: true } );
		expect( button.container.querySelector( '[data-colour-panel]' ) ).toBeNull();
		expect( button.container.querySelector( '[data-panel="Carousel arrows"]' ) ).not.toBeNull();
		button.unmount();
		const dots = await mountPanel( CarouselDotsPanel.default, { prefix: 'dot', colourInMainPanel: true } );
		expect( dots.container.querySelector( '[data-colour-panel]' ) ).toBeNull();
		expect( dots.container.querySelector( '[data-panel="Carousel dots"]' ) ).not.toBeNull();
		dots.unmount();
	} );

	test( 'the dots kit draws its own Colour panel by default', async () => {
		declare( { carouselDots: DOTS } );
		const m = await mountPanel( CarouselDotsPanel.default, { prefix: 'dot' } );
		expect( m.container.querySelector( '[data-colour-row="dot-dot"]' ) ).not.toBeNull();
		m.unmount();
	} );

	test( 'neither kit panel shows while showWhen does not hold', async () => {
		declare( { builtinButtons: [ { ...ARROW, showWhen: [ { attr: 'showArrows', op: 'on' } ] } ], carouselDots: { ...DOTS, showWhen: [ { attr: 'showDots', op: 'on' } ] } } );
		const a = await mountPanel( BuiltinButtonPanel.default, { prefix: 'arrow' } );
		expect( a.container.innerHTML ).toBe( '' );
		a.unmount();
		const d = await mountPanel( CarouselDotsPanel.default, { prefix: 'dot' } );
		expect( d.container.innerHTML ).toBe( '' );
		d.unmount();
	} );
} );
