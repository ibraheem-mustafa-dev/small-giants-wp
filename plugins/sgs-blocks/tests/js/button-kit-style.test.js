/**
 * components/button-kit/button-kit-style.js — the editor canvas's twin of a built-in button's look.
 *
 * It must paint what includes/helpers-button-style.php::sgs_button_kit_css prints: the same fixture
 * (tests/fixtures/button-kit/preview-parity.json) is handed to the PHP emitter in ButtonKitCssTest, which proves it prints each
 * declaration, and to the twin here, which must return each one. A mutation that drops a family from the twin fails
 * "returns every declaration"; one that stops reading a registry family fails "reads each registry family".
 */

'use strict';

const fixture = require( '../fixtures/button-kit/preview-parity.json' );
const buttonKitStyle = require( '../../src/components/button-kit/button-kit-style' ).default;

const kebab = ( key ) => key.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );

/** The style as CSS `[property, value]` pairs. */
const pairs = ( style ) => Object.entries( style ).map( ( [ key, value ] ) => [ kebab( key ), String( value ) ] );

describe( 'buttonKitStyle', () => {
	test( 'returns every declaration the PHP emitter prints for the shared fixture', () => {
		const style = pairs( buttonKitStyle( fixture.attributes, 'x' ) );
		fixture.declarations.forEach( ( [ property, value ] ) => {
			expect( style ).toContainEqual( [ property, value ] );
		} );
	} );

	test( 'a set that is empty, or holds only another prefix, gives an empty style', () => {
		expect( buttonKitStyle( {}, 'x' ) ).toEqual( {} );
		expect( buttonKitStyle( undefined, 'x' ) ).toEqual( {} );
		expect( buttonKitStyle( fixture.attributes, 'other' ) ).toEqual( {} );
	} );

	test( 'padding and radius follow the previewed device, one side at a time', () => {
		const attributes = {
			xPadding: { desktop: { top: '10px', left: '20px' }, mobile: { top: '4px' } },
			xBorderRadius: { desktop: { topLeft: '8px' }, tablet: { topLeft: '2px' } },
		};
		const mobile = buttonKitStyle( attributes, 'x', { tier: 'mobile' } );
		expect( mobile.paddingTop ).toBe( '4px' );
		expect( mobile.paddingLeft ).toBe( '20px' );
		expect( mobile.borderTopLeftRadius ).toBe( '2px' );
		expect( buttonKitStyle( attributes, 'x' ).paddingTop ).toBe( '10px' );
	} );

	test( 'width: fit is fit-content, full is 100%, unset is nothing', () => {
		expect( buttonKitStyle( { xWidthType: 'fit' }, 'x' ).width ).toBe( 'fit-content' );
		expect( buttonKitStyle( { xWidthType: 'full' }, 'x' ).width ).toBe( '100%' );
		expect( buttonKitStyle( { xWidthType: '' }, 'x' ) ).toEqual( {} );
	} );

	test( 'a colour slug resolves through the palette', () => {
		const style = buttonKitStyle( { xColourBackground: 'accent' }, 'x', { palette: [ { slug: 'accent', color: '#c90' } ] } );
		expect( style.backgroundColor ).toBe( '#c90' );
	} );

	test( 'reads each registry family, all under the prefix', () => {
		const read = [];
		const spy = new Proxy( {}, {
			get: ( _t, key ) => {
				if ( 'string' === typeof key ) {
					read.push( key );
				}
				return undefined;
			},
		} );
		buttonKitStyle( spy, 'x' );
		expect( read.length ).toBeGreaterThan( 8 );
		read.forEach( ( name ) => {
			expect( name.startsWith( 'x' ) ).toBe( true );
		} );
		// Every family the registry lists is read (the shared type helper also looks for typography settings the kit never
		// generates, which stay absent).
		[ 'ColourBackground', 'ColourText', 'BorderWidth', 'BorderRadius', 'Padding', 'MinHeight', 'Shadow', 'WidthType', 'FontSize' ].forEach( ( base ) => {
			expect( read ).toContain( 'x' + base );
		} );
	} );
} );
