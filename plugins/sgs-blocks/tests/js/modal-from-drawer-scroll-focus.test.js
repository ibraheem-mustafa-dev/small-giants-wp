/**
 * A modal opened from a nav-drawer link while the drawer's scroll lock is still on (body position:fixed, top:-900px,
 * window.scrollY reads 0) must save the page's real position (900), not the locked 0, so closing it returns the page to
 * 900. Focus then returns to the opener, or when that sat in the now-closed drawer, to the burger that opened the drawer.
 */

const mount = () => {
	document.body.innerHTML = `
		<button class="sgs-nav-bar-menu__burger" id="burger" aria-controls="drawer">Menu</button>
		<dialog id="drawer" data-sgs-nav-drawer=""><a id="link" href="#size-guide">Size guide</a></dialog>
		<dialog id="m" class="sgs-modal__dialog"><button class="sgs-modal__close">x</button></dialog>`;
	const dialog = document.getElementById( 'm' );
	dialog.showModal = () => dialog.setAttribute( 'open', '' );
	dialog.close = () => dialog.removeAttribute( 'open' );
	return dialog;
};

const visible = ( el ) => {
	el.getClientRects = () => [ { width: 1, height: 1 } ];
};

beforeEach( () => {
	document.body.removeAttribute( 'style' );
	document.body.className = '';
	jest.resetModules();
	Object.defineProperty( window, 'scrollY', { configurable: true, value: 0 } );
} );

test( 'opened under a drawer scroll lock, the modal saves the locked page position, not 0', () => {
	const dialog = mount();
	document.body.style.position = 'fixed';
	document.body.style.top = '-900px';
	const { openModal } = require( '../../src/blocks/modal/modal-core' );
	openModal( dialog, null, null );
	expect( dialog.dataset.scrollY ).toBe( '900' );
	expect( document.body.style.getPropertyValue( '--sgs-modal-scroll-y' ) ).toBe( '-900px' );
} );

test( 'a plain modal still saves window.scrollY', () => {
	const dialog = mount();
	Object.defineProperty( window, 'scrollY', { configurable: true, value: 420 } );
	const { openModal } = require( '../../src/blocks/modal/modal-core' );
	openModal( dialog, null, null );
	expect( dialog.dataset.scrollY ).toBe( '420' );
} );

test( 'focus returns to the burger when the opener sat in the drawer that has closed', () => {
	const dialog = mount();
	const link = document.getElementById( 'link' );
	const burger = document.getElementById( 'burger' );
	visible( burger );
	link.focus();
	const { openModal, restoreModalFocus } = require( '../../src/blocks/modal/modal-core' );
	openModal( dialog, null, link );
	document.activeElement.blur();
	restoreModalFocus( dialog );
	expect( document.activeElement ).toBe( burger );
} );

test( 'focus on the modal close button at close time (the browser has not moved it yet) still goes to the burger', () => {
	const dialog = mount();
	const link = document.getElementById( 'link' );
	const burger = document.getElementById( 'burger' );
	visible( burger );
	link.focus();
	const { openModal, restoreModalFocus } = require( '../../src/blocks/modal/modal-core' );
	openModal( dialog, null, link );
	dialog.querySelector( '.sgs-modal__close' ).focus();
	expect( document.activeElement ).toBe( dialog.querySelector( '.sgs-modal__close' ) );
	restoreModalFocus( dialog );
	expect( document.activeElement ).toBe( burger );
} );

test( 'focus the user already moved outside the dialog is left alone', () => {
	const dialog = mount();
	const burger = document.getElementById( 'burger' );
	const other = document.createElement( 'button' );
	document.body.appendChild( other );
	const { openModal, restoreModalFocus } = require( '../../src/blocks/modal/modal-core' );
	openModal( dialog, null, burger );
	other.focus();
	restoreModalFocus( dialog );
	expect( document.activeElement ).toBe( other );
} );

test( 'focus returns to a plain opener that is still shown', () => {
	const dialog = mount();
	const burger = document.getElementById( 'burger' );
	visible( burger );
	burger.focus();
	const { openModal, restoreModalFocus } = require( '../../src/blocks/modal/modal-core' );
	openModal( dialog, null, burger );
	document.activeElement.blur();
	restoreModalFocus( dialog );
	expect( document.activeElement ).toBe( burger );
} );

describe( 'a drawer id that is not selector-safe', () => {
	const BS = String.fromCharCode( 92 );
	const ID = `d"q${ BS }x`; // d"q, backslash, x
	const ESCAPED_SELECTOR = `[aria-controls="d${ BS }"q${ BS }${ BS }x"]`; // each quote and backslash of the id escaped

	const setup = () => {
		document.body.innerHTML = `
			<button id="burger"></button>
			<dialog id="drawer" data-sgs-nav-drawer=""><a id="link" href="#x">x</a></dialog>
			<dialog id="m" class="sgs-modal__dialog"><button class="sgs-modal__close">x</button></dialog>`;
		document.getElementById( 'drawer' ).id = ID;
		const burger = document.getElementById( 'burger' );
		burger.setAttribute( 'aria-controls', ID );
		visible( burger );
		const dialog = document.getElementById( 'm' );
		dialog.showModal = () => dialog.setAttribute( 'open', '' );
		const link = document.getElementById( 'link' );
		link.focus();
		const { openModal, restoreModalFocus } = require( '../../src/blocks/modal/modal-core' );
		openModal( dialog, null, link );
		link.blur();
		// jsdom's selector engine can hang on a raw quote, so the browser's behaviour is stood in for: an unescaped
		// quote throws a SyntaxError, the escaped selector finds the burger.
		const original = document.querySelector.bind( document );
		jest.spyOn( document, 'querySelector' ).mockImplementation( ( selector ) => {
			if ( selector.includes( 'd"q' ) && selector !== ESCAPED_SELECTOR ) {
				throw new SyntaxError( 'not a valid selector' );
			}
			return selector === ESCAPED_SELECTOR ? burger : original( selector );
		} );
		return { dialog, burger, restoreModalFocus };
	};

	test( 'with CSS.escape it finds the burger and does not throw', () => {
		window.CSS = { escape: ( v ) => v.split( '' ).map( ( ch ) => ( '"' === ch || BS === ch ? BS + ch : ch ) ).join( '' ) };
		const { dialog, burger, restoreModalFocus } = setup();
		expect( () => restoreModalFocus( dialog ) ).not.toThrow();
		expect( document.activeElement ).toBe( burger );
	} );

	test( 'without CSS.escape it compares the attribute and finds the burger', () => {
		delete window.CSS;
		const { dialog, burger, restoreModalFocus } = setup();
		expect( () => restoreModalFocus( dialog ) ).not.toThrow();
		expect( document.activeElement ).toBe( burger );
	} );
} );
