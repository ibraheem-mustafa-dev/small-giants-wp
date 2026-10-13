/**
 * Behavioural tests for the sgs/brand-strip marquee runtime (src/blocks/brand-strip/view.js).
 *
 * view.js runs on import against `document`, so each test builds its DOM, stubs the layout
 * numbers jsdom does not compute, then loads the module in isolation.
 *
 *   - Keyboard focus pauses the marquee (WCAG 2.2.2), also with "Pause on hover" off.
 *   - The shared pause / play button shows once the marquee runs and holds a pause.
 *   - Hover and focus are independent: one leaving never resumes what the other holds.
 *   - Clones are inert, so focus never lands in aria-hidden content.
 *   - prefers-reduced-motion leaves the strip static and the button hidden.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path to run the same tests against another copy.
 */

const path = require( 'path' );

jest.mock( '../../src/shared/separators', () => ( { initSeparators: () => {} } ) );

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/brand-strip/view.js' );

const PAUSED = 'sgs-brand-strip__track--paused';

function buildStrip( { noPause = false } = {} ) {
	document.body.innerHTML = `
		<div class="sgs-brand-strip sgs-brand-strip--scrolling${ noPause ? ' sgs-brand-strip--no-pause' : '' }">
			<div class="sgs-brand-strip__track">
				<div class="sgs-brand-strip__set">
					<a class="sgs-brand-strip__item" href="/one">One</a>
					<a class="sgs-brand-strip__item" href="/two">Two</a>
				</div>
			</div>
			<button type="button" class="sgs-motion-pause sgs-brand-strip__pause" aria-pressed="false" aria-label="Pause scrolling" data-sgs-motion-pause hidden></button>
		</div>
		<a class="outside" href="/out">Out</a>`;
	const strip = document.querySelector( '.sgs-brand-strip' );
	return {
		strip,
		track: strip.querySelector( '.sgs-brand-strip__track' ),
		button: strip.querySelector( '[data-sgs-motion-pause]' ),
	};
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
const pointerEvent = ( type, pointerType = 'mouse' ) => {
	const event = new MouseEvent( type );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	return event;
};

beforeEach( () => {
	Object.defineProperty( HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 300 } );
	Element.prototype.getBoundingClientRect = function () {
		const isSet = this.classList && this.classList.contains( 'sgs-brand-strip__set' );
		return { width: isSet ? 200 : 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
	};
	stubMatchMedia( [] );
} );

describe( 'brand-strip marquee: keyboard pause (WCAG 2.2.2)', () => {
	it( 'pauses while focus is inside the strip and resumes when it leaves', () => {
		const { strip, track } = buildStrip();
		loadView();
		const link = strip.querySelector( 'a' );
		link.dispatchEvent( focusEvent( 'focusin' ) );
		expect( track.classList.contains( PAUSED ) ).toBe( true );
		link.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		expect( track.classList.contains( PAUSED ) ).toBe( false );
	} );

	it( 'pauses on focus even with "Pause on hover" off, and hover then does nothing', () => {
		const { strip, track } = buildStrip( { noPause: true } );
		loadView();
		strip.dispatchEvent( pointerEvent( 'pointerenter' ) );
		expect( track.classList.contains( PAUSED ) ).toBe( false );
		strip.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		expect( track.classList.contains( PAUSED ) ).toBe( true );
	} );

	it( 'a pointer leaving does not resume a focused strip', () => {
		const { strip, track } = buildStrip();
		loadView();
		strip.dispatchEvent( pointerEvent( 'pointerenter' ) );
		strip.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		strip.dispatchEvent( pointerEvent( 'pointerleave' ) );
		expect( track.classList.contains( PAUSED ) ).toBe( true );
	} );
} );

describe( 'brand-strip marquee: pause / play button', () => {
	it( 'is shown once the marquee runs', () => {
		const { button, track } = buildStrip();
		loadView();
		expect( track.classList.contains( 'sgs-brand-strip__track--ready' ) ).toBe( true );
		expect( button.hidden ).toBe( false );
	} );

	it( 'holds the pause after the pointer and focus leave, until pressed again', () => {
		const { strip, track, button } = buildStrip();
		loadView();
		strip.dispatchEvent( pointerEvent( 'pointerenter' ) );
		button.dispatchEvent( focusEvent( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		strip.dispatchEvent( pointerEvent( 'pointerleave' ) );
		button.dispatchEvent( focusEvent( 'focusout', document.querySelector( '.outside' ) ) );
		expect( track.classList.contains( PAUSED ) ).toBe( true );
		button.click();
		expect( track.classList.contains( PAUSED ) ).toBe( false );
	} );
} );

describe( 'brand-strip marquee: clones and reduced motion', () => {
	it( 'makes every clone aria-hidden and inert, with no tabbable logo', () => {
		const { track } = buildStrip();
		loadView();
		const copies = track.querySelectorAll( '.sgs-brand-strip__set[aria-hidden="true"]' );
		expect( copies.length ).toBeGreaterThan( 0 );
		copies.forEach( ( copy ) => {
			expect( copy.hasAttribute( 'inert' ) ).toBe( true );
			copy.querySelectorAll( 'a' ).forEach( ( a ) => expect( a.getAttribute( 'tabindex' ) ).toBe( '-1' ) );
		} );
	} );

	it( 'leaves the strip static and the button hidden under reduced motion', () => {
		stubMatchMedia( [ '(prefers-reduced-motion: reduce)' ] );
		const { track, button } = buildStrip();
		loadView();
		expect( track.classList.contains( 'sgs-brand-strip__track--ready' ) ).toBe( false );
		expect( button.hidden ).toBe( true );
	} );
} );
