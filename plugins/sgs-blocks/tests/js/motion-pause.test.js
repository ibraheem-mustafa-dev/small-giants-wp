/**
 * Behavioural tests for the shared motion pause runtime (src/shared/motion-pause/index.js).
 *
 *   - Keyboard focus inside the region pauses; focus moving within it does not resume.
 *   - Hover, touch and focus are independent: ending one never resumes motion another holds.
 *   - The button is a persistent toggle (aria-pressed), held across hover-out and focus-out.
 *   - Play overrides the hover and focus pauses until both have ended.
 *   - setRunning() shows and hides the button.
 *
 * Set SGS_TEST_MOTION_PAUSE to an absolute path to run the same tests against a mutated copy.
 */

const path = require( 'path' );

const MODULE = process.env.SGS_TEST_MOTION_PAUSE || path.resolve( __dirname, '../../src/shared/motion-pause/index.js' );
const { initMotionPause } = require( MODULE );

/**
 * A pointer event jsdom can dispatch (it has no PointerEvent constructor).
 *
 * @param {string} type        Event type.
 * @param {string} pointerType 'mouse' | 'touch' | 'pen'.
 * @param {Object} init        Extra event init.
 * @return {Event} The event.
 */
function pointer( type, pointerType = 'mouse', init = {} ) {
	const event = new MouseEvent( type, { bubbles: type !== 'pointerenter' && type !== 'pointerleave', ...init } );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	return event;
}

const focus = ( type, relatedTarget = null ) => new FocusEvent( type, { bubbles: true, relatedTarget } );

function build() {
	document.body.innerHTML = `
		<div class="region">
			<a href="/a">A</a><a href="/b">B</a>
			<button type="button" data-sgs-motion-pause aria-pressed="false" aria-label="Pause scrolling" hidden></button>
		</div>
		<a class="outside" href="/c">C</a>`;
	const root = document.querySelector( '.region' );
	const states = [];
	const control = initMotionPause( root, { onChange: ( paused ) => states.push( paused ) } );
	return { root, control, states, button: root.querySelector( '[data-sgs-motion-pause]' ) };
}

describe( 'motion pause: keyboard focus (WCAG 2.2.2)', () => {
	it( 'pauses while focus is inside and resumes when it leaves the region', () => {
		const { root, control } = build();
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusin' ) );
		expect( control.isPaused() ).toBe( true );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusout', document.querySelector( '.outside' ) ) );
		expect( control.isPaused() ).toBe( false );
	} );

	it( 'stays paused while focus moves between elements inside the region', () => {
		const { root, control } = build();
		const [ a, b ] = root.querySelectorAll( 'a' );
		a.dispatchEvent( focus( 'focusin' ) );
		a.dispatchEvent( focus( 'focusout', b ) );
		expect( control.isPaused() ).toBe( true );
	} );
} );

describe( 'motion pause: inputs do not cancel each other', () => {
	it( 'a pointer leaving does not resume a focused region', () => {
		const { root, control } = build();
		root.dispatchEvent( pointer( 'pointerenter' ) );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusin' ) );
		root.dispatchEvent( pointer( 'pointerleave' ) );
		expect( control.isPaused() ).toBe( true );
	} );

	it( 'focus leaving does not resume a hovered region', () => {
		const { root, control } = build();
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusin' ) );
		root.dispatchEvent( pointer( 'pointerenter' ) );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusout' ) );
		expect( control.isPaused() ).toBe( true );
	} );

	it( 'touch press pauses until the finger lifts', () => {
		const { root, control } = build();
		root.dispatchEvent( pointer( 'pointerdown', 'touch' ) );
		expect( control.isPaused() ).toBe( true );
		root.dispatchEvent( pointer( 'pointerup', 'touch' ) );
		expect( control.isPaused() ).toBe( false );
	} );

	it( 'touch toggle mode: a tap pauses and the next tap resumes', () => {
		document.body.innerHTML = '<div class="region"></div>';
		const root = document.querySelector( '.region' );
		const control = initMotionPause( root, { touch: 'toggle' } );
		root.dispatchEvent( pointer( 'pointerdown', 'touch' ) );
		root.dispatchEvent( pointer( 'pointerup', 'touch' ) );
		expect( control.isPaused() ).toBe( true );
		root.dispatchEvent( pointer( 'pointerdown', 'touch' ) );
		expect( control.isPaused() ).toBe( false );
	} );

	it( 'hover off still pauses on focus', () => {
		document.body.innerHTML = '<div class="region"><a href="/a">A</a></div>';
		const root = document.querySelector( '.region' );
		const control = initMotionPause( root, { hover: false } );
		root.dispatchEvent( pointer( 'pointerenter' ) );
		expect( control.isPaused() ).toBe( false );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusin' ) );
		expect( control.isPaused() ).toBe( true );
	} );
} );

