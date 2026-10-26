/**
 * The text shadow row edits the first layer of a stored shadow and keeps everything else the shadow holds:
 * its further layers, the inline colour on the first layer, and (by refusing to edit) lengths in units the row
 * cannot show. Editing never deletes what it did not show.
 */

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

jest.mock( '../../src/components/primitives', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		VStack: ( { children } ) => R.createElement( 'div', null, children ),
		NumberControl: ( { label, value, onChange } ) =>
			R.createElement( 'button', { 'data-number': label, 'data-value': String( value ), onClick: () => onChange( '7' ) } ),
	};
} );
jest.mock( '../../src/components/DesignTokenPicker', () => ( {
	__esModule: true,
	default: () => require( 'react' ).createElement( 'div', { 'data-colour-picker': true } ),
} ) );

const { TextShadowRow, editTextShadowShape, textShadowIsEditable } = require( '../../src/components/TypographyNumberShadowRows' );

const KEYS = { textShadow: 'textShadow', textShadowColour: 'textShadowColour' };

function mount( attributes, setAttributes ) {
	const host = document.createElement( 'div' );
	document.body.appendChild( host );
	const root = createRoot( host );
	act( () => {
		root.render( React.createElement( TextShadowRow, { attributes, setAttributes, keys: KEYS } ) );
	} );
	return host;
}

describe( 'editTextShadowShape', () => {
	it( 'edits only the first layer and keeps every other layer as written', () => {
		expect( editTextShadowShape( '1px 2px 3px, 0 0 8px, -2px 4px 0', { x: 9, y: 2, blur: 3 } ) ).toBe( '9px 2px 3px, 0 0 8px, -2px 4px 0' );
	} );

	it( 'keeps an inline colour on the first layer, including one with commas inside', () => {
		expect( editTextShadowShape( '1px 2px 3px rgba(0, 0, 0, .5), 4px 4px 4px red', { x: 5, y: 2, blur: 3 } ) ).toBe(
			'5px 2px 3px rgba(0, 0, 0, .5), 4px 4px 4px red'
		);
	} );

	it( 'zeroing the first layer keeps it as a no-op layer while later layers exist, so colours stay aligned', () => {
		expect( editTextShadowShape( '1px 2px 3px, 4px 4px 4px', { x: 0, y: 0, blur: 0 } ) ).toBe( '0px 0px 0px, 4px 4px 4px' );
	} );

	it( 'zeroing a lone layer clears the shadow', () => {
		expect( editTextShadowShape( '1px 2px 3px', { x: 0, y: 0, blur: 0 } ) ).toBe( '' );
		expect( editTextShadowShape( '', { x: 0, y: 0, blur: 0 } ) ).toBe( '' );
	} );

	it( 'starts a shadow from nothing or from none', () => {
		expect( editTextShadowShape( '', { x: 1, y: 2, blur: 0 } ) ).toBe( '1px 2px 0px' );
		expect( editTextShadowShape( 'none', { x: 1, y: 2, blur: 0 } ) ).toBe( '1px 2px 0px' );
	} );
} );

describe( 'textShadowIsEditable', () => {
	it( 'is true for px and unitless lengths, and for an unset value', () => {
		[ '', '1px 2px 3px', '1 2 3', '1px 2px 3px, 0 0 4em' ].forEach( ( shape ) => expect( textShadowIsEditable( shape ) ).toBe( true ) );
	} );

	it( 'is false when the first layer uses em or rem', () => {
		[ '0.1em 0.2em 0.3em', '1px 2rem 3px' ].forEach( ( shape ) => expect( textShadowIsEditable( shape ) ).toBe( false ) );
	} );
} );

describe( 'TextShadowRow', () => {
	it( 'writes an edit without losing the other layers', () => {
		const setAttributes = jest.fn();
		const host = mount( { textShadow: '1px 2px 3px, 0 0 8px' }, setAttributes );
		act( () => {
			host.querySelector( '[data-number="Shadow X (px)"]' ).click();
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { textShadow: '7px 2px 3px, 0 0 8px' } );
	} );

	it( 'shows a notice and no number fields for a shadow it cannot show, and writes nothing', () => {
		const setAttributes = jest.fn();
		const host = mount( { textShadow: '0.1em 0.2em 0.3em' }, setAttributes );
		expect( host.querySelectorAll( '[data-number]' ).length ).toBe( 0 );
		expect( host.textContent ).toContain( 'em' );
		expect( setAttributes ).not.toHaveBeenCalled();
	} );
} );
