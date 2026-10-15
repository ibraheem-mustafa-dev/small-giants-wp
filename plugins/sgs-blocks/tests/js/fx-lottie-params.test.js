/**
 * Lottie effect layer (Spec 38A FR-38A-52): `@sgs/fx-lottie` reads the trigger, loop, speed and pause control from the
 * layer's data attributes (and the legacy `sgs_render_lottie()` span's), plays and pauses the player, and puts a loop
 * under the shared loop control. The player adapter is mocked; `@sgs/loop-control` (a webpack external) is mapped
 * virtually onto the real source, so the off-screen pause, the focus pause and the pause button are the real ones.
 */

const mockPlayers = [];
const mockInits = [];

jest.mock( '../../src/shared/effects/lottie-adapter.js', () => ( {
	init: jest.fn( async ( options ) => {
		mockInits.push( options );
		const player = {
			options,
			play: jest.fn(),
			pause: jest.fn(),
			seek: jest.fn(),
			destroy: jest.fn(),
		};
		mockPlayers.push( player );
		return player;
	} ),
} ) );

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

let observers;
let queries;
let reduced;
let widths;

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

	disconnect() {
		this.watched.clear();
	}
}

/**
 * Report an element in or out of view to every observer watching it.
 * @param el
 * @param isIntersecting
 */
function report( el, isIntersecting ) {
	observers.forEach( ( observer ) => {
		if ( observer.watched.has( el ) ) {
			observer.callback( [ { target: el, isIntersecting } ] );
		}
	} );
}

function query( text ) {
	if ( ! queries[ text ] ) {
		const q = {
			listeners: [],
			get matches() {
				if ( text.includes( 'reduced-motion' ) ) {
					return reduced;
				}
				return widths.includes( text );
			},
			addEventListener: ( type, listener ) =>
				q.listeners.push( listener ),
			removeEventListener: ( type, listener ) => {
				q.listeners = q.listeners.filter(
					( item ) => item !== listener
				);
			},
		};
		queries[ text ] = q;
	}
	return queries[ text ];
}

const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

/**
 * Mount a block root holding one Lottie element and return both.
 * @param attrs
 * @param root0
 * @param root0.tag
 * @param root0.extra
 */
function mount( attrs = '', { tag = 'span', extra = '' } = {} ) {
	document.body.innerHTML = `<div class="wp-block-sgs-responsive-logo"><${ tag } data-sgs-fx="lottie" data-src="/wp-content/uploads/a.json" ${ attrs }><img alt="" src="p.png"></${ tag }>${ extra }<a href="#x">link</a></div>`;
	const root = document.body.firstElementChild;
	return { root, el: root.querySelector( '[data-sgs-fx]' ) };
}

const layer = ( attrs = '' ) =>
	mount( `data-sgs-fx-lottie-file="5" ${ attrs }` );

function boot() {
	jest.resetModules();
	require( '../../src/shared/effects/fx-lottie' );
}

const lastPlayer = () => mockPlayers[ mockPlayers.length - 1 ];
const pauseButton = ( root ) => root.querySelector( 'button.sgs-motion-pause' );

beforeEach( () => {
	mockPlayers.length = 0;
	mockInits.length = 0;
	observers = [];
	queries = {};
	reduced = false;
	widths = [];
	window.IntersectionObserver = FakeObserver;
	window.matchMedia = jest.fn( query );
	window.requestIdleCallback = ( callback ) => callback();
	window.requestAnimationFrame = ( callback ) => {
		callback( 0 );
		return 1;
	};
	global.fetch = jest.fn( async () => ( {
		ok: true,
		json: async () => ( { v: '5.5.2' } ),
	} ) );
	document.body.innerHTML = '';
} );

