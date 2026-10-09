/**
 * sgs/icon custom outlines in the editor (icon plan D2, Phase D): the shape picker offers exactly the enum's shapes
 * with registry-drawn icons; the canvas twin draws the outline SVG behind the glyph only when there is something to
 * paint, takes no box border preview, and sets the stroke width and border colours as the custom properties render.php
 * prints; the stroke follows the previewed device; a row's group shape and border reach a square child.
 *
 * Negative control: 'the box shape keeps its border preview' proves the "no box border on an outline" probe sees a
 * border when the same attributes draw a square.
 */

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

import { shapeOptions, ShapeToggle, ShapeOptionIcon } from '../../src/blocks/icon/shape-options';
import { outlineCanvas, iconGroupContext } from '../../src/blocks/icon/icon-state';
import { OUTLINE_SHAPES, SHAPE_SLUGS } from '../../src/utils/icon-shapes';
import iconMeta from '../../src/blocks/icon/block.json';

describe( 'shape picker', () => {
	it( 'offers exactly the enum, box shapes first, outlines named from the registry', () => {
		expect( shapeOptions().map( ( o ) => o.value ) ).toEqual( iconMeta.attributes.shape.enum );
		expect( shapeOptions().map( ( o ) => o.value ) ).toEqual( [ ...SHAPE_SLUGS ] );
		expect( shapeOptions().slice( 3 ).map( ( o ) => o.label ) ).toEqual( [ 'Hexagon', 'Diamond', 'Octagon', 'Star', 'Blob' ] );
	} );

	it( 'renders one icon option per shape, each drawn from its shape', () => {
		const element = ShapeToggle( { label: 'Shape', value: 'square', onChange: () => {} } );
		const options = React.Children.toArray( element.props.children );
		expect( options.map( ( o ) => o.props.value ) ).toEqual( [ ...SHAPE_SLUGS ] );
		options.forEach( ( o ) => {
			expect( o.props.label ).toBeTruthy();
			expect( o.props.icon.type ).toBe( ShapeOptionIcon );
			expect( o.props.icon.props.shape ).toBe( o.props.value );
		} );
		expect( element.props.isDeselectable ).toBe( false );
		expect( ShapeToggle( { label: 'Shape', value: '', onChange: () => {}, isDeselectable: true } ).props.isDeselectable ).toBe( true );
	} );

	it( 'an outline option draws its registry path', () => {
		const container = document.createElement( 'div' );
		const root = createRoot( container );
		act( () => root.render( React.createElement( ShapeOptionIcon, { shape: 'octagon' } ) ) );
		expect( container.querySelector( 'path' ).getAttribute( 'd' ) ).toBe( OUTLINE_SHAPES.find( ( s ) => 'octagon' === s.slug ).d );
		act( () => root.unmount() );
	} );
} );

describe( 'outline canvas state', () => {
	const group = iconGroupContext( {} );

	it( 'a box shape is not an outline', () => {
		expect( outlineCanvas( { shape: 'square', borderWidth: { top: '2px' } }, group, 'desktop' ).outline ).toBe( false );
	} );

	it( 'own border: width per device, colours, dash', () => {
		const attrs = {
			shape: 'hexagon',
			borderWidth: { desktop: { top: '2px' }, mobile: { top: '4px' } },
			borderStyle: 'dashed',
			borderColour: 'primary',
			borderColourHover: 'accent',
		};
		const desktop = outlineCanvas( attrs, group, 'desktop' );
		expect( desktop ).toMatchObject( { outline: true, stroke: true, own: true, dash: 'dashed' } );
		expect( Object.keys( desktop.style ) ).toEqual( [ '--sgs-icon-outline-w', '--sgs-icon-border-colour', '--sgs-icon-border-colour-hover' ] );
		expect( desktop.style[ '--sgs-icon-outline-w' ] ).toBe( '2px' );
		expect( desktop.style[ '--sgs-icon-border-colour' ] ).toContain( '--wp--preset--color--primary' );
		expect( desktop.style[ '--sgs-icon-border-colour-hover' ] ).toContain( '--wp--preset--color--accent' );
		expect( outlineCanvas( attrs, group, 'tablet' ).style[ '--sgs-icon-outline-w' ] ).toBe( '2px' );
		expect( outlineCanvas( attrs, group, 'mobile' ).style[ '--sgs-icon-outline-w' ] ).toBe( '4px' );
	} );

	it( 'a stored border gradient leaves the stroke on its default colours (as render.php)', () => {
		const style = outlineCanvas(
			{ shape: 'diamond', borderWidth: { top: '2px' }, borderColour: 'primary', borderColourHover: 'accent', borderColourGradient: 'linear-gradient(90deg,#000 0%,#fff 100%)' },
			group,
			'desktop'
		).style;
		expect( style ).toEqual( { '--sgs-icon-outline-w': '2px' } );
		expect(
			outlineCanvas(
				{ shape: 'diamond', borderWidth: { top: '2px' }, borderColour: 'primary', borderColourHover: 'accent', borderColourHoverGradient: 'linear-gradient(90deg,#000 0%,#fff 100%)' },
				group,
				'desktop'
			).style
		).toEqual( { '--sgs-icon-outline-w': '2px', '--sgs-icon-border-colour': expect.stringContaining( 'primary' ) } );
	} );

		it( "the row's group border, unless the icon's own style is none", () => {
		const row = iconGroupContext( {
			'sgs/socialIconsColourMode': 'inherit',
			'sgs/socialIconsBorderWidth': { top: '3px' },
			'sgs/socialIconsBorderStyle': 'dotted',
		} );
		expect( outlineCanvas( { shape: 'blob' }, row, 'desktop' ) ).toMatchObject( { stroke: true, own: false, dash: 'dotted', style: { '--sgs-icon-outline-w': '3px' } } );
		expect( outlineCanvas( { shape: 'blob', borderStyle: 'none' }, row, 'desktop' ).stroke ).toBe( false );
	} );
} );

