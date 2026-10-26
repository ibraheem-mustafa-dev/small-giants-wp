/**
 * The Floating layer's box panels: fill, Shape and border, Layer shadow. Rendered for real
 * (react-dom into jsdom) with the shared controls replaced by stand-ins that expose their props, so
 * a test reads back what each control is wired to and what it writes. block.json is the REAL schema,
 * so the test breaks when a control and the schema drift apart.
 */

'use strict';

const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const BLOCK_DIR = path.join( __dirname, '../../src/blocks/decorative-image' );
const SCHEMA = require( path.join( BLOCK_DIR, 'block.json' ) ).attributes;

const h = React.createElement;

const NEW_ATTRIBUTES = [
	'height',
	'backgroundColour',
	'backgroundColourGradient',
	'borderWidth',
	'borderStyle',
	'borderColour',
	'borderColourGradient',
	'borderRadius',
	'boxShadow',
	'boxShadowColour',
	'boxShadowColourHover',
	'boxShadowHover',
	'shape',
];

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	PanelBody: ( { title, children } ) => require( 'react' ).createElement( 'section', { 'data-panel': title }, children ),
	SelectControl: ( { label, value, options, onChange } ) =>
		require( 'react' ).createElement( 'button', {
			'data-select': label,
			'data-value': value,
			'data-options': JSON.stringify( options.map( ( o ) => o.value ) ),
			onClick: () => onChange( 'circle' ),
		} ),
} ) );

jest.mock( '../../src/components/media/controls/MediaBoxShapeControls', () => ( {
	__esModule: true,
	SHAPE_OPTIONS: [ 'none', 'rounded', 'circle', 'square' ].map( ( value ) => ( { label: value, value } ) ),
} ) );

jest.mock( '../../src/components', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		SgsColourPanel: ( { rows } ) =>
			R.createElement( 'div', {
				'data-colour-panel': true,
				'data-rows': JSON.stringify( rows.map( ( r ) => ( { key: r.key, attrs: r.attrs } ) ) ),
			} ),
		fillRow: ( { key, label, attrs } ) => ( { key, label, attrs } ),
		SgsBorderControl: ( props ) =>
			R.createElement( 'div', {
				'data-border-control': true,
				'data-style': props.styleValue,
				'data-colour': props.colourValue,
				'data-radius': JSON.stringify( props.radiusValues ),
				onClick: () => {
					props.onWidthChange( { top: '2px' } );
					props.onStyleChange( 'dashed' );
					props.onColourChange( 'accent' );
					props.onRadiusChange( 'base', { topLeft: '50%' } );
					props.onRadiusChange( 'mobile', { topLeft: '8px' } );
				},
			} ),
		SgsLengthControl: () => R.createElement( 'div', { 'data-length-control': true } ),
		ShadowControl: ( { attrNames } ) => R.createElement( 'div', { 'data-shadow-control': JSON.stringify( attrNames ) } ),
		ResponsiveOverride: ( { label, value, onChange, children } ) =>
			R.createElement(
				'div',
				{
					'data-responsive': label,
					'data-value': JSON.stringify( value ),
					onClick: () => onChange( { desktop: '99px' } ),
				},
				children( { ownValue: '', effectiveValue: '', inherited: false, setOwnValue: () => {} } )
			),
		shadowAttrKeys: ( base, { hover, hoverColour } ) => ( {
			base,
			colour: base + 'Colour',
			...( hover ? { hover: base + 'Hover' } : {} ),
			...( hoverColour ? { hoverColour: base + 'ColourHover' } : {} ),
		} ),
	};
} );

const LayerBoxPanels = require( path.join( BLOCK_DIR, 'LayerBoxPanels.js' ) ).default;
const { layerBoxPreview, layerPaintsBox } = require( path.join( BLOCK_DIR, 'layer-preview.js' ) );

function mount( attributes, setAttributes ) {
	const host = document.createElement( 'div' );
	document.body.appendChild( host );
	const root = createRoot( host );
	act( () => {
		root.render( h( LayerBoxPanels, { attributes, setAttributes } ) );
	} );
	return host;
}