describe( 'trigger', () => {
	test( 'load plays once the file is mounted', async () => {
		layer( 'data-sgs-fx-trigger="load"' );
		boot();
		await settle();
		expect( global.fetch ).toHaveBeenCalledWith(
			'/wp-content/uploads/a.json',
			expect.objectContaining( { credentials: 'same-origin' } )
		);
		expect( mockInits ).toHaveLength( 1 );
		expect( lastPlayer().play ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'no trigger attribute means visible: it waits for the element to be in view, then pauses when it leaves', async () => {
		const { el } = layer();
		boot();
		await settle();
		expect( mockInits ).toHaveLength( 0 );
		report( el, true );
		await settle();
		expect( lastPlayer().play ).toHaveBeenCalledTimes( 1 );
		report( el, false );
		expect( lastPlayer().pause ).toHaveBeenCalled();
	} );

	test( 'hover mounts nothing until the pointer enters, plays, and pauses on leave', async () => {
		const { el } = layer( 'data-sgs-fx-trigger="hover"' );
		boot();
		await settle();
		expect( mockInits ).toHaveLength( 0 );
		el.dispatchEvent( new Event( 'pointerenter' ) );
		await settle();
		expect( lastPlayer().play ).toHaveBeenCalledTimes( 1 );
		el.dispatchEvent( new Event( 'pointerleave' ) );
		expect( lastPlayer().pause ).toHaveBeenCalled();
	} );

	test( 'hover: leaving before the file arrives does not start the animation', async () => {
		const { el } = layer( 'data-sgs-fx-trigger="hover"' );
		boot();
		el.dispatchEvent( new Event( 'pointerenter' ) );
		el.dispatchEvent( new Event( 'pointerleave' ) );
		await settle();
		expect( lastPlayer().play ).not.toHaveBeenCalled();
	} );

	test( 'scroll mounts on entering view and scrubs the player with seek, never play', async () => {
		const { el } = layer( 'data-sgs-fx-trigger="scroll"' );
		el.getBoundingClientRect = () => ( { top: 300, height: 100 } );
		window.innerHeight = 700;
		boot();
		report( el, true );
		await settle();
		expect( mockInits ).toHaveLength( 1 );
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( lastPlayer().seek ).toHaveBeenCalledWith( 0.5 );
		expect( lastPlayer().play ).not.toHaveBeenCalled();
	} );

	test( 'scroll shows the frame for the current position as soon as the player mounts, before any scroll event', async () => {
		const { el } = layer( 'data-sgs-fx-trigger="scroll"' );
		el.getBoundingClientRect = () => ( { top: 300, height: 100 } );
		window.innerHeight = 700;
		boot();
		report( el, true );
		await settle();
		expect( lastPlayer().seek ).toHaveBeenCalledWith( 0.5 );
	} );

	test( 'NEGATIVE CONTROL: a visible-trigger layer is played, never seeked, when it mounts', async () => {
		const { el } = layer( 'data-sgs-fx-trigger="visible"' );
		boot();
		report( el, true );
		await settle();
		expect( lastPlayer().seek ).not.toHaveBeenCalled();
	} );
} );

describe( 'values', () => {
	test( 'loop and speed reach the player', async () => {
		layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-loop="true" data-sgs-fx-lottie-speed="2"'
		);
		boot();
		await settle();
		expect( mockInits[ 0 ] ).toEqual(
			expect.objectContaining( { loop: true, speed: 2 } )
		);
	} );

	test( 'without loop or speed attributes the player gets loop false and speed 1', async () => {
		layer( 'data-sgs-fx-trigger="load"' );
		boot();
		await settle();
		expect( mockInits[ 0 ] ).toEqual(
			expect.objectContaining( { loop: false, speed: 1 } )
		);
	} );

	test( 'the computed --sgs-lottie-speed beats the attribute, so a tier value applies', async () => {
		const { el } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-speed="2"'
		);
		const real = window.getComputedStyle;
		window.getComputedStyle = ( node ) =>
			node === el
				? { getPropertyValue: ( n ) => ( n === '--sgs-lottie-speed' ? '0.5' : '' ) }
				: real( node );
		boot();
		await settle();
		window.getComputedStyle = real;
		expect( mockInits[ 0 ].speed ).toBe( 0.5 );
	} );

	test( 'NEGATIVE CONTROL: the retired per-device speed attributes are not read', async () => {
		widths = [ '(max-width: 1023px)', '(max-width: 767px)' ];
		layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-speed="2" data-sgs-fx-lottie-speed-tablet="1.5" data-sgs-fx-lottie-speed-mobile="0.5"'
		);
		boot();
		await settle();
		expect( mockInits[ 0 ].speed ).toBe( 2 );
	} );

	test( 'the layer element is given the overlay class; a legacy span is not', async () => {
		const { el } = layer( 'data-sgs-fx-trigger="load"' );
		boot();
		await settle();
		expect( el.classList.contains( 'sgs-lottie-layer' ) ).toBe( true );
	} );
} );

