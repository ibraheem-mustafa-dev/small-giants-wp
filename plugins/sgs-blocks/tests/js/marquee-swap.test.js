/**
 * The still "swap" mode of the marquee under reduced motion: how many whole items fit a line, the group that is on show,
 * the advance every interval, the all-fit case, and the pauses it takes from the shared loop control. jsdom has no layout,
 * so item widths and the block's width are stubbed.
 */

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const { groupItems, swapSeconds, createSwap, OFF_ATTR } = require( '../../src/shared/effects/marquee-swap' );

describe( 'groupItems', () => {
	test( 'puts as many whole items on a line as fit, counting the gap between them', () => {
		expect( groupItems( [ 100, 100, 100, 100 ], 10, 230 ) ).toEqual( [ [ 0, 1 ], [ 2, 3 ] ] );
		expect( groupItems( [ 100, 100, 100, 100 ], 10, 210 ) ).toEqual( [ [ 0, 1 ], [ 2, 3 ] ] );
		expect( groupItems( [ 100, 100, 100, 100 ], 10, 209 ) ).toEqual( [ [ 0 ], [ 1 ], [ 2 ], [ 3 ] ] );
	} );

	test( 'makes one group when every item fits', () => {
		expect( groupItems( [ 100, 100, 100 ], 10, 320 ) ).toEqual( [ [ 0, 1, 2 ] ] );
	} );

	test( 'gives an item wider than the line a group of its own', () => {
		expect( groupItems( [ 50, 500, 50 ], 0, 200 ) ).toEqual( [ [ 0 ], [ 1 ], [ 2 ] ] );
	} );

	test( 'handles no items', () => {
		expect( groupItems( [], 0, 200 ) ).toEqual( [] );
	} );
} );

describe( 'swapSeconds', () => {
	test( 'reads the stored interval, defaulting to 4', () => {
		expect( swapSeconds( '6' ) ).toBe( 6 );
		expect( swapSeconds( null ) ).toBe( 4 );
		expect( swapSeconds( '0' ) ).toBe( 4 );
		expect( swapSeconds( '900' ) ).toBe( 4 );
	} );
} );

describe( 'createSwap', () => {
	let swap;
	let restoreWidth;

	function mount( view, count = 4 ) {
		const links = Array.from( { length: count }, ( _, i ) => `<a href="#i${ i }" id="i${ i }">Item ${ i }</a>` ).join( '' );
		document.body.innerHTML = `<div class="wp-block-sgs-trust-bar" data-sgs-fx="marquee"><div data-sgs-marquee-set>${ links }</div></div>`;
		const root = document.body.firstElementChild;
		Object.defineProperty( root, 'clientWidth', { value: view, configurable: true } );
		const set = root.querySelector( '[data-sgs-marquee-set]' );
		return { root, set, items: Array.from( set.children ) };
	}

	const on = ( items ) => items.map( ( el, i ) => ( el.hasAttribute( OFF_ATTR ) ? null : i ) ).filter( ( i ) => null !== i );
	const pointer = ( target, type, pointerType = 'mouse' ) => {
		const event = new Event( type );
		Object.defineProperty( event, 'pointerType', { value: pointerType } );
		target.dispatchEvent( event );
	};
	const start = ( parts, touchPause = 'tap' ) => {
		swap = createSwap( { ...parts, seconds: 4, touchPause, pauseControl: false } );
		swap.refresh();
	};

	beforeEach( () => {
		jest.useFakeTimers();
		const proto = HTMLElement.prototype;
		const original = Object.getOwnPropertyDescriptor( proto, 'offsetWidth' );
		Object.defineProperty( proto, 'offsetWidth', { configurable: true, get: () => 100 } );
		restoreWidth = () => original && Object.defineProperty( proto, 'offsetWidth', original );
	} );

	afterEach( () => {
		swap?.destroy();
		swap = null;
		restoreWidth();
		jest.useRealTimers();
		Object.defineProperty( document, 'visibilityState', { value: 'visible', configurable: true } );
	} );

	test( 'shows the first group that fits and leaves the others readable but off show', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
		items.forEach( ( el ) => {
			expect( el.hasAttribute( 'aria-hidden' ) ).toBe( false );
			expect( el.hidden ).toBe( false );
		} );
		expect( Array.from( set.children ) ).toEqual( items ); // original order, nothing removed
		expect( root.getAttribute( 'aria-live' ) ).toBeNull();
		expect( set.getAttribute( 'aria-live' ) ).toBeNull();
	} );

	test( 'replaces the group every interval, instantly, and starts again after the last', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		jest.advanceTimersByTime( 3999 );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
		jest.advanceTimersByTime( 1 );
		expect( on( items ) ).toEqual( [ 2, 3 ] );
		jest.advanceTimersByTime( 4000 );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
	} );

	test( 'does not swap when every item fits', () => {
		const { root, set, items } = mount( 1000 );
		start( { root, set } );
		jest.advanceTimersByTime( 20000 );
		expect( on( items ) ).toEqual( [ 0, 1, 2, 3 ] );
		expect( jest.getTimerCount() ).toBe( 0 );
	} );

	test( 'regroups on a resize', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		Object.defineProperty( root, 'clientWidth', { value: 1000, configurable: true } );
		swap.refresh();
		expect( on( items ) ).toEqual( [ 0, 1, 2, 3 ] );
		Object.defineProperty( root, 'clientWidth', { value: 150, configurable: true } );
		swap.refresh();
		expect( on( items ) ).toEqual( [ 0 ] );
	} );

	test( 'holds the group while the pointer is over the block', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		pointer( root, 'pointerenter' );
		jest.advanceTimersByTime( 12000 );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
		pointer( root, 'pointerleave' );
		jest.advanceTimersByTime( 4000 );
		expect( on( items ) ).toEqual( [ 2, 3 ] );
	} );

	test( 'holds the group while a finger is held down, in the hold touch mode', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set }, 'hold' );
		pointer( root, 'pointerdown', 'touch' );
		jest.advanceTimersByTime( 8000 );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
		pointer( root, 'pointerup', 'touch' );
		jest.advanceTimersByTime( 4000 );
		expect( on( items ) ).toEqual( [ 2, 3 ] );
	} );

	test( 'holds the group while keyboard focus is inside the block', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		items[ 0 ].focus();
		jest.advanceTimersByTime( 8000 );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
	} );

	test( 'holds the group while the tab is hidden', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		Object.defineProperty( document, 'visibilityState', { value: 'hidden', configurable: true } );
		jest.advanceTimersByTime( 12000 );
		expect( on( items ) ).toEqual( [ 0, 1 ] );
		Object.defineProperty( document, 'visibilityState', { value: 'visible', configurable: true } );
		jest.advanceTimersByTime( 4000 );
		expect( on( items ) ).toEqual( [ 2, 3 ] );
	} );

	test( 'brings the group of a control that takes focus on show', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		items[ 3 ].dispatchEvent( new FocusEvent( 'focusin', { bubbles: true } ) );
		expect( on( items ) ).toEqual( [ 2, 3 ] );
	} );

	test( 'destroy puts every item back on show and stops the timer', () => {
		const { root, set, items } = mount( 250 );
		start( { root, set } );
		swap.destroy();
		swap = null;
		expect( on( items ) ).toEqual( [ 0, 1, 2, 3 ] );
		expect( jest.getTimerCount() ).toBe( 0 );
	} );
} );
