/**
 * Behavioural tests for the sgs/testimonial-slider autoplay pause (src/blocks/testimonial-slider/view.js).
 *
 *   - Keyboard focus pauses autoplay; a pointer leaving does not resume a focused slider.
 *   - The server-rendered shared pause / play button is shown while autoplay runs and holds a
 *     pause; the script adds no second button of its own.
 *   - Under prefers-reduced-motion autoplay never starts and the button stays hidden.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path to run the same tests against another copy.
 */

const path = require( 'path' );

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/testimonial-slider/view.js' );
const SPEED = 1000;

function buildSlider() {
	document.body.innerHTML = `
		<div class="sgs-testimonial-slider" data-autoplay="true" data-speed="${ SPEED }" data-slides="1">
			<div class="sgs-testimonial-slider__track">
				<div class="sgs-testimonial-slider__slide"><a href="/one">One</a></div>
				<div class="sgs-testimonial-slider__slide"><a href="/two">Two</a></div>
				<div class="sgs-testimonial-slider__slide"><a href="/three">Three</a></div>
			</div>
			<div class="sgs-testimonial-slider__controls">
				<div class="sgs-testimonial-slider__dots">
					<button class="sgs-testimonial-slider__dot sgs-testimonial-slider__dot--active" type="button"></button>
					<button class="sgs-testimonial-slider__dot" type="button"></button>
					<button class="sgs-testimonial-slider__dot" type="button"></button>
				</div>
				<button type="button" class="sgs-motion-pause sgs-motion-pause--inline sgs-testimonial-slider__pause" aria-pressed="false" aria-label="Pause testimonials" data-sgs-motion-pause hidden></button>
			</div>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const slider = document.querySelector( '.sgs-testimonial-slider' );
	return { slider, button: slider.querySelector( '[data-sgs-motion-pause]' ) };
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

const activeDot = ( slider ) =>
	Array.from( slider.querySelectorAll( '.sgs-testimonial-slider__dot' ) ).findIndex( ( d ) =>
		d.classList.contains( 'sgs-testimonial-slider__dot--active' )
	);
const focusEvent = ( type, relatedTarget = null ) => new FocusEvent( type, { bubbles: true, relatedTarget } );
const pointerEvent = ( type, pointerType = 'mouse' ) => {
	const event = new MouseEvent( type );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
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
} );

afterEach( () => {
	jest.clearAllTimers();
	jest.useRealTimers();
} );

describe( 'testimonial-slider autoplay: pause (WCAG 2.2.2)', () => {
	it( 'advances on its own while nothing holds it', () => {
		const { slider } = buildSlider();
		loadView();
		jest.advanceTimersByTime( SPEED );
		expect( activeDot( slider ) ).toBe( 1 );
	} );

	it( 'stops while keyboard focus is inside and resumes when focus leaves', () => {
		const { slider } = buildSlider();
		loadView();
		const link = slider.querySelector( 'a' );
		link.dispatchEvent( focusEvent( 'focusin' ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( activeDot( slider ) ).toBe( 0 );
		link.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED );
		expect( activeDot( slider ) ).toBe( 1 );
	} );

	it( 'a pointer leaving does not resume a focused slider', () => {
		const { slider } = buildSlider();
		loadView();
		hover( slider, true );
		slider.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		hover( slider, false );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( activeDot( slider ) ).toBe( 0 );
	} );

	it( 'shows the one server-rendered button and holds its pause after focus leaves', () => {
		const { slider, button } = buildSlider();
		loadView();
		expect( slider.querySelectorAll( 'button[aria-label*="estimonials"]' ).length ).toBe( 1 );
		expect( button.hidden ).toBe( false );

		button.dispatchEvent( focusEvent( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		button.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( activeDot( slider ) ).toBe( 0 );

		button.click();
		jest.advanceTimersByTime( SPEED );
		expect( activeDot( slider ) ).toBe( 1 );
	} );

	it( 'never autoplays under reduced motion, and the button stays hidden', () => {
		stubMatchMedia( [ '(prefers-reduced-motion: reduce)' ] );
		const { slider, button } = buildSlider();
		loadView();
		jest.advanceTimersByTime( SPEED * 2 );
		expect( activeDot( slider ) ).toBe( 0 );
		expect( button.hidden ).toBe( true );
	} );
} );

describe( 'testimonial-slider loop clones: hover-capable but hidden from keyboard and assistive tech', () => {
	function buildCloneSlider() {
		document.body.innerHTML = `
			<div class="sgs-testimonial-slider" data-slides="1">
				<div class="sgs-testimonial-slider__track">
					<div class="sgs-testimonial-slider__slide" id="s1"><a href="/one">One</a><button type="button">B</button><span tabindex="0">T</span><div contenteditable="true">E</div></div>
					<div class="sgs-testimonial-slider__slide"><a href="/two">Two</a></div>
					<div class="sgs-testimonial-slider__slide"><a href="/three">Three</a></div>
				</div>
			</div>`;
		return document.querySelector( '.sgs-testimonial-slider' );
	}

	it( 'clones take pointer events (not inert) and are aria-hidden', () => {
		const slider = buildCloneSlider();
		loadView();
		const clones = slider.querySelectorAll( '[data-clone]' );
		expect( clones.length ).toBeGreaterThan( 0 );
		clones.forEach( ( clone ) => {
			expect( clone.hasAttribute( 'inert' ) ).toBe( false );
			expect( clone.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
			expect( clone.hasAttribute( 'id' ) ).toBe( false );
		} );
	} );

	it( 'every focusable descendant of a clone has tabindex -1', () => {
		const slider = buildCloneSlider();
		loadView();
		const focusable = 'a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]';
		const inClones = slider.querySelectorAll( '[data-clone] :is(' + focusable + ')' );
		expect( inClones.length ).toBeGreaterThan( 0 );
		inClones.forEach( ( el ) => expect( el.getAttribute( 'tabindex' ) ).toBe( '-1' ) );
		// Real slides keep their own focus order.
		expect( slider.querySelector( '#s1 span' ).getAttribute( 'tabindex' ) ).toBe( '0' );
	} );
} );