describe( 'editor canvas', () => {
	let container;
	let root;

	beforeEach( () => {
		window.sgsBlocksData = { siteInfo: {} };
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
	} );

	const mount = ( attributes, context ) => {
		const Edit = require( '../../src/blocks/icon/edit' ).default;
		act( () => {
			root.render(
				React.createElement( Edit, { attributes: { iconSource: 'lucide', iconName: 'star', ...attributes }, setAttributes: jest.fn(), clientId: 'c1', context } )
			);
		} );
	};

	it( 'draws each outline behind the glyph with a background', () => {
		OUTLINE_SHAPES.forEach( ( shape ) => {
			mount( { shape: shape.slug, showBackground: true } );
			const svg = container.querySelector( '.sgs-icon__shape > svg.sgs-icon__outline' );
			expect( svg ).not.toBeNull();
			expect( svg.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
			expect( svg.getAttribute( 'focusable' ) ).toBe( 'false' );
			expect( svg.nextElementSibling.classList.contains( 'sgs-icon__svg' ) ).toBe( true );
			expect( container.querySelector( '.sgs-icon__outline-path' ).getAttribute( 'd' ) ).toBe( shape.d );
			const root_ = container.querySelector( '.sgs-icon' );
			expect( root_.classList.contains( 'sgs-icon--outline' ) ).toBe( true );
			expect( root_.classList.contains( `sgs-icon--shape-${ shape.slug }` ) ).toBe( true );
		} );
	} );

	it( 'an outline takes no box border; its stroke width sits on the root', () => {
		// The shared block-editor mock drops the root style; pass it through for this probe.
		const blockEditor = require( '@wordpress/block-editor' );
		blockEditor.useBlockProps.mockImplementationOnce( ( extra ) => ( { className: `wp-block ${ extra.className }`, style: extra.style } ) );
		mount( { shape: 'diamond', borderWidth: { top: '2px' }, borderStyle: 'dashed', borderColour: 'primary' } );
		const shapeEl = container.querySelector( '.sgs-icon__shape' );
		expect( shapeEl.style.borderWidth ).toBe( '' );
		expect( shapeEl.style.borderStyle ).toBe( '' );
		const rootEl = container.querySelector( '.sgs-icon' );
		expect( rootEl.style.getPropertyValue( '--sgs-icon-outline-w' ) ).toBe( '2px' );
		expect( rootEl.style.getPropertyValue( '--sgs-icon-border-colour' ) ).toContain( '--wp--preset--color--primary' );
		expect( rootEl.classList.contains( 'sgs-icon--outline-dashed' ) ).toBe( true );
		expect( rootEl.classList.contains( 'sgs-icon--boxed' ) ).toBe( true );
	} );

	it( 'the box shape keeps its border preview (negative control)', () => {
		mount( { shape: 'square', borderWidth: { top: '2px' }, borderStyle: 'dashed', borderColour: 'primary' } );
		expect( container.querySelector( '.sgs-icon__shape' ).style.borderStyle ).toBe( 'dashed' );
		expect( container.querySelector( 'svg.sgs-icon__outline' ) ).toBeNull();
	} );

	it( 'an outline with nothing to paint draws no SVG', () => {
		mount( { shape: 'hexagon' } );
		expect( container.querySelector( 'svg.sgs-icon__outline' ) ).toBeNull();
	} );

	it( "a square child in a row takes the row's outline", () => {
		mount( { shape: 'square' }, { 'sgs/socialIconsColourMode': 'inherit', 'sgs/socialIconsShape': 'octagon', 'sgs/socialIconsShowBackground': true } );
		expect( container.querySelector( '.sgs-icon--shape-octagon svg.sgs-icon__outline' ) ).not.toBeNull();
	} );
} );
