/**
 * Behavioural tests for the sgs/google-reviews slider autoplay pause (src/blocks/google-reviews/view.js,
 * the store's callbacks.init).
 *
 *   - Keyboard focus pauses autoplay and focus leaving resumes it; a pointer leaving does not
 *     resume a focused slider.
 *   - The server-rendered shared pause / play button is shown while autoplay runs and holds a pause.
 *   - Under prefers-reduced-motion autoplay never starts and the button stays hidden.
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

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/google-reviews/view.js' );
const SPEED = 1000;

let moves = 0;

function buildSlider() {
	document.body.innerHTML = `
		<div class="sgs-google-reviews">
			<div class="sgs-google-reviews__list">
				<article class="sgs-google-reviews__review"><a href="/one">One</a></article>
				<article class="sgs-google-reviews__review"><a href="/two">Two</a></article>
				<article class="sgs-google-reviews__review"><a href="/three">Three</a></article>
			</div>
			<div class="sgs-google-reviews__lead">
				<button type="button" class="sgs-motion-pause sgs-motion-pause--inline sgs-google-reviews__pause" aria-pressed="false" aria-label="Pause reviews" data-sgs-motion-pause hidden></button>
			</div>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const root = document.querySelector( '.sgs-google-reviews' );
	root.querySelector( '.sgs-google-reviews__list' ).scrollTo = () => {
		moves++;
	};
	return { root, button: root.querySelector( '[data-sgs-motion-pause]' ) };
}

function stubMatchMedia( matching ) {
	window.matchMedia = jest.fn( ( query ) => ( {
		matches: matching.includes( query ),
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	} ) );
}

function boot( root ) {
	jest.isolateModules( () => {
		require( VIEW );
	} );
	mockCtx = { autoplay: true, autoplaySpeed: SPEED };
	mockRef = root;
	mockStoreDef.callbacks.init();
}

const focusEvent = ( type, relatedTarget = null ) => new FocusEvent( type, { bubbles: true, relatedTarget } );
const pointerEvent = ( type ) => {
	const event = new MouseEvent( type );
	Object.defineProperty( event, 'pointerType', { value: 'mouse' } );
	return event;
};
// A real mouse fires the pointer event and then the matching mouse event.
const hover = ( el, on ) => {
	el.dispatchEvent( pointerEvent( on ? 'pointerenter' : 'pointerleave' ) );
	el.dispatchEvent( new MouseEvent( on ? 'mouseenter' : 'mouseleave' ) );
};

beforeEach( () => {
	jest.useFakeTimers();
	stubMatchMedia( [] );
	moves = 0;
} );

afterEach( () => {
	jest.clearAllTimers();
	jest.useRealTimers();
} );

describe( 'google-reviews slider autoplay: pause (WCAG 2.2.2)', () => {
	it( 'advances on its own while nothing holds it', () => {
		const { root } = buildSlider();
		boot( root );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 2 );
	} );

	it( 'stops while keyboard focus is inside and resumes when focus leaves', () => {
		const { root } = buildSlider();
		boot( root );
		const link = root.querySelector( 'a' );
		link.dispatchEvent( focusEvent( 'focusin' ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
		link.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED );
		expect( moves ).toBe( 1 );
	} );

	it( 'a pointer leaving does not resume a focused slider', () => {
		const { root } = buildSlider();
		boot( root );
		hover( root, true );
		root.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		hover( root, false );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
	} );

	it( 'shows the button and holds its pause after focus leaves, until pressed again', () => {
		const { root, button } = buildSlider();
		boot( root );
		expect( button.hidden ).toBe( false );
		button.dispatchEvent( focusEvent( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		button.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
		button.click();
		jest.advanceTimersByTime( SPEED );
		expect( moves ).toBe( 1 );
	} );

	it( 'never autoplays under reduced motion, and the button stays hidden', () => {
		stubMatchMedia( [ '(prefers-reduced-motion: reduce)' ] );
		const { root, button } = buildSlider();
		boot( root );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
		expect( button.hidden ).toBe( true );
	} );
} );
