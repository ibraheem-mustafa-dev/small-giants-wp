/**
 * The editor canvas's add-to-basket form shows the linked flow's opener beside Add to Cart under exactly the conditions
 * render.php prints it (Spec 43 FR-43-25): the setting is on, the layout is not the guided one, and the button is not set to
 * open a popup that names one. A popup action with no popup named falls back to cart mode in PHP, so the opener shows.
 */

import { cartFormMock, keepsFlowOpener } from '../../src/blocks/buybox/canvas-cart-form';

const WRAPPER = 'sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow';
const shows = ( attributes ) =>
	cartFormMock( { attributes, cartVariant: '', cartStyle: {} } ).props.className === WRAPPER;

describe( 'cartFormMock keeps the opener under the same conditions as render.php', () => {
	it( 'shows the opener when the setting is on in the standard layout', () => {
		expect( shows( { keepAddToCartWithFlow: true } ) ).toBe( true );
		expect( shows( { keepAddToCartWithFlow: true, buyboxLayout: 'standard', addToCartAction: 'cart' } ) ).toBe( true );
		expect( shows( { keepAddToCartWithFlow: true, buyboxLayout: 'configurator' } ) ).toBe( true );
	} );

	it( 'shows no opener when the setting is off or absent', () => {
		expect( shows( {} ) ).toBe( false );
		expect( shows( { keepAddToCartWithFlow: false } ) ).toBe( false );
	} );

	it( 'shows no opener when the button opens a named popup', () => {
		expect( shows( { keepAddToCartWithFlow: true, addToCartAction: 'modal', addToCartModalId: 'my-popup' } ) ).toBe( false );
	} );

	it( 'shows the opener when the popup action names no popup (PHP falls back to cart mode)', () => {
		expect( shows( { keepAddToCartWithFlow: true, addToCartAction: 'modal' } ) ).toBe( true );
		expect( shows( { keepAddToCartWithFlow: true, addToCartAction: 'modal', addToCartModalId: '' } ) ).toBe( true );
		expect( shows( { keepAddToCartWithFlow: true, addToCartAction: 'modal', addToCartModalId: '   ' } ) ).toBe( true );
	} );

	it( 'shows no opener in the guided layout, which never runs a flow', () => {
		expect( shows( { keepAddToCartWithFlow: true, buyboxLayout: 'guided' } ) ).toBe( false );
	} );

	it( 'reads an action and popup id the way sanitize_key and sanitize_text_field do', () => {
		expect( keepsFlowOpener( { keepAddToCartWithFlow: true, addToCartAction: 'Modal', addToCartModalId: ' <b>pop</b> ' } ) ).toBe( false );
		expect( keepsFlowOpener( { keepAddToCartWithFlow: true, addToCartAction: 'bogus', addToCartModalId: 'pop' } ) ).toBe( true );
	} );

	it( 'draws the opener in the preset its own style names, else the secondary look', () => {
		const openerClass = ( attributes ) => {
			const opener = cartFormMock( { attributes: { keepAddToCartWithFlow: true, ...attributes }, cartVariant: '', cartStyle: {} } ).props.children[ 1 ];
			return opener.props.children.props.className;
		};
		expect( openerClass( {} ) ).toContain( 'buybox__add-to-cart--secondary' );
		expect( openerClass( { flowOpenerStyle: 'primary', addToCartStyle: 'outline' } ) ).not.toContain( 'buybox__add-to-cart--secondary' );
		expect( openerClass( { flowOpenerStyle: 'primary' } ) ).toContain( 'buybox__add-to-cart--primary' );
		expect( openerClass( { flowOpenerStyle: 'nonsense' } ) ).toContain( 'buybox__add-to-cart--secondary' );
	} );
} );
