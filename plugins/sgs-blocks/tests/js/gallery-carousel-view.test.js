/**
 * Behavioural tests for the sgs/gallery carousel autoplay pause (src/blocks/gallery/view.js).
 *
 *   - Keyboard focus pauses autoplay; a pointer leaving does not resume a focused carousel.
 *   - The server-rendered shared pause / play button is shown while autoplay runs and holds a pause.
 *   - Under prefers-reduced-motion autoplay never starts and the button stays hidden.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path to run the same tests against another copy.
 */

const path = require( 'path' );

jest.mock( '@wordpress/interactivity', () => ( { store: () => ( {} ), getContext: () => ( {} ), getElement: () => ( {} ) } ), {
	virtual: true,
} );

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/gallery/view.js' );
const SPEED = 1000;

let scrolledTo = [];

function buildGallery() {
	document.body.innerHTML = `
		<div class="sgs-gallery sgs-gallery--carousel" data-autoplay="true" data-speed="${ SPEED }">
			<div class="sgs-gallery__grid">
				<figure class="sgs-gallery__item" data-i="0"><a href="/one">One</a></figure>
				<figure class="sgs-gallery__item" data-i="1"><a href="/two">Two</a></figure>
				<figure class="sgs-gallery__item" data-i="2"><a href="/three">Three</a></figure>
			</div>
			<button type="button" class="sgs-motion-pause sgs-motion-pause--inline sgs-gallery__pause" aria-pressed="false" aria-label="Pause slideshow" data-sgs-motion-pause hidden></button>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const gallery = document.querySelector( '.sgs-gallery' );
	return { gallery, button: gallery.querySelector( '[data-sgs-motion-pause]' ) };
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

// The item autoplay last moved to (the first move at load is to item 0).
const lastItem = () => ( scrolledTo.length ? scrolledTo[ scrolledTo.length - 1 ] : null );
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

describe( 'gallery carousel autoplay: pause (WCAG 2.2.2)', () => {
	it( 'advances on its own while nothing holds it', () => {
		buildGallery();
		loadView();
		jest.advanceTimersByTime( SPEED );
		expect( lastItem() ).toBe( '1' );
	} );

	it( 'a pointer leaving does not resume a focused carousel', () => {
		const { gallery } = buildGallery();
		loadView();
		hover( gallery, true );
		gallery.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		hover( gallery, false );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastItem() ).toBe( '0' );
	} );

	it( 'focus moving between items inside does not resume it', () => {
		const { gallery } = buildGallery();
		loadView();
		const [ a, b ] = gallery.querySelectorAll( 'a' );
		a.dispatchEvent( focusEvent( 'focusin' ) );
		a.dispatchEvent( focusEvent( 'focusout', b ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastItem() ).toBe( '0' );
	} );

	it( 'shows the button and holds its pause after focus leaves, until pressed again', () => {
		const { button } = buildGallery();
		loadView();
		expect( button.hidden ).toBe( false );
		button.dispatchEvent( focusEvent( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		button.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastItem() ).toBe( '0' );
		button.click();
		jest.advanceTimersByTime( SPEED );
		expect( lastItem() ).toBe( '1' );
	} );

	it( 'never autoplays under reduced motion, and the button stays hidden', () => {
		stubMatchMedia( [ '(prefers-reduced-motion: reduce)' ] );
		const { button } = buildGallery();
		loadView();
		jest.advanceTimersByTime( SPEED * 2 );
		expect( lastItem() ).toBe( '0' );
		expect( button.hidden ).toBe( true );
	} );
} );