describe( 'Floating layer box panels', () => {
	it( 'shows the fill row, the Shape and border panel and the Layer shadow panel', () => {
		const host = mount( {}, () => {} );

		expect( JSON.parse( host.querySelector( '[data-colour-panel]' ).dataset.rows ) ).toEqual( [
			{ key: 'background', attrs: { base: 'backgroundColour', gradient: 'backgroundColourGradient' } },
		] );
		expect( host.querySelector( '[data-panel="Shape and border"] [data-border-control]' ) ).not.toBeNull();
		expect( host.querySelector( '[data-panel="Shape and border"] [data-responsive="Height"] [data-length-control]' ) ).not.toBeNull();
		expect( JSON.parse( host.querySelector( '[data-panel="Layer shadow"] [data-shadow-control]' ).dataset.shadowControl ) ).toEqual( {
			base: 'boxShadow',
			colour: 'boxShadowColour',
			hover: 'boxShadowHover',
			hoverColour: 'boxShadowColourHover',
		} );
	} );

	it( 'shows one Shape control with the media vocabulary and writes the shape attribute', () => {
		const setAttributes = jest.fn();
		const host = mount( { shape: 'rounded' }, setAttributes );
		const shapes = host.querySelectorAll( '[data-select="Shape"]' );

		expect( shapes.length ).toBe( 1 );
		expect( shapes[ 0 ].closest( '[data-panel="Shape and border"]' ) ).not.toBeNull();
		expect( shapes[ 0 ].dataset.value ).toBe( 'rounded' );
		expect( JSON.parse( shapes[ 0 ].dataset.options ) ).toEqual( [ 'none', 'rounded', 'circle', 'square' ] );
		expect( host.querySelectorAll( '[data-responsive="Width"], [data-length-control]' ).length ).toBe( 1 );
		act( () => {
			shapes[ 0 ].click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { shape: 'circle' } );
	} );

	it( 'binds the border control to the border attributes and writes radius tiers into one object', () => {
		const setAttributes = jest.fn();
		const attributes = { borderRadius: { desktop: { topLeft: '4px' } }, borderStyle: 'solid', borderColour: 'primary' };
		const host = mount( attributes, setAttributes );
		const control = host.querySelector( '[data-border-control]' );

		expect( control.dataset.style ).toBe( 'solid' );
		expect( control.dataset.colour ).toBe( 'primary' );
		expect( JSON.parse( control.dataset.radius ) ).toEqual( { base: { topLeft: '4px' }, tablet: {}, mobile: {} } );

		act( () => {
			control.click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { borderWidth: { top: '2px' } } );
		expect( setAttributes ).toHaveBeenCalledWith( { borderStyle: 'dashed' } );
		expect( setAttributes ).toHaveBeenCalledWith( { borderColour: 'accent' } );
		expect( setAttributes ).toHaveBeenCalledWith( { borderRadius: { desktop: { topLeft: '50%' } } } );
		expect( setAttributes ).toHaveBeenCalledWith( { borderRadius: { desktop: { topLeft: '4px' }, mobile: { topLeft: '8px' } } } );
	} );

	it( 'every new block.json attribute is declared, and each control reads and writes its own attribute', () => {
		NEW_ATTRIBUTES.forEach( ( name ) => {
			expect( SCHEMA[ name ] ).toBeDefined();
		} );

		const setAttributes = jest.fn();
		const attributes = { height: { desktop: '80px' }, shape: 'rounded', borderStyle: 'dashed', borderColour: 'accent' };
		const host = mount( attributes, setAttributes );

		// Height: reads `height` and writes it back whole.
		const height = host.querySelector( '[data-responsive="Height"]' );
		expect( JSON.parse( height.dataset.value ) ).toEqual( attributes.height );
		act( () => {
			height.click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { height: { desktop: '99px' } } );

		// Shape, border and fill: read from and write to the named attributes.
		expect( host.querySelector( '[data-select="Shape"]' ).dataset.value ).toBe( 'rounded' );
		expect( host.querySelector( '[data-border-control]' ).dataset.style ).toBe( 'dashed' );
		expect( host.querySelector( '[data-border-control]' ).dataset.colour ).toBe( 'accent' );
		act( () => {
			host.querySelector( '[data-border-control]' ).click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { borderWidth: { top: '2px' } } );
		expect( setAttributes ).toHaveBeenCalledWith( { borderColour: 'accent' } );

		// The shadow control is handed all four shadow attribute names.
		const shadowNames = JSON.parse( host.querySelector( '[data-shadow-control]' ).dataset.shadowControl );
		expect( Object.values( shadowNames ).sort() ).toEqual( [ 'boxShadow', 'boxShadowColour', 'boxShadowColourHover', 'boxShadowHover' ] );
		expect( JSON.parse( host.querySelector( '[data-colour-panel]' ).dataset.rows )[ 0 ].attrs ).toEqual( {
			base: 'backgroundColour',
			gradient: 'backgroundColourGradient',
		} );
	} );

	it( 'an unset layer prints nothing: the schema defaults preview no box and no clip', () => {
		const defaults = {};
		NEW_ATTRIBUTES.forEach( ( name ) => {
			defaults[ name ] = SCHEMA[ name ].default;
		} );

		expect( layerBoxPreview( defaults, 'desktop', [] ) ).toEqual( {} );
		expect( layerPaintsBox( defaults, [] ) ).toBe( false );
	} );
} );
