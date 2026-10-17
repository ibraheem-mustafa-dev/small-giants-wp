/**
 * sgs/button "Show the focus look in the editor": an unsaved checkbox under the Keyboard focus control that puts
 * `sgs-focus-preview` on the canvas button so the author can see the focus ring. The class is canvas-only state: it
 * never reaches the saved attributes (setAttributes) or the markup render.php prints.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

global.IS_REACT_ACT_ENVIRONMENT = true;

// The checkbox renders as a real input so the test can tick it.
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const actual = jest.requireActual( '@wordpress/components' );
	const CheckboxControl = ( { label, checked, onChange, help } ) =>
		R.createElement(
			'label',
			{ 'data-testid': 'checkbox-control' },
			R.createElement( 'input', { type: 'checkbox', checked: !! checked, onChange: ( e ) => onChange( e.target.checked ) } ),
			label,
			R.createElement( 'span', { 'data-testid': 'checkbox-help' }, help )
		);
	// The shared mock is a Proxy that fabricates known names, so wrap it rather than spread it.
	return new Proxy( actual, { get: ( target, key ) => ( 'CheckboxControl' === key ? CheckboxControl : target[ key ] ) } );
} );

const Edit = require( '../../src/blocks/button/edit' ).default;

let root;
let container;
const setAttributes = jest.fn();
afterEach( () => {
	if ( root ) {
		act( () => root.unmount() );
		container.remove();
		root = null;
	}
	setAttributes.mockClear();
} );

const mount = ( attributes = {} ) => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
	act( () =>
		root.render( React.createElement( Edit, { attributes: { label: 'Go', ...attributes }, setAttributes, clientId: 'client-1', isSelected: true, name: 'sgs/button' } ) )
	);
	return container;
};
const checkbox = () =>
	[ ...container.querySelectorAll( '[data-testid="checkbox-control"]' ) ].find( ( l ) => l.textContent.includes( 'Show the focus look in the editor' ) );
const canvasButton = () => container.querySelector( '.sgs-button' );

describe( 'the editor focus preview checkbox', () => {
	it( 'is offered, unticked, and the canvas button has no preview class', () => {
		mount();
		expect( checkbox() ).toBeTruthy();
		expect( checkbox().querySelector( 'input' ).checked ).toBe( false );
		expect( canvasButton().classList.contains( 'sgs-focus-preview' ) ).toBe( false );
	} );

	it( 'adds sgs-focus-preview to the canvas button while ticked and removes it when unticked', () => {
		mount();
		act( () => checkbox().querySelector( 'input' ).click() );
		expect( checkbox().querySelector( 'input' ).checked ).toBe( true );
		expect( canvasButton().classList.contains( 'sgs-focus-preview' ) ).toBe( true );
		act( () => checkbox().querySelector( 'input' ).click() );
		expect( canvasButton().classList.contains( 'sgs-focus-preview' ) ).toBe( false );
	} );

	it( 'keeps the Keyboard focus class alongside the preview class', () => {
		mount( { focusStyle: 'duotone' } );
		act( () => checkbox().querySelector( 'input' ).click() );
		expect( canvasButton().classList.contains( 'sgs-focus--duotone' ) ).toBe( true );
		expect( canvasButton().classList.contains( 'sgs-focus-preview' ) ).toBe( true );
	} );

	it( 'never reaches the saved attributes, save.js or render.php', () => {
		mount();
		act( () => checkbox().querySelector( 'input' ).click() );
		expect( setAttributes ).not.toHaveBeenCalled();
		const dir = path.join( __dirname, '..', '..', 'src', 'blocks', 'button' );
		for ( const file of [ 'save.js', 'render.php', 'block.json' ] ) {
			expect( fs.readFileSync( path.join( dir, file ), 'utf8' ) ).not.toContain( 'sgs-focus-preview' );
		}
	} );
} );
