/**
 * The Custom CSS field (Spec 32 FR-32-30): editable for a user the server lets write Custom CSS; read-only, with a line
 * saying why, for anyone else; the user's rights and the site's hosts are read from the editor's settings.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

global.IS_REACT_ACT_ENVIRONMENT = true;

// The shared mock renders neither `help` nor `readOnly`, so these two stand in as real elements.
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const actual = jest.requireActual( '@wordpress/components' );
	const TextareaControl = ( { label, help, value, onChange, readOnly } ) =>
		R.createElement(
			'label',
			null,
			label,
			R.createElement( 'textarea', { 'data-testid': 'css', value, readOnly: !! readOnly, onChange: ( e ) => onChange && onChange( e.target.value ) } ),
			R.createElement( 'span', { 'data-testid': 'help' }, help )
		);
	const Notice = ( { status, children } ) => R.createElement( 'div', { 'data-testid': 'notice-' + status }, children );
	return new Proxy( actual, { get: ( target, key ) => ( { TextareaControl, Notice }[ key ] ?? target[ key ] ) } );
} );

const { useSelect } = require( '@wordpress/data' );
const { CustomCssField, useCustomCssSettings } = require( '../../src/blocks/extensions/custom-css-field' );

let root;
let container;
afterEach( () => {
	if ( root ) {
		act( () => root.unmount() );
		container.remove();
		root = null;
	}
} );

const mount = ( element ) => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
	act( () => root.render( element ) );
	return container;
};
const field = ( props ) =>
	React.createElement( CustomCssField, { value: '&selector { color: red }', note: '', refused: [], readOnly: false, onChange: jest.fn(), ...props } );

describe( 'CustomCssField', () => {
	it( 'is editable and passes a typed change on when the user may write Custom CSS', () => {
		const onChange = jest.fn();
		mount( field( { onChange } ) );
		const textarea = container.querySelector( '[data-testid="css"]' );
		expect( textarea.readOnly ).toBe( false );
		expect( container.querySelector( '[data-testid="help"]' ).textContent ).toContain( 'relative address' );
		const setter = Object.getOwnPropertyDescriptor( window.HTMLTextAreaElement.prototype, 'value' ).set;
		act( () => {
			setter.call( textarea, 'a' );
			textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} );
		expect( onChange ).toHaveBeenCalledWith( 'a' );
	} );

	it( 'is read-only with the reason beside it, still showing the saved rule, when the user may not', () => {
		const onChange = jest.fn();
		mount( field( { readOnly: true, onChange } ) );
		const textarea = container.querySelector( '[data-testid="css"]' );
		expect( textarea.readOnly ).toBe( true );
		expect( textarea.value ).toBe( '&selector { color: red }' );
		expect( container.querySelector( '[data-testid="help"]' ).textContent ).toContain( 'Read only: your account may not change Custom CSS on this site' );
		const setter = Object.getOwnPropertyDescriptor( window.HTMLTextAreaElement.prototype, 'value' ).set;
		act( () => {
			setter.call( textarea, 'changed' );
			textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} );
		expect( onChange ).not.toHaveBeenCalled();
	} );

	it( 'lists the scoper\'s refusals, an off-site url among them, under the field', () => {
		mount( field( { refused: [ 'off-site url: &selector', 'at-rule: @import' ] } ) );
		expect( container.querySelector( '[data-testid="notice-warning"]' ).textContent ).toBe( 'Not applied: off-site url: &selector; at-rule: @import' );
	} );

	it( 'shows the block\'s note above the field', () => {
		mount( field( { note: 'Spacing from the draft' } ) );
		expect( container.querySelector( '[data-testid="notice-info"]' ).textContent ).toBe( 'Spacing from the draft' );
	} );
} );

describe( 'useCustomCssSettings', () => {
	const Probe = () => {
		const { canEdit, siteHosts } = useCustomCssSettings();
		return React.createElement( 'span', { 'data-testid': 'probe' }, `${ canEdit }|${ siteHosts.join( ',' ) }` );
	};
	const probe = ( stores ) => {
		useSelect.mockImplementation( ( fn ) => fn( ( name ) => stores[ name ] ) );
		mount( React.createElement( Probe ) );
		return container.querySelector( '[data-testid="probe"]' ).textContent;
	};

	it( 'reads the post editor\'s settings', () => {
		expect( probe( { 'core/editor': { getEditorSettings: () => ( { sgsCustomCssAccess: { canEdit: false, siteHosts: [ 'a.test' ] } } ) } } ) ).toBe( 'false|a.test' );
	} );

	it( 'falls back to the site editor\'s settings', () => {
		expect( probe( { 'core/edit-site': { getSettings: () => ( { sgsCustomCssAccess: { canEdit: false, siteHosts: [ 'b.test', 'c.test' ] } } ) } } ) ).toBe( 'false|b.test,c.test' );
	} );

	it( 'allows editing, with no host, when the server sent nothing (the server still enforces the rule)', () => {
		expect( probe( {} ) ).toBe( 'true|' );
	} );
} );
