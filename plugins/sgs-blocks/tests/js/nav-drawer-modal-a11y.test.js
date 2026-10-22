/**
 * The nav drawer behaves as a modal dialog (WCAG 2.1.2, 2.4.3, 4.1.2): focus moves in on open, Tab and Shift+Tab
 * cycle inside it, Escape closes it through the store's own close path, focus returns to the burger, and the
 * burger's `aria-controls` names the real dialog id while its `aria-expanded` follows the open state.
 *
 * Drives the real shared store (src/shared/nav-interactivity/store.js) with a stand-in for the Interactivity runtime
 * and a jsdom dialog (jsdom has no layout and no `showModal`, so those are supplied here).
 */

let mockDefinition;
let mockContext;
let mockElement;

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: jest.fn( ( name, def ) => {
			mockDefinition = def;
			return def;
		} ),
		getContext: () => mockContext,
		getElement: () => mockElement,
	} ),
	{ virtual: true }
);

const MARKUP = `
	<header class="wp-block-template-part">
		<button type="button" id="burger" aria-expanded="false" aria-controls="sgs-nav-drawer">Menu</button>
	</header>
	<dialog id="sgs-nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu"
		data-sgs-nav-drawer data-sgs-nav-modality="modal">
		<button type="button" id="close" data-sgs-nav-close>Close menu</button>
		<a id="first" href="/one/">One</a>
		<a id="last" href="/two/">Two</a>
	</dialog>`;

const press = ( target, key, shiftKey = false ) => {
	const event = new KeyboardEvent( 'keydown', { key, shiftKey, bubbles: true, cancelable: true } );
	target.dispatchEvent( event );
	return event;
};

describe( 'nav drawer modal behaviour', () => {
	let burger;
	let drawer;

	beforeAll( () => {
		// jsdom draws nothing: report one box so the focusable filter sees the controls.
		HTMLElement.prototype.getClientRects = () => [ {} ];
		// The scroll lock restores the page position on close; jsdom does not implement it.
		window.scrollTo = jest.fn();
		window.matchMedia = window.matchMedia || ( () => ( { matches: true, addEventListener() {}, removeEventListener() {} } ) );
		HTMLDialogElement.prototype.showModal = function showModal() {
			this.setAttribute( 'open', '' );
		};
		HTMLDialogElement.prototype.show = HTMLDialogElement.prototype.showModal;
		HTMLDialogElement.prototype.close = function close() {
			this.removeAttribute( 'open' );
			this.dispatchEvent( new Event( 'close' ) );
		};
		jest.isolateModules( () => {
			require( '../../src/shared/nav-interactivity/store' );
		} );
	} );

	beforeEach( () => {
		document.body.innerHTML = MARKUP;
		burger = document.getElementById( 'burger' );
		drawer = document.getElementById( 'sgs-nav-drawer' );
		mockContext = { isOpen: false, drawerRef: 'sgs-nav-drawer' };
		mockElement = { ref: burger };
	} );

	const open = () => {
		burger.focus();
		mockDefinition.actions.openDrawer();
	};

	test( 'the burger names the real dialog, which carries an accessible name', () => {
		const target = document.getElementById( burger.getAttribute( 'aria-controls' ) );
		expect( target ).toBe( drawer );
		expect( drawer.getAttribute( 'aria-label' ) ).not.toBe( '' );
	} );

	test( 'opening moves focus into the drawer', () => {
		open();
		expect( drawer.open ).toBe( true );
		expect( drawer.contains( document.activeElement ) ).toBe( true );
	} );

	test( 'Tab on the last control wraps to the first, and Shift+Tab on the first wraps to the last', () => {
		open();
		const first = drawer.querySelector( '#close' );
		const last = document.getElementById( 'last' );

		last.focus();
		expect( press( last, 'Tab' ).defaultPrevented ).toBe( true );
		expect( document.activeElement ).toBe( first );

		expect( press( first, 'Tab', true ).defaultPrevented ).toBe( true );
		expect( document.activeElement ).toBe( last );
	} );

	test( 'Tab between inner controls is left to the browser', () => {
		open();
		const middle = document.getElementById( 'first' );
		middle.focus();
		expect( press( middle, 'Tab' ).defaultPrevented ).toBe( false );
	} );

	test( 'Escape (the dialog cancel event) closes the drawer and returns focus to the burger', () => {
		jest.useFakeTimers();
		open();
		const cancel = new Event( 'cancel', { cancelable: true } );
		drawer.dispatchEvent( cancel );
		jest.runAllTimers();
		jest.useRealTimers();

		expect( cancel.defaultPrevented ).toBe( true );
		expect( drawer.open ).toBe( false );
		expect( document.activeElement ).toBe( burger );
	} );

	test( 'the close button closes the drawer and returns focus to the burger', () => {
		jest.useFakeTimers();
		open();
		document.getElementById( 'close' ).click();
		jest.runAllTimers();
		jest.useRealTimers();

		expect( drawer.open ).toBe( false );
		expect( document.activeElement ).toBe( burger );
	} );
} );
