/**
 * sgs/message-preview: the card mirrors each field as the visitor types, an empty field falls back, the
 * visitor's text lands as text (never markup), and the optional session copy is written under its documented key.
 */
import {
	lineText,
	initialiseMessagePreview,
	STORAGE_PREFIX,
} from '../../src/blocks/message-preview/mirror';

const MARKUP = `<div data-sgs-message-preview data-group="gift-note">
	<input data-sgs-mp-input data-field="to" value="Aisha" maxlength="30">
	<textarea data-sgs-mp-input data-field="message" maxlength="200">Hello</textarea>
	<input data-sgs-mp-input data-field="from" value="">
</div>
<aside>
	<p data-sgs-mp-line data-group="gift-note" data-field="to" data-prefix="Dear " data-suffix="," data-fallback="Dear you,">Dear Aisha,</p>
	<p data-sgs-mp-line data-group="gift-note" data-field="message" data-prefix="" data-suffix="" data-fallback="">Hello</p>
	<p data-sgs-mp-line data-group="gift-note" data-field="from" data-prefix="" data-suffix=" x" data-fallback="">x</p>
	<p data-sgs-mp-line data-group="other" data-field="to" data-prefix="" data-suffix="" data-fallback="untouched">untouched</p>
</aside>`;

const root = () => document.querySelector( '[data-sgs-message-preview]' );
const line = ( key ) =>
	document.querySelector(
		`[data-sgs-mp-line][data-group="gift-note"][data-field="${ key }"]`
	);
const type = ( key, value ) => {
	const input = document.querySelector(
		`[data-sgs-mp-input][data-field="${ key }"]`
	);
	input.value = value;
	input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
};

describe( 'lineText', () => {
	const to = { prefix: 'Dear ', suffix: ',', fallback: 'Dear you,' };
	it( 'wraps a filled value in its prefix and suffix', () => {
		expect( lineText( 'Aisha', to ) ).toBe( 'Dear Aisha,' );
	} );
	it( 'uses the fallback for an empty or blank value', () => {
		expect( lineText( '', to ) ).toBe( 'Dear you,' );
		expect( lineText( '   ', to ) ).toBe( 'Dear you,' );
	} );
	it( 'shows nothing for an empty value with no fallback', () => {
		expect(
			lineText( '', { prefix: '', suffix: ' x', fallback: '' } )
		).toBe( '' );
	} );
} );

describe( 'initialiseMessagePreview', () => {
	beforeEach( () => {
		document.body.innerHTML = MARKUP;
		window.sessionStorage.clear();
	} );

	it( 'syncs the card from the fields on load', () => {
		initialiseMessagePreview( root() );
		expect( line( 'to' ).textContent ).toBe( 'Dear Aisha,' );
		expect( line( 'from' ).textContent ).toBe( '' );
	} );

	it( 'updates the matching line as the visitor types', () => {
		initialiseMessagePreview( root() );
		type( 'to', 'Sam' );
		type( 'from', 'Lee' );
		expect( line( 'to' ).textContent ).toBe( 'Dear Sam,' );
		expect( line( 'from' ).textContent ).toBe( 'Lee x' );
		expect( line( 'message' ).textContent ).toBe( 'Hello' );
	} );

	it( 'restores the fallback when a field is emptied', () => {
		initialiseMessagePreview( root() );
		type( 'to', '' );
		expect( line( 'to' ).textContent ).toBe( 'Dear you,' );
	} );

	it( 'leaves lines of another group alone', () => {
		initialiseMessagePreview( root() );
		type( 'to', '' );
		expect(
			document.querySelector( '[data-group="other"]' ).textContent
		).toBe( 'untouched' );
	} );

	it( 'inserts markup as text', () => {
		initialiseMessagePreview( root() );
		type( 'message', '<img src=x onerror=alert(1)>' );
		expect( line( 'message' ).querySelector( 'img' ) ).toBeNull();
		expect( line( 'message' ).textContent ).toBe(
			'<img src=x onerror=alert(1)>'
		);
	} );

	it( 'does not touch session storage unless the setting is on', () => {
		initialiseMessagePreview( root() );
		type( 'to', 'Sam' );
		expect( window.sessionStorage.length ).toBe( 0 );
	} );

	it( 'stores every field under the documented key when the setting is on', () => {
		root().setAttribute( 'data-remember', 'true' );
		initialiseMessagePreview( root() );
		type( 'to', 'Sam' );
		const stored = JSON.parse(
			window.sessionStorage.getItem( STORAGE_PREFIX + 'gift-note' )
		);
		expect( STORAGE_PREFIX ).toBe( 'sgs-message-preview:' );
		expect( stored ).toEqual( { to: 'Sam', message: 'Hello', from: '' } );
	} );

	it( 'keeps working when session storage refuses a write', () => {
		root().setAttribute( 'data-remember', 'true' );
		const spy = jest
			.spyOn( Storage.prototype, 'setItem' )
			.mockImplementation( () => {
				throw new Error( 'blocked' );
			} );
		initialiseMessagePreview( root() );
		expect( () => type( 'to', 'Sam' ) ).not.toThrow();
		expect( line( 'to' ).textContent ).toBe( 'Dear Sam,' );
		spy.mockRestore();
	} );
} );
