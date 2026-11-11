/**
 * The Floating layer's own box paint panels: the fill row and the Border gradient panel. The shared controls are
 * replaced by stand-ins that expose their props, so a test reads back what each control is wired to and what it
 * writes. block.json is the REAL schema, so the test breaks when a control and the schema drift apart.
 */

'use strict';

const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const BLOCK_DIR = path.join( __dirname, '../../src/blocks/decorative-image' );
const SCHEMA = require( path.join( BLOCK_DIR, 'block.json' ) ).attributes;

const h = React.createElement;

const BOX_ATTRIBUTES = [
	'layerBackground',
	'backgroundColourGradient',
	'layerBorderWidth',
	'layerBorderStyle',
	'layerBorderColour',
	'layerBorderColourGradient',
	'layerRadius',
	'layerBoxShadow',
	'layerBoxShadowColour',
	'layerBoxShadowColourHover',
	'layerHeight',
	'layerShape',
];

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	PanelBody: ( { title, children } ) => require( 'react' ).createElement( 'section', { 'data-panel': title }, children ),
	Button: ( { children, onClick } ) => require( 'react' ).createElement( 'button', { 'data-clear': true, onClick }, children ),
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
		SgsGradientPicker: ( { value, onChange } ) =>
			R.createElement( 'div', {
				'data-gradient-picker': true,
				'data-value': value || '',
				onClick: () => onChange( 'linear-gradient(red, blue)' ),
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

describe( 'Floating layer box paint panels', () => {
	it( 'binds the fill row to the layer fill and its gradient', () => {
		const host = mount( {}, () => {} );

		expect( JSON.parse( host.querySelector( '[data-colour-panel]' ).dataset.rows ) ).toEqual( [
			{ key: 'background', attrs: { base: 'layerBackground', gradient: 'backgroundColourGradient' } },
		] );
	} );

	it( 'reads and writes the border ring gradient in its own panel', () => {
		const setAttributes = jest.fn();
		const host = mount( { layerBorderColourGradient: 'linear-gradient(red, blue)' }, setAttributes );
		const picker = host.querySelector( '[data-panel="Border gradient"] [data-gradient-picker]' );

		expect( picker.dataset.value ).toBe( 'linear-gradient(red, blue)' );
		act( () => {
			picker.click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { layerBorderColourGradient: 'linear-gradient(red, blue)' } );
		act( () => {
			host.querySelector( '[data-clear]' ).click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { layerBorderColourGradient: '' } );
	} );

	it( 'offers no clear button while no ring is set', () => {
		expect( mount( {}, () => {} ).querySelector( '[data-clear]' ) ).toBeNull();
	} );

	it( 'every box attribute is declared, and the old names are gone', () => {
		BOX_ATTRIBUTES.forEach( ( name ) => {
			expect( SCHEMA[ name ] ).toBeDefined();
		} );
		[ 'height', 'shape', 'borderRadius', 'borderColour', 'borderColourGradient', 'backgroundColour', 'boxShadow', 'boxShadowHover', 'opacity', 'width', 'maxWidth', 'hideOnTablet', 'hideOnMobile', 'decorMedia', 'imageUrl', 'imageId' ].forEach( ( name ) => {
			expect( SCHEMA[ name ] ).toBeUndefined();
		} );
	} );

	it( 'an unset layer prints nothing: the schema defaults preview no box and no clip', () => {
		const defaults = {};
		BOX_ATTRIBUTES.forEach( ( name ) => {
			defaults[ name ] = SCHEMA[ name ].default;
		} );

		expect( layerBoxPreview( defaults, 'desktop', [] ) ).toEqual( {} );
		expect( layerPaintsBox( defaults, [] ) ).toBe( false );
	} );
} );