describe( 'pause control', () => {
	test( 'a loop with pauseControl true gets the pause button, and it pauses then resumes the player', async () => {
		const { root } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-loop="true" data-sgs-fx-lottie-pause-control="true"'
		);
		boot();
		await settle();
		const button = pauseButton( root );
		expect( button ).not.toBeNull();
		button.click();
		expect( lastPlayer().pause ).toHaveBeenCalled();
		lastPlayer().play.mockClear();
		button.click();
		expect( lastPlayer().play ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'a loop without pauseControl has no button', async () => {
		const { root } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-loop="true"'
		);
		boot();
		await settle();
		expect( pauseButton( root ) ).toBeNull();
	} );

	test( 'pauseControl without a loop still gets the button (a long one-shot file)', async () => {
		const { root } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-pause-control="true"'
		);
		boot();
		await settle();
		expect( pauseButton( root ) ).not.toBeNull();
	} );

	test( 'a looping animation pauses off screen and resumes in view', async () => {
		const { el } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-loop="true"'
		);
		boot();
		await settle();
		report( el, false );
		expect( lastPlayer().pause ).toHaveBeenCalled();
		lastPlayer().play.mockClear();
		report( el, true );
		expect( lastPlayer().play ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'keyboard focus inside the block pauses a loop with no button, and leaving resumes it', async () => {
		const { root } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-loop="true"'
		);
		boot();
		await settle();
		root.querySelector( 'a' ).dispatchEvent(
			new FocusEvent( 'focusin', { bubbles: true } )
		);
		expect( lastPlayer().pause ).toHaveBeenCalled();
		lastPlayer().play.mockClear();
		root.querySelector( 'a' ).dispatchEvent(
			new FocusEvent( 'focusout', { bubbles: true, relatedTarget: null } )
		);
		expect( lastPlayer().play ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'a visitor pause is not overridden when the element returns to view', async () => {
		const { el, root } = layer(
			'data-sgs-fx-trigger="visible" data-sgs-fx-lottie-loop="true" data-sgs-fx-lottie-pause-control="true"'
		);
		boot();
		report( el, true );
		await settle();
		pauseButton( root ).click();
		lastPlayer().play.mockClear();
		report( el, false );
		report( el, true );
		await settle();
		expect( lastPlayer().play ).not.toHaveBeenCalled();
	} );
} );

describe( 'reduced motion', () => {
	test( 'loads no player and plays nothing, leaving the poster in place', async () => {
		reduced = true;
		const { el } = layer(
			'data-sgs-fx-trigger="load" data-sgs-fx-lottie-loop="true"'
		);
		boot();
		await settle();
		expect( global.fetch ).not.toHaveBeenCalled();
		expect( mockInits ).toHaveLength( 0 );
		expect( el.querySelector( 'img' ) ).not.toBeNull();
	} );

	test( 'a live change to reduce destroys the running player', async () => {
		layer( 'data-sgs-fx-trigger="load"' );
		boot();
		await settle();
		const player = lastPlayer();
		reduced = true;
		query( '(prefers-reduced-motion: reduce)' ).listeners.forEach(
			( listener ) => listener( { matches: true } )
		);
		expect( player.destroy ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'which elements are driven', () => {
	test( 'NEGATIVE CONTROL: an element without the lottie token is ignored', async () => {
		document.body.innerHTML =
			'<div class="wp-block-sgs-container"><span data-sgs-fx="draw" data-sgs-fx-trigger="load" data-sgs-fx-lottie-file="5" data-src="/a.json"></span><span class="sgs-lottie" data-trigger="load" data-src="/b.json"></span></div>';
		boot();
		await settle();
		expect( global.fetch ).not.toHaveBeenCalled();
		expect( mockInits ).toHaveLength( 0 );
	} );

	test( 'the token list is matched as a word: lottie beside other effects still binds', async () => {
		layer( 'data-sgs-fx-trigger="load"' );
		document
			.querySelector( '[data-sgs-fx]' )
			.setAttribute( 'data-sgs-fx', 'ambient-float lottie' );
		boot();
		await settle();
		expect( mockInits ).toHaveLength( 1 );
	} );

	test( 'a layer with no resolved data-src stays as rendered', async () => {
		mount( 'data-sgs-fx-lottie-file="5" data-sgs-fx-trigger="load"' );
		document.querySelector( '[data-sgs-fx]' ).removeAttribute( 'data-src' );
		boot();
		await settle();
		expect( global.fetch ).not.toHaveBeenCalled();
	} );

	test( 'a sgs_render_lottie() span is read from its own attributes and its server button is wired to the loop control', async () => {
		const { el, root } = mount(
			'class="sgs-lottie" data-trigger="load" data-loop="1" data-speed="1.5"',
			{
				extra: '<button type="button" class="sgs-lottie__pause" aria-pressed="false"></button>',
			}
		);
		boot();
		await settle();
		expect( mockInits[ 0 ] ).toEqual(
			expect.objectContaining( { loop: true, speed: 1.5 } )
		);
		expect( el.classList.contains( 'sgs-lottie-layer' ) ).toBe( false );
		const button = root.querySelector( '.sgs-lottie__pause' );
		button.click();
		expect( lastPlayer().pause ).toHaveBeenCalled();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'true' );
		button.click();
		expect( button.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
	} );
} );
