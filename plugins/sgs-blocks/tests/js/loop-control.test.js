/**
 * Loop control (Spec 38A FR-38A-37): off-screen, focus and visitor pauses, the one button per block root, cleanup, and
 * a negative control (no button without `pauseControl`).
 */

const PAUSED = 'data-sgs-loop-paused';

let observers;
let reduced;
let reducedListeners;
let loopControl;

class FakeObserver {
	constructor( callback ) {
		this.callback = callback;
		this.watched = new Set();
		observers.push( this );
	}

	observe( el ) {
		this.watched.add( el );
	}

	unobserve( el ) {
		this.watched.delete( el );
	}

	report( el, isIntersecting ) {
		this.callback( [ { target: el, isIntersecting } ] );
	}
}

function build( rootCount = 1 ) {
	document.body.innerHTML = '';
	const roots = [];
	for ( let i = 0; i < rootCount; i++ ) {
		const root = document.createElement( 'div' );
		root.className = 'wp-block-sgs-container';
		root.innerHTML =
			'<div class="sgs-container__inner"><span data-sgs-fx="ambient-float" class="sgs-container__badge"></span></div><a href="#x">link</a>';
		document.body.appendChild( root );
		roots.push( root );
	}
	return roots;
}

const floatIn = ( root ) => root.querySelector( '[data-sgs-fx]' );
const buttonsIn = ( root ) =>
	root.querySelectorAll( 'button.sgs-motion-pause' );

function focusIn( root ) {
	root.querySelector( 'a' ).dispatchEvent(
		new FocusEvent( 'focusin', { bubbles: true } )
	);
}

function focusOut( root ) {
	root.querySelector( 'a' ).dispatchEvent(
		new FocusEvent( 'focusout', { bubbles: true, relatedTarget: null } )
	);
}

beforeEach( () => {
	observers = [];
	reduced = false;
	reducedListeners = [];
	window.IntersectionObserver = FakeObserver;
	window.matchMedia = jest.fn( () => ( {
		get matches() {
			return reduced;
		},
		addEventListener: ( type, listener ) =>
			reducedListeners.push( listener ),
		removeEventListener: () => {},
	} ) );
	jest.resetModules();
	loopControl = require( '../../src/shared/effects/loop-control' );
} );

