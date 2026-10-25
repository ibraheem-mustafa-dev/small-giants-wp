/**
 * Number style and text shadow on the shared typography surface: the attribute keys, the shadow shape the editor
 * rows read and write, the canvas twin of the PHP rule, and the rows appearing only for a block that opts in.
 */

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

jest.mock( '../../src/components/TypographyNumberShadowRows', () => {
	const R = require( 'react' );
	const actual = jest.requireActual( '../../src/components/TypographyNumberShadowRows' );
	return {
		...actual,
		NumberStyleRow: () => R.createElement( 'div', { 'data-row': 'number-style' } ),
		TextShadowRow: () => R.createElement( 'div', { 'data-row': 'text-shadow' } ),
	};
} );

const { typographyAttrKeys } = require( '../../src/components/TypographyControls' );
const TypographyControls = require( '../../src/components/TypographyControls' ).default;
const {
	parseTextShadowShape,
	composeTextShadowShape,
	NUMBER_STYLE_OPTIONS,
} = require( '../../src/components/TypographyNumberShadowRows' );
const { typographyPreviewStyle } = require( '../../src/utils/typography-preview' );

describe( 'typographyAttrKeys', () => {
	it( 'names the number style and shadow attributes from the prefix', () => {
		expect( typographyAttrKeys( '' ) ).toMatchObject( {
			fontVariantNumeric: 'fontVariantNumeric',
			textShadow: 'textShadow',
			textShadowColour: 'textShadowColour',
		} );
		expect( typographyAttrKeys( 'label' ) ).toMatchObject( {
			fontVariantNumeric: 'labelFontVariantNumeric',
			textShadow: 'labelTextShadow',
			textShadowColour: 'labelTextShadowColour',
		} );
	} );
} );

describe( 'text shadow shape', () => {
	it( 'reads the first layer as three lengths', () => {
		expect( parseTextShadowShape( '0px 4px 12px' ) ).toEqual( { x: 0, y: 4, blur: 12 } );
		expect( parseTextShadowShape( '-2px 3.5px 0' ) ).toEqual( { x: -2, y: 3.5, blur: 0 } );
	} );

	it( 'reads an unset or unparseable value as all zero', () => {
		expect( parseTextShadowShape( '' ) ).toEqual( { x: 0, y: 0, blur: 0 } );
		expect( parseTextShadowShape( 'nonsense' ) ).toEqual( { x: 0, y: 0, blur: 0 } );
	} );

	it( 'writes one layer, and writes nothing when every length is zero', () => {
		expect( composeTextShadowShape( { x: 0, y: 4, blur: 12 } ) ).toBe( '0px 4px 12px' );
		expect( composeTextShadowShape( { x: 0, y: 0, blur: 0 } ) ).toBe( '' );
	} );
} );

describe( 'number style options', () => {
	it( 'offers the short list PHP allows, led by Default', () => {
		expect( NUMBER_STYLE_OPTIONS.map( ( o ) => o.value ) ).toEqual( [ '', 'normal', 'tabular-nums', 'proportional-nums', 'lining-nums', 'oldstyle-nums' ] );
	} );
} );

describe( 'canvas twin', () => {
	it( 'mirrors the number style allowlist', () => {
		expect( typographyPreviewStyle( { fontVariantNumeric: 'tabular-nums' } ).fontVariantNumeric ).toBe( 'tabular-nums' );
		expect( typographyPreviewStyle( { fontVariantNumeric: 'lining-nums tabular-nums' } ).fontVariantNumeric ).toBe( 'lining-nums tabular-nums' );
		expect( typographyPreviewStyle( { fontVariantNumeric: 'tabular-nums;}' } ) ).toEqual( {} );
	} );

	it( 'mirrors the text shadow, with its colour', () => {
		const style = typographyPreviewStyle( { textShadow: '0px 4px 12px', textShadowColour: '#FFFFFFCB' } );
		expect( style.textShadow ).toBe( '0px 4px 12px #FFFFFFCB' );
		expect( typographyPreviewStyle( { textShadow: '1px 2px 3px' } ).textShadow ).toBe( '1px 2px 3px' );
		expect( typographyPreviewStyle( { textShadow: 'inset 1px 2px 3px' } ) ).toEqual( {} );
	} );

	it( 'prints neither when unset', () => {
		const style = typographyPreviewStyle( { fontWeight: '700' } );
		expect( style ).toEqual( { fontWeight: '700' } );
	} );
} );

describe( 'TypographyControls opt-in rows', () => {
	const mount = ( props ) => {
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
		const root = createRoot( container );
		act( () => {
			root.render( React.createElement( TypographyControls, { attributes: {}, setAttributes: () => {}, ...props } ) );
		} );
		return { container, root };
	};
	const rows = ( container ) => [ ...container.querySelectorAll( '[data-row]' ) ].map( ( n ) => n.getAttribute( 'data-row' ) );

	it( 'shows neither row by default', () => {
		const { container, root } = mount( {} );
		expect( rows( container ) ).toEqual( [] );
		act( () => root.unmount() );
	} );

	it( 'shows the number style row only when asked', () => {
		const { container, root } = mount( { showNumberStyle: true } );
		expect( rows( container ) ).toEqual( [ 'number-style' ] );
		act( () => root.unmount() );
	} );

	it( 'shows the text shadow row only when asked', () => {
		const { container, root } = mount( { showTextShadow: true } );
		expect( rows( container ) ).toEqual( [ 'text-shadow' ] );
		act( () => root.unmount() );
	} );
} );
