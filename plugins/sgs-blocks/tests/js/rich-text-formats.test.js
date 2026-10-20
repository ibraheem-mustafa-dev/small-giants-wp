/**
 * The universal rich-text formats' editor half (Spec 02 FR-2-4 highlight, FR-2-5 inline photo).
 *
 * - every shared list in src/utils/rich-text-formats.js names only formats that are registered: core's
 *   format-library names, plus the two SGS formats src/blocks/extensions/inline-formats/index.js registers;
 * - both SGS formats save class-only markup (no attribute maps to `style`);
 * - the highlight colour becomes a class only for a slug that is safe in a selector;
 * - a highlight over three words is reported for the editor notice;
 * - a picked photo is inserted at its `medium` size with `wp-image-N`, and an alt edit replaces the selected object
 *   through `value.replacements`, the way core's inline image format edits its object;
 * - each format's toolbar control renders inside an `sgs/` block and nowhere else.
 *
 * `@wordpress/rich-text` is a webpack external that is not installed here, so it is a recording stand-in: the
 * create/toHTMLString round trip is proven in the live editor instead (the plan's Live step).
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

jest.mock(
	'@wordpress/rich-text',
	() => ( {
		__esModule: true,
		registerFormatType: jest.fn(),
		applyFormat: jest.fn( ( value, format ) => ( { ...value, applied: format } ) ),
		removeFormat: jest.fn( ( value, name ) => ( { ...value, removed: name } ) ),
		insertObject: jest.fn( ( value, object ) => ( { ...value, inserted: object } ) ),
		remove: jest.fn( ( value ) => ( { ...value, removedObject: true } ) ),
		getActiveFormat: jest.fn( () => undefined ),
		useAnchor: jest.fn( () => null ),
	} ),
	{ virtual: true }
);

// The shared block-editor mock lacks the format toolbar button; it renders as a plain button here.
jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		...jest.requireActual( './__mocks__/@wordpress/block-editor.js' ),
		RichTextToolbarButton: ( { title, onClick } ) => R.createElement( 'button', { type: 'button', onClick }, title ),
	};
} );

jest.mock( '../../src/components/DesignTokenPicker', () => ( { __esModule: true, default: () => null } ) );

// The shared Popover mock drops its props; this one records them, so a test can press its Escape (onClose).
const mockPopovers = [];
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		...jest.requireActual( './__mocks__/@wordpress/components.js' ),
		Popover: ( props ) => {
			mockPopovers.push( props );
			return R.createElement( 'div', { 'data-testid': 'Popover' }, props.children );
		},
	};
} );

let mockSelectedBlockName = 'sgs/heading';
jest.mock( '@wordpress/data', () => ( {
	__esModule: true,
	useSelect: ( fn ) =>
		fn( () => ( {
			getSelectedBlockClientId: () => 'client-1',
			getBlockName: () => mockSelectedBlockName,
		} ) ),
} ) );

const richText = require( '@wordpress/rich-text' );
const formats = require( '../../src/utils/rich-text-formats' );
const inlineFormats = require( '../../src/blocks/extensions/inline-formats' );
const popovers = require( '../../src/blocks/extensions/inline-formats/popovers' );

// The names WordPress's format-library registers (wp-includes/js/dist/format-library.js, WordPress 7.1).
const CORE_FORMATS = [
	'core/bold', 'core/code', 'core/image', 'core/italic', 'core/keyboard', 'core/language', 'core/link', 'core/math',
	'core/non-breaking-space', 'core/strikethrough', 'core/subscript', 'core/superscript', 'core/text-color',
	'core/underline', 'core/unknown',
];

const registered = () => richText.registerFormatType.mock.calls.map( ( [ name ] ) => name );
const settingsOf = ( name ) => richText.registerFormatType.mock.calls.find( ( [ n ] ) => n === name )[ 1 ];

describe( 'shared format lists', () => {
	it( 'registers the two SGS formats once each', () => {
		expect( registered().sort() ).toEqual( [ 'sgs/highlight', 'sgs/inline-photo' ] );
	} );

	it( 'every constant lists only registered names, and is frozen', () => {
		const known = new Set( [ ...CORE_FORMATS, ...registered() ] );
		const names = [ 'RICH_TEXT_BODY', 'RICH_TEXT_BODY_NO_LINK', 'RICH_TEXT_EMPHASIS', 'RICH_TEXT_LINK_ONLY', 'RICH_TEXT_PLAIN' ];
		expect( Object.keys( formats ).sort() ).toEqual( [ ...names ].sort() );
		for ( const name of names ) {
			expect( Object.isFrozen( formats[ name ] ) ).toBe( true );
			for ( const format of formats[ name ] ) {
				expect( known.has( format ) ).toBe( true );
			}
		}
	} );

	it( 'the lists hold what their roles promise', () => {
		expect( formats.RICH_TEXT_BODY ).toEqual( [ 'core/bold', 'core/italic', 'core/link', 'core/strikethrough', 'sgs/highlight', 'sgs/inline-photo' ] );
		expect( formats.RICH_TEXT_BODY_NO_LINK ).toEqual( formats.RICH_TEXT_BODY.filter( ( f ) => 'core/link' !== f ) );
		expect( formats.RICH_TEXT_EMPHASIS ).toEqual( [ 'core/bold', 'core/italic' ] );
		expect( formats.RICH_TEXT_LINK_ONLY ).toEqual( [ 'core/link' ] );
		expect( formats.RICH_TEXT_PLAIN ).toEqual( [] );
		// Core's formats that save inline style are on no list.
		for ( const list of Object.values( formats ) ) {
			expect( list ).not.toContain( 'core/text-color' );
			expect( list ).not.toContain( 'core/underline' );
			expect( list ).not.toContain( 'core/image' );
		}
	} );
} );

describe( 'format settings save class-only markup', () => {
	it( 'the highlight is a classed span whose only attribute is its class', () => {
		const s = settingsOf( 'sgs/highlight' );
		expect( s ).toMatchObject( { tagName: 'span', className: 'sgs-highlight', attributes: { class: 'class' } } );
		expect( Object.values( s.attributes ) ).not.toContain( 'style' );
		expect( s.title ).toBe( 'Highlight' );
		expect( typeof s.edit ).toBe( 'function' );
	} );

	it( 'the inline photo is a classed object image with no style attribute', () => {
		const s = settingsOf( 'sgs/inline-photo' );
		expect( s ).toMatchObject( { tagName: 'img', className: 'sgs-inline-photo', object: true, attributes: { className: 'class', url: 'src', alt: 'alt' } } );
		expect( Object.values( s.attributes ) ).not.toContain( 'style' );
		expect( s.title ).toBe( 'Inline photo' );
	} );
} );

describe( 'highlight helpers', () => {
	it( 'a palette slug becomes a modifier class; an unsafe or empty slug becomes none', () => {
		expect( popovers.highlightClass( 'accent' ) ).toBe( 'sgs-highlight--accent' );
		expect( popovers.highlightClass( 'brand-2' ) ).toBe( 'sgs-highlight--brand-2' );
		expect( popovers.highlightClass( 'bad slug!' ) ).toBe( '' );
		expect( popovers.highlightClass( '#ff0000' ) ).toBe( '' );
		expect( popovers.highlightClass( '' ) ).toBe( '' );
	} );

	it( 'reads the slug back from the saved class', () => {
		expect( popovers.highlightSlug( 'sgs-highlight--accent' ) ).toBe( 'accent' );
		expect( popovers.highlightSlug( 'other sgs-highlight--primary' ) ).toBe( 'primary' );
		expect( popovers.highlightSlug( undefined ) ).toBe( '' );
	} );

	it( 'applies a picked colour as a class and clears it back to the site colour', () => {
		const value = { text: 'most', formats: [], start: 0, end: 4 };
		expect( popovers.applyHighlightColour( value, 'accent' ).applied ).toEqual( { type: 'sgs/highlight', attributes: { class: 'sgs-highlight--accent' } } );
		expect( popovers.applyHighlightColour( value, '' ).applied ).toEqual( { type: 'sgs/highlight' } );
	} );

	it( 'counts the words under the highlight, from a selection or from the caret inside one', () => {
		const h = { type: 'sgs/highlight' };
		const text = 'who needs it most of all';
		const formatsAt = [ ...text ].map( ( c, i ) => ( i >= 13 ? [ h ] : undefined ) );
		expect( popovers.highlightedText( { text, formats: formatsAt, start: 15, end: 15 } ) ).toBe( 'most of all' );
		expect( popovers.highlightedText( { text, formats: formatsAt, start: 0, end: 9 } ) ).toBe( 'who needs' );
		expect( popovers.isLongHighlight( 'most' ) ).toBe( false );
		expect( popovers.isLongHighlight( 'one two three' ) ).toBe( false );
		expect( popovers.isLongHighlight( 'one two three four' ) ).toBe( true );
	} );
} );

describe( 'inline photo helpers', () => {
	it( 'inserts the medium size with wp-image-N and an empty (decorative) alt', () => {
		expect( popovers.photoObject( { id: 7, url: 'full.jpg', sizes: { medium: { url: 'medium.jpg' } } } ) ).toEqual( {
			type: 'sgs/inline-photo',
			attributes: { className: 'wp-image-7', url: 'medium.jpg', alt: '' },
		} );
		expect( popovers.photoObject( { id: 8, url: 'full.jpg' } ).attributes.url ).toBe( 'full.jpg' );
	} );

	it( 'an alt edit replaces the selected object in value.replacements, keeping its other attributes', () => {
		const photo = { type: 'sgs/inline-photo', attributes: { className: 'wp-image-7', url: 'm.jpg', alt: '' } };
		const value = { text: 'a ￼ b', formats: [], replacements: [ undefined, undefined, photo ], start: 2, end: 3 };
		const next = popovers.withPhotoAlt( value, 'Two biscuits' );
		expect( next.replacements[ 2 ] ).toEqual( { type: 'sgs/inline-photo', attributes: { className: 'wp-image-7', url: 'm.jpg', alt: 'Two biscuits' } } );
		expect( value.replacements[ 2 ].attributes.alt ).toBe( '' );
	} );
} );

describe( 'toolbar controls show only in SGS blocks', () => {
	function render( Edit, props ) {
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
		const root = createRoot( container );
		act( () => root.render( React.createElement( Edit, { value: { text: '', formats: [], start: 0, end: 0 }, onChange: jest.fn(), isActive: false, contentRef: { current: null }, ...props } ) ) );
		return { container, root };
	}

	it( 'renders the highlight and photo controls inside an sgs/ block', () => {
		mockSelectedBlockName = 'sgs/heading';
		for ( const name of [ 'sgs/highlight', 'sgs/inline-photo' ] ) {
			const { container, root } = render( settingsOf( name ).edit );
			expect( container.innerHTML ).not.toBe( '' );
			act( () => root.unmount() );
		}
	} );

	it( 'renders nothing inside a core block', () => {
		mockSelectedBlockName = 'core/paragraph';
		for ( const name of [ 'sgs/highlight', 'sgs/inline-photo' ] ) {
			const { container, root } = render( settingsOf( name ).edit );
			expect( container.innerHTML ).toBe( '' );
			act( () => root.unmount() );
		}
	} );

	it( 'the module exports the two settings objects it registers', () => {
		expect( inlineFormats.highlightFormat ).toBe( settingsOf( 'sgs/highlight' ) );
		expect( inlineFormats.inlinePhotoFormat ).toBe( settingsOf( 'sgs/inline-photo' ) );
	} );
} );

describe( 'the photo popover closes from the keyboard', () => {
	function renderPhoto( start, focus ) {
		mockSelectedBlockName = 'sgs/heading';
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
		const root = createRoot( container );
		const props = ( at ) => ( {
			value: { text: 'ab￼cd', formats: [], start: at, end: at + 1 },
			onChange: jest.fn(),
			isObjectActive: true,
			activeObjectAttributes: { className: 'sgs-inline-photo wp-image-23', url: 'x.jpg', alt: '' },
			contentRef: { current: { focus } },
		} );
		const draw = ( at ) => act( () => root.render( React.createElement( settingsOf( 'sgs/inline-photo' ).edit, props( at ) ) ) );
		draw( start );
		return { container, root, draw };
	}
	const open = ( container ) => null !== container.querySelector( '[data-testid="Popover"]' );

	it( 'Escape (onClose) closes it and returns focus to the text; a new photo selection opens it again', () => {
		const focus = jest.fn();
		const { container, root, draw } = renderPhoto( 2, focus );
		expect( open( container ) ).toBe( true );
		const onClose = mockPopovers[ mockPopovers.length - 1 ].onClose;
		expect( typeof onClose ).toBe( 'function' );
		act( () => onClose() );
		expect( open( container ) ).toBe( false );
		expect( focus ).toHaveBeenCalled();
		draw( 2 );
		expect( open( container ) ).toBe( false );
		draw( 3 );
		expect( open( container ) ).toBe( true );
		act( () => root.unmount() );
	} );
} );