describe( 'registerLoop pauses', () => {
	test( 'off screen, and resumes when it returns', () => {
		const [ root ] = build();
		const el = floatIn( root );
		loopControl.registerLoop( el );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
		observers[ 0 ].report( el, false );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		observers[ 0 ].report( el, true );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'while keyboard focus is inside the block root, without any button', () => {
		const [ root ] = build();
		const el = floatIn( root );
		loopControl.registerLoop( el );
		focusIn( root );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		focusOut( root );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'one shared observer serves every loop', () => {
		const [ a, b ] = build( 2 );
		loopControl.registerLoop( floatIn( a ) );
		loopControl.registerLoop( floatIn( b ) );
		expect( observers ).toHaveLength( 1 );
		expect( observers[ 0 ].watched.size ).toBe( 2 );
	} );

	test( 'never writes a style property', () => {
		const [ root ] = build();
		const el = floatIn( root );
		loopControl.registerLoop( el, { pauseControl: true } );
		observers[ 0 ].report( el, false );
		expect( el.getAttribute( 'style' ) ).toBeNull();
	} );
} );

describe( 'the pause button', () => {
	test( 'is created once per block root, inside the root and outside the loop', () => {
		const [ root ] = build();
		const el = floatIn( root );
		const second = document.createElement( 'span' );
		second.setAttribute( 'data-sgs-fx', 'ambient-float' );
		root.appendChild( second );
		loopControl.registerLoop( el, { pauseControl: true } );
		loopControl.registerLoop( second, { pauseControl: true } );
		expect( buttonsIn( root ) ).toHaveLength( 1 );
		const button = buttonsIn( root )[ 0 ];
		expect( button.parentElement ).toBe( root );
		expect( el.contains( button ) ).toBe( false );
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
		expect( button.hidden ).toBe( false );
	} );

	test( 'on an element that is its own block root, focus on the button (placed after it) pauses the loop', () => {
		document.body.innerHTML =
			'<div class="sgs-wrap"><h2 class="wp-block-sgs-heading" data-sgs-fx="ambient-float">Float</h2><a href="#y">next</a></div>';
		const el = document.querySelector( 'h2' );
		loopControl.registerLoop( el, { pauseControl: true } );
		const button = el.nextElementSibling;
		expect( button.matches( 'button.sgs-motion-pause' ) ).toBe( true );
		button.dispatchEvent( new FocusEvent( 'focusin', { bubbles: true } ) );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		button.dispatchEvent(
			new FocusEvent( 'focusout', { bubbles: true, relatedTarget: el } )
		);
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		el.dispatchEvent(
			new FocusEvent( 'focusout', { bubbles: true, relatedTarget: document.querySelector( 'a' ) } )
		);
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'a separate root gets its own button', () => {
		const [ a, b ] = build( 2 );
		loopControl.registerLoop( floatIn( a ), { pauseControl: true } );
		loopControl.registerLoop( floatIn( b ), { pauseControl: true } );
		expect( buttonsIn( a ) ).toHaveLength( 1 );
		expect( buttonsIn( b ) ).toHaveLength( 1 );
	} );

	test( 'NEGATIVE CONTROL: no button without pauseControl', () => {
		const [ root ] = build();
		loopControl.registerLoop( floatIn( root ) );
		loopControl.registerLoop( floatIn( root ), { pauseControl: false } );
		expect( document.querySelectorAll( 'button' ) ).toHaveLength( 0 );
	} );

	test( 'toggles aria-pressed and pauses and resumes the loop', () => {
		const [ root ] = build();
		const el = floatIn( root );
		loopControl.registerLoop( el, { pauseControl: true } );
		const button = buttonsIn( root )[ 0 ];
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'a visitor pause persists over focus and visibility changes', () => {
		const [ root ] = build();
		const el = floatIn( root );
		loopControl.registerLoop( el, { pauseControl: true } );
		buttonsIn( root )[ 0 ].click();
		focusIn( root );
		focusOut( root );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		observers[ 0 ].report( el, false );
		observers[ 0 ].report( el, true );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
	} );

	test( 'stays hidden under reduced motion and shows when the preference clears', () => {
		reduced = true;
		const [ root ] = build();
		loopControl.registerLoop( floatIn( root ), { pauseControl: true } );
		const button = buttonsIn( root )[ 0 ];
		expect( button.hidden ).toBe( true );
		reduced = false;
		reducedListeners.forEach( ( listener ) => listener() );
		expect( button.hidden ).toBe( false );
	} );

	test( 'a loop that is itself the block root gets the button beside it', () => {
		document.body.innerHTML =
			'<div class="wp-block-sgs-hero" data-sgs-fx="ambient-float"></div>';
		const el = document.querySelector( '[data-sgs-fx]' );
		loopControl.registerLoop( el, { pauseControl: true } );
		const button = document.querySelector( 'button.sgs-motion-pause' );
		expect( el.contains( button ) ).toBe( false );
		expect( el.nextElementSibling ).toBe( button );
	} );
} );

describe( 'destroy', () => {
	test( 'clears the pause, stops observing and removes the last button', () => {
		const [ root ] = build();
		const el = floatIn( root );
		const loop = loopControl.registerLoop( el, { pauseControl: true } );
		observers[ 0 ].report( el, false );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		loop.destroy();
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
		expect( observers[ 0 ].watched.has( el ) ).toBe( false );
		expect( buttonsIn( root ) ).toHaveLength( 0 );
		loop.destroy();
	} );

	test( 'keeps the button while another loop in the root remains', () => {
		const [ root ] = build();
		const other = document.createElement( 'span' );
		other.setAttribute( 'data-sgs-fx', 'ambient-float' );
		root.appendChild( other );
		const first = loopControl.registerLoop( floatIn( root ), {
			pauseControl: true,
		} );
		loopControl.registerLoop( other, { pauseControl: true } );
		first.destroy();
		expect( buttonsIn( root ) ).toHaveLength( 1 );
	} );
} );

describe( 'reduced-motion helper', () => {
	test( 'reads the preference and calls back on a change', () => {
		expect( loopControl.prefersReducedMotion() ).toBe( false );
		const seen = jest.fn();
		const stop = loopControl.onReducedMotionChange( seen );
		reduced = true;
		reducedListeners.forEach( ( listener ) => listener() );
		expect( seen ).toHaveBeenCalledWith( true );
		expect( loopControl.prefersReducedMotion() ).toBe( true );
		stop();
		reducedListeners.forEach( ( listener ) => listener() );
		expect( seen ).toHaveBeenCalledTimes( 1 );
	} );
} );

function pointerOn( target, type, pointerType ) {
	const event = new Event( type );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	target.dispatchEvent( event );
}

describe( 'hover rate', () => {
	test( 'a rate between 0 and 1 is reported on enter and 1 on leave, without pausing', () => {
		const [ root ] = build();
		const el = floatIn( root );
		const onRateChange = jest.fn();
		loopControl.registerLoop( el, { hoverRate: 0.15, onRateChange } );
		pointerOn( root, 'pointerenter', 'mouse' );
		expect( onRateChange ).toHaveBeenLastCalledWith( 0.15 );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
		pointerOn( root, 'pointerleave', 'mouse' );
		expect( onRateChange ).toHaveBeenLastCalledWith( 1 );
		expect( onRateChange ).toHaveBeenCalledTimes( 2 );
	} );

	test( 'a rate of 0 pauses the loop while hovered', () => {
		const [ root ] = build();
		const el = floatIn( root );
		const onPausedChange = jest.fn();
		loopControl.registerLoop( el, { hoverRate: 0, onPausedChange } );
		pointerOn( root, 'pointerenter', 'pen' );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		expect( onPausedChange ).toHaveBeenLastCalledWith( true );
		pointerOn( root, 'pointerleave', 'pen' );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'a touch pointer is ignored', () => {
		const [ root ] = build();
		const onRateChange = jest.fn();
		loopControl.registerLoop( floatIn( root ), {
			hoverRate: 0.5,
			onRateChange,
		} );
		pointerOn( root, 'pointerenter', 'touch' );
		expect( onRateChange ).not.toHaveBeenCalled();
	} );

	test( 'NEGATIVE CONTROL: callers that pass neither option keep today\'s behaviour', () => {
		const [ root ] = build();
		const el = floatIn( root );
		const onRateChange = jest.fn();
		loopControl.registerLoop( el, { onRateChange } );
		pointerOn( root, 'pointerenter', 'mouse' );
		pointerOn( root, 'pointerdown', 'touch' );
		expect( onRateChange ).not.toHaveBeenCalled();
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'a value of 1 or more, or not a number, leaves hover alone', () => {
		const [ root ] = build();
		const onRateChange = jest.fn();
		loopControl.registerLoop( floatIn( root ), {
			hoverRate: 1,
			onRateChange,
		} );
		loopControl.registerLoop( floatIn( root ), {
			hoverRate: '0.2',
			onRateChange,
		} );
		pointerOn( root, 'pointerenter', 'mouse' );
		expect( onRateChange ).not.toHaveBeenCalled();
	} );

	test( 'destroy removes the hover listeners', () => {
		const [ root ] = build();
		const onRateChange = jest.fn();
		const loop = loopControl.registerLoop( floatIn( root ), {
			hoverRate: 0.15,
			onRateChange,
		} );
		loop.destroy();
		pointerOn( root, 'pointerenter', 'mouse' );
		expect( onRateChange ).not.toHaveBeenCalled();
	} );
} );

describe( 'pause on touch', () => {
	test( 'a tap pauses and the next tap resumes; a mouse press does nothing', () => {
		const [ root ] = build();
		const el = floatIn( root );
		loopControl.registerLoop( el, { pauseOnTouch: true } );
		pointerOn( root, 'pointerdown', 'mouse' );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
		pointerOn( root, 'pointerdown', 'touch' );
		expect( el.hasAttribute( PAUSED ) ).toBe( true );
		pointerOn( root, 'pointerdown', 'touch' );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );

	test( 'destroy removes the touch listener', () => {
		const [ root ] = build();
		const el = floatIn( root );
		const loop = loopControl.registerLoop( el, { pauseOnTouch: true } );
		loop.destroy();
		pointerOn( root, 'pointerdown', 'touch' );
		expect( el.hasAttribute( PAUSED ) ).toBe( false );
	} );
} );

describe( 'animateLoop hover rate', () => {
	function animated( config ) {
		const [ root ] = build();
		const el = floatIn( root );
		const animation = {
			pause: jest.fn(),
			play: jest.fn(),
			cancel: jest.fn(),
			updatePlaybackRate: jest.fn(),
		};
		el.animate = jest.fn( () => animation );
		const loop = loopControl.animateLoop( el, {
			read: () => ( {
				period: 1000,
				phase: 0,
				easing: 'linear',
				direction: 'normal',
			} ),
			keyframes: () => [ {}, {} ],
			...config,
		} );
		return { root, el, animation, loop };
	}

	test( 'sets the playback rate on hover and restores it on leave', () => {
		const { root, animation } = animated( { hoverRate: 0.15 } );
		pointerOn( root, 'pointerenter', 'mouse' );
		expect( animation.updatePlaybackRate ).toHaveBeenLastCalledWith( 0.15 );
		pointerOn( root, 'pointerleave', 'mouse' );
		expect( animation.updatePlaybackRate ).toHaveBeenLastCalledWith( 1 );
	} );

	test( 'a rebuild during a hover keeps the hovered rate', () => {
		const { root, animation, loop } = animated( { hoverRate: 0.15 } );
		pointerOn( root, 'pointerenter', 'mouse' );
		animation.updatePlaybackRate.mockClear();
		loop.rebuild();
		expect( animation.updatePlaybackRate ).toHaveBeenCalledWith( 0.15 );
	} );

	test( 'NEGATIVE CONTROL: without the option the playback rate is never touched', () => {
		const { root, animation } = animated( {} );
		pointerOn( root, 'pointerenter', 'mouse' );
		pointerOn( root, 'pointerleave', 'mouse' );
		expect( animation.updatePlaybackRate ).not.toHaveBeenCalled();
	} );
} );
