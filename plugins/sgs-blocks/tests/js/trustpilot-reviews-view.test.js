/**
 * Behavioural tests for the sgs/trustpilot-reviews carousel autoplay pause (src/blocks/trustpilot-reviews/view.js).
 *
 *   - Keyboard focus pauses autoplay and focus leaving resumes it; a pointer leaving does not
 *     resume a focused carousel.
 *   - The server-rendered shared pause / play button is shown while autoplay runs and holds a pause.
 *   - Under prefers-reduced-motion autoplay never starts and the button stays hidden.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path to run the same tests against another copy.
 */

const path = require( 'path' );

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/trustpilot-reviews/view.js' );
const SPEED = 1000;

let moves = 0;

function buildCarousel() {
	document.body.innerHTML = `
		<div class="wp-block-sgs-trustpilot-reviews" data-variant="carousel" data-autoplay="true" data-autoplay-speed="${ SPEED }">
			<div class="sgs-trustpilot-reviews__viewport">
				<div class="sgs-trustpilot-reviews__track">
					<article class="sgs-trustpilot-reviews__card"><a href="/one">One</a></article>
					<article class="sgs-trustpilot-reviews__card"><a href="/two">Two</a></article>
					<article class="sgs-trustpilot-reviews__card"><a href="/three">Three</a></article>
				</div>
			</div>
			<button type="button" class="sgs-motion-pause sgs-motion-pause--inline sgs-trustpilot-reviews__pause" aria-pressed="false" aria-label="Pause reviews" data-sgs-motion-pause hidden></button>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const root = document.querySelector( '.wp-block-sgs-trustpilot-reviews' );
	const track = root.querySelector( '.sgs-trustpilot-reviews__track' );
	track.scrollBy = () => {
		moves++;
	};
	track.scrollTo = () => {};
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

function loadView() {
	jest.isolateModules( () => {
		require( VIEW );
	} );
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
	// Not at the end of the track, so every autoplay tick moves one card.
	Object.defineProperty( HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 3000 } );
	Object.defineProperty( HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 } );
} );

afterEach( () => {
	jest.clearAllTimers();
	jest.useRealTimers();
} );

describe( 'trustpilot-reviews autoplay: pause (WCAG 2.2.2)', () => {
	it( 'advances on its own while nothing holds it', () => {
		buildCarousel();
		loadView();
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 2 );
	} );

	it( 'stops while keyboard focus is inside and resumes when focus leaves', () => {
		const { root } = buildCarousel();
		loadView();
		const link = root.querySelector( 'a' );
		link.dispatchEvent( focusEvent( 'focusin' ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
		link.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED );
		expect( moves ).toBe( 1 );
	} );

	it( 'a pointer leaving does not resume a focused carousel', () => {
		const { root } = buildCarousel();
		loadView();
		hover( root, true );
		root.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		hover( root, false );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
	} );

	it( 'shows the button and holds its pause after focus leaves, until pressed again', () => {
		const { button } = buildCarousel();
		loadView();
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
		const { button } = buildCarousel();
		loadView();
		jest.advanceTimersByTime( SPEED * 2 );
		expect( moves ).toBe( 0 );
		expect( button.hidden ).toBe( true );
	} );
} );
