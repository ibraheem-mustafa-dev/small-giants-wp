/**
 * Behavioural tests for the sgs/post-grid carousel autoplay pause (src/blocks/post-grid/view-carousel.js).
 *
 *   - Keyboard focus pauses autoplay; a pointer leaving does not resume a focused carousel, and
 *     two inputs ending never start two timers.
 *   - The server-rendered shared pause / play button is shown while autoplay runs and holds a pause.
 *   - Under prefers-reduced-motion autoplay never starts and the button stays hidden.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path of another view-carousel.js to run the same tests on it.
 */

const path = require( 'path' );

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/post-grid/view-carousel.js' );
const SPEED = 1000;

let scrolledTo = [];

function buildGrid() {
	document.body.innerHTML = `
		<div class="sgs-post-grid sgs-post-grid--carousel">
			<div class="sgs-post-grid__inner">
				<article class="sgs-post-grid__card" data-i="0"><a href="/one">One</a></article>
				<article class="sgs-post-grid__card" data-i="1"><a href="/two">Two</a></article>
				<article class="sgs-post-grid__card" data-i="2"><a href="/three">Three</a></article>
			</div>
			<button type="button" class="sgs-motion-pause sgs-motion-pause--inline sgs-post-grid__pause" aria-pressed="false" aria-label="Pause carousel" data-sgs-motion-pause hidden></button>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const grid = document.querySelector( '.sgs-post-grid' );
	// jsdom has no layout: the track is three one-card windows wide, so it scrolls to 600 at most.
	const track = grid.querySelector( '.sgs-post-grid__inner' );
	Object.defineProperty( track, 'scrollWidth', { get: () => 900 } );
	Object.defineProperty( track, 'clientWidth', { get: () => 300 } );
	return { grid, track, button: grid.querySelector( '[data-sgs-motion-pause]' ) };
}

function stubMatchMedia( matching ) {
	window.matchMedia = jest.fn( ( query ) => ( {
		matches: matching.includes( query ),
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	} ) );
}

function start( grid ) {
	let initCarousel;
	jest.isolateModules( () => {
		( { initCarousel } = require( VIEW ) );
	} );
	initCarousel( grid, { carouselAutoplay: true, carouselSpeed: SPEED } );
}

const lastCard = () => ( scrolledTo.length ? scrolledTo[ scrolledTo.length - 1 ] : null );
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
	scrolledTo = [];
	Element.prototype.scrollIntoView = function () {
		scrolledTo.push( this.dataset.i );
	};
} );

afterEach( () => {
	jest.clearAllTimers();
	jest.useRealTimers();
} );

describe( 'post-grid carousel autoplay: pause (WCAG 2.2.2)', () => {
	it( 'advances on its own while nothing holds it', () => {
		const { grid } = buildGrid();
		start( grid );
		jest.advanceTimersByTime( SPEED );
		expect( lastCard() ).toBe( '1' );
	} );

	it( 'goes back to the first card when it reaches the end of the track', () => {
		const { grid, track } = buildGrid();
		start( grid );
		track.scrollLeft = 600; // the end: the most this track scrolls
		jest.advanceTimersByTime( SPEED );
		expect( lastCard() ).toBe( '0' );
	} );

	it( 'a pointer leaving does not resume a focused carousel', () => {
		const { grid } = buildGrid();
		start( grid );
		hover( grid, true );
		grid.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		hover( grid, false );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastCard() ).toBeNull(); // nothing scrolled: the carousel does not move itself on load or while paused
	} );

	it( 'hover and focus both ending start one timer, not two', () => {
		const { grid } = buildGrid();
		start( grid );
		hover( grid, true );
		grid.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		hover( grid, false );
		grid.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		scrolledTo = [];
		jest.advanceTimersByTime( SPEED );
		expect( scrolledTo ).toEqual( [ '1' ] );
	} );

	it( 'shows the button and holds its pause after focus leaves, until pressed again', () => {
		const { grid, button } = buildGrid();
		start( grid );
		expect( button.hidden ).toBe( false );
		button.dispatchEvent( focusEvent( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		button.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastCard() ).toBeNull(); // nothing scrolled: the carousel does not move itself on load or while paused
		button.click();
		jest.advanceTimersByTime( SPEED );
		expect( lastCard() ).toBe( '1' );
	} );

	it( 'never autoplays under reduced motion, and the button stays hidden', () => {
		stubMatchMedia( [ '(prefers-reduced-motion: reduce)' ] );
		const { grid, button } = buildGrid();
		start( grid );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastCard() ).toBeNull(); // nothing scrolled: the carousel does not move itself on load or while paused
		expect( button.hidden ).toBe( true );
	} );
} );
