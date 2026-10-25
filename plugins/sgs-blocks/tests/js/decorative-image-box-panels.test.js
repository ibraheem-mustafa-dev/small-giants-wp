/**
 * The Floating layer's box panels: fill, Shape and border, Layer shadow. Rendered for real
 * (react-dom into jsdom) with the shared controls replaced by stand-ins that expose their props, so
 * a test reads back what each control is wired to and what it writes. block.json is the REAL schema,
 * so the test breaks when a control and the schema drift apart.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const BLOCK_DIR = path.join( __dirname, '../../src/blocks/decorative-image' );
const SCHEMA = require( path.join( BLOCK_DIR, 'block.json' ) ).attributes;
const PANELS_JS = fs.readFileSync( path.join( BLOCK_DIR, 'LayerBoxPanels.js' ), 'utf8' );

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
];

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	PanelBody: ( { title, children } ) => require( 'react' ).createElement( 'section', { 'data-panel': title }, children ),
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
		ResponsiveOverride: ( { label, children } ) =>
			R.createElement(
				'div',
				{ 'data-responsive': label },
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

	it( 'every new block.json attribute is declared and reachable from the panels', () => {
		NEW_ATTRIBUTES.forEach( ( name ) => {
			expect( SCHEMA[ name ] ).toBeDefined();
		} );
		// The shadow attributes are reached through shadowAttrKeys( 'boxShadow', ... ); the rest by name.
		NEW_ATTRIBUTES.filter( ( n ) => ! n.startsWith( 'boxShadow' ) ).forEach( ( name ) => {
			expect( PANELS_JS ).toContain( name );
		} );
		expect( PANELS_JS ).toContain( "shadowAttrKeys( 'boxShadow', { hover: true, hoverColour: true } )" );
	} );

	it( 'an unset layer prints nothing: every new attribute defaults empty, or solid for the border style', () => {
		NEW_ATTRIBUTES.forEach( ( name ) => {
			expect( [ '', {}, 'solid' ] ).toContainEqual( SCHEMA[ name ].default );
		} );
	} );
} );
