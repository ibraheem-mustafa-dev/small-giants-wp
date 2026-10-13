/**
 * Behavioural tests for the sgs/notice-banner message rotation pause (src/blocks/notice-banner/view.js).
 *
 *   - Keyboard focus inside the banner pauses rotation, also with "Pause on hover" off.
 *   - A pointer leaving does not resume a focused banner.
 *   - The optional shared pause / play button is shown once rotation runs and holds a pause; an
 *     arrow is a held pause too.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path to run the same tests against another copy.
 */

const path = require( 'path' );

let mockStoreDef = null;
let mockCtx = {};
let mockRef = null;

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: ( name, def ) => {
			mockStoreDef = def;
			return def;
		},
		getContext: () => mockCtx,
		getElement: () => ( { ref: mockRef } ),
	} ),
	{ virtual: true }
);

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/notice-banner/view.js' );
const INTERVAL_S = 2;
const TICK = INTERVAL_S * 1000;

function buildBanner( { button = true } = {} ) {
	document.body.innerHTML = `
		<div class="sgs-notice-banner" data-wp-interactive="sgs/notice-banner">
			<div class="sgs-notice-banner__messages" aria-live="off">
				<div class="sgs-notice-message"><a href="/a">A</a></div>
				<div class="sgs-notice-message"><a href="/b">B</a></div>
				<div class="sgs-notice-message"><a href="/c">C</a></div>
			</div>
			${ button ? '<button type="button" class="sgs-motion-pause sgs-motion-pause--inline sgs-notice-banner__pause" aria-pressed="false" aria-label="Pause announcements" data-sgs-motion-pause hidden></button>' : '' }
			<button class="sgs-notice-banner__arrows sgs-notice-banner__next" type="button">›</button>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const root = document.querySelector( '.sgs-notice-banner' );
	return { root, button: root.querySelector( '[data-sgs-motion-pause]' ) };
}

function boot( root, { pauseOnHover = true } = {} ) {
	jest.isolateModules( () => {
		require( VIEW );
	} );
	mockCtx = { messageMode: 'rotate', rotateInterval: INTERVAL_S, pauseOnHover, activeIndex: 0 };
	mockRef = root;
	mockStoreDef.callbacks.init();
}

const active = ( root ) =>
	Array.from( root.querySelectorAll( '.sgs-notice-message' ) ).findIndex( ( el ) => el.classList.contains( 'is-active' ) );
const focusEvent = ( type, relatedTarget = null ) => new FocusEvent( type, { bubbles: true, relatedTarget } );
const pointerEvent = ( type ) => {
	const event = new MouseEvent( type );
	Object.defineProperty( event, 'pointerType', { value: 'mouse' } );
	return event;
};

beforeEach( () => {
	jest.useFakeTimers();
	window.matchMedia = jest.fn( () => ( { matches: false, addEventListener: () => {}, removeEventListener: () => {} } ) );
} );

afterEach( () => {
	jest.clearAllTimers();
	jest.useRealTimers();
} );

describe( 'notice-banner rotation: pause (WCAG 2.2.2)', () => {
	it( 'rotates on its own while nothing holds it', () => {
		const { root } = buildBanner();
		boot( root );
		jest.advanceTimersByTime( TICK );
		expect( active( root ) ).toBe( 1 );
	} );

	it( 'pauses while keyboard focus is inside, also with "Pause on hover" off', () => {
		const { root } = buildBanner();
		boot( root, { pauseOnHover: false } );
		const link = root.querySelector( 'a' );
		link.dispatchEvent( focusEvent( 'focusin' ) );
		jest.advanceTimersByTime( TICK * 2 );
		expect( active( root ) ).toBe( 0 );
		expect( root.querySelector( '.sgs-notice-banner__messages' ).getAttribute( 'aria-live' ) ).toBe( 'polite' );
		link.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( TICK );
		expect( active( root ) ).toBe( 1 );
	} );

	it( 'a pointer leaving does not resume a focused banner', () => {
		const { root } = buildBanner();
		boot( root );
		root.dispatchEvent( pointerEvent( 'pointerenter' ) );
		root.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		root.dispatchEvent( pointerEvent( 'pointerleave' ) );
		jest.advanceTimersByTime( TICK * 2 );
		expect( active( root ) ).toBe( 0 );
	} );

	it( 'shows the optional button and holds its pause after focus leaves, until pressed again', () => {
		const { root, button } = buildBanner();
		boot( root );
		expect( button.hidden ).toBe( false );
		button.dispatchEvent( focusEvent( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		button.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( TICK * 2 );
		expect( active( root ) ).toBe( 0 );
		button.click();
		jest.advanceTimersByTime( TICK );
		expect( active( root ) ).toBe( 1 );
	} );

	it( 'an arrow is a held pause', () => {
		const { root, button } = buildBanner();
		boot( root );
		mockRef = root.querySelector( '.sgs-notice-banner__next' );
		mockStoreDef.actions.nextMessage();
		expect( active( root ) ).toBe( 1 );
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		jest.advanceTimersByTime( TICK * 2 );
		expect( active( root ) ).toBe( 1 );
	} );

	it( 'still rotates and pauses on focus with no button rendered (the option is off by default)', () => {
		const { root } = buildBanner( { button: false } );
		boot( root );
		root.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		jest.advanceTimersByTime( TICK * 2 );
		expect( active( root ) ).toBe( 0 );
	} );
} );