describe( 'motion pause: the button', () => {
	it( 'toggles aria-pressed and holds the pause after hover and focus leave', () => {
		const { root, control, button } = build();
		root.dispatchEvent( pointer( 'pointerenter' ) );
		button.dispatchEvent( focus( 'focusin' ) );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		root.dispatchEvent( pointer( 'pointerleave' ) );
		button.dispatchEvent( focus( 'focusout', document.querySelector( '.outside' ) ) );
		expect( control.isPaused() ).toBe( true );
	} );

	it( 'play overrides the hover and focus pause until both end, then they apply again', () => {
		const { root, control, button } = build();
		root.dispatchEvent( pointer( 'pointerenter' ) );
		button.dispatchEvent( focus( 'focusin' ) );
		button.click();
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
		expect( control.isPaused() ).toBe( false );

		root.dispatchEvent( pointer( 'pointerleave' ) );
		button.dispatchEvent( focus( 'focusout', document.querySelector( '.outside' ) ) );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusin' ) );
		expect( control.isPaused() ).toBe( true );
	} );

	it( 'a touch tap on the button does not also count as a touch pause', () => {
		document.body.innerHTML = '<div class="region"><button type="button" data-sgs-motion-pause aria-pressed="false"></button></div>';
		const root = document.querySelector( '.region' );
		const button = root.querySelector( 'button' );
		const control = initMotionPause( root, { touch: 'toggle' } );
		button.dispatchEvent( pointer( 'pointerdown', 'touch' ) );
		button.click();
		button.dispatchEvent( pointer( 'pointerdown', 'touch' ) );
		button.click();
		expect( control.isPaused() ).toBe( false );
	} );

	it( 'pause() and play() from another control set the held state and aria-pressed', () => {
		const { control, button } = build();
		control.pause();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		expect( control.isPaused() ).toBe( true );
		control.play();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
		expect( control.isPaused() ).toBe( false );
	} );

	it( 'setRunning shows the button only while the motion runs', () => {
		const { control, button } = build();
		expect( button.hidden ).toBe( true );
		control.setRunning( true );
		expect( button.hidden ).toBe( false );
		control.setRunning( false );
		expect( button.hidden ).toBe( true );
	} );

	it( 'reports each change once', () => {
		const { root, states } = build();
		root.dispatchEvent( pointer( 'pointerenter' ) );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusin' ) );
		root.dispatchEvent( pointer( 'pointerleave' ) );
		root.querySelector( 'a' ).dispatchEvent( focus( 'focusout' ) );
		expect( states ).toEqual( [ true, false ] );
	} );
} );

describe( 'motion pause: reset and focus regions', () => {
	it( 'removeFocusRegion stops a removed region counting as focus inside', () => {
		const { control } = build();
		const extra = document.createElement( 'button' );
		document.body.appendChild( extra );
		control.addFocusRegion( extra );
		extra.dispatchEvent( focus( 'focusin' ) );
		expect( control.isPaused() ).toBe( true );
		extra.dispatchEvent( focus( 'focusout' ) );
		control.removeFocusRegion( extra );
		extra.dispatchEvent( focus( 'focusin' ) );
		expect( control.isPaused() ).toBe( false );
	} );

	it( 'reset clears a held pause and a held play, keeps a focus that is really inside, and drops added regions', () => {
		const { root, control, button } = build();
		const extra = document.createElement( 'button' );
		document.body.appendChild( extra );
		control.addFocusRegion( extra );
		control.pause();
		control.reset();
		expect( control.isPaused() ).toBe( false );
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
		extra.dispatchEvent( focus( 'focusin' ) );
		expect( control.isPaused() ).toBe( false );
		root.querySelector( 'a' ).focus();
		control.reset();
		expect( control.isPaused() ).toBe( true );
	} );
} );
