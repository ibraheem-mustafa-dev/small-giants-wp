/**
 * The shared carousel runtime (src/shared/carousel/index.js): clone-free item reads, position-based arrow targets, dots kept in
 * step with the scroll position, the end-of-track rules (clamp, wrap, disable), the loop rule (a loop never disables an arrow)
 * and keyboard. jsdom has no layout, so each test gives the track its scroll metrics and the items their offsets.
 */
import {
	createCarousel,
	nearestIndex,
	realItems,
	scrollToItem,
	syncDots,
	targetIndex,
} from '../../src/shared/carousel/index.js';

const OFFSETS = [ 0, 300, 600, 900 ];

/**
 * @param {Object}  [config]
 * @param {boolean} [config.trackIsOffsetParent] The track itself is positioned, so each item's `offsetLeft` is relative to the track.
 * @param {number}  [config.inset] How far the track sits from its positioned wrapper (arrows beside the list): every item's
 *                                `offsetLeft` is then relative to the wrapper, not to the track, as in a real layout.
 */
function build( {
	loop = false,
	dots = true,
	inset = 0,
	trackIsOffsetParent = false,
} = {} ) {
	const clone = loop
		? '<div class="item" data-sgs-loop-clone="true"></div>'
		: '';
	const cards = OFFSETS.map( () => '<div class="item"></div>' ).join( '' );
	const dotRow = dots
		? '<div class="dots">' +
		  OFFSETS.map(
				() => '<button class="dot" type="button"></button>'
		  ).join( '' ) +
		  '</div>'
		: '';
	document.body.innerHTML =
		'<div class="root"><button class="prev" type="button"></button>' +
		'<div class="track"' +
		( loop ? ' data-sgs-loop="1"' : '' ) +
		'>' +
		clone +
		cards +
		'</div><button class="next" type="button"></button>' +
		dotRow +
		'</div>';
	const root = document.querySelector( '.root' );
	const track = root.querySelector( '.track' );
	const items = realItems( track, '.item' );
	items.forEach( ( item, i ) => {
		Object.defineProperty( item, 'offsetLeft', {
			get: () => ( trackIsOffsetParent ? 0 : inset ) + OFFSETS[ i ],
		} );
		item.getBoundingClientRect = () => ( {
			left: inset + OFFSETS[ i ] - track.scrollLeft,
			width: 300,
		} );
	} );
	Object.defineProperty( track, 'scrollWidth', { get: () => 1200 } );
	Object.defineProperty( track, 'clientWidth', { get: () => 600 } );
	Object.defineProperty( track, 'offsetLeft', { get: () => inset } );
	track.getBoundingClientRect = () => ( { left: inset, width: 600 } );
	track.scrollLeft = 0;
	track.scrollTo = jest.fn( ( { left } ) => {
		track.scrollLeft = left;
	} );
	track.scrollBy = jest.fn();
	return { root, track, items };
}

const options = ( parts ) => ( {
	root: parts.root,
	track: parts.track,
	itemSelector: '.item',
	prev: parts.root.querySelector( '.prev' ),
	next: parts.root.querySelector( '.next' ),
	dots: parts.root.querySelectorAll( '.dot' ),
} );

beforeEach( () => {
	window.matchMedia = jest.fn( () => ( { matches: false } ) );
} );

describe( 'primitives', () => {
	it( 'realItems leaves out the loop clones', () => {
		const { track } = build( { loop: true } );
		expect( track.querySelectorAll( '.item' ) ).toHaveLength( 5 );
		expect( realItems( track, '.item' ) ).toHaveLength( 4 );
	} );

	it( 'targetIndex reads the scroll position, by cards per press', () => {
		const { track, items } = build();
		track.scrollLeft = 300;
		expect( targetIndex( track, items, 1 ) ).toBe( 2 );
		expect( targetIndex( track, items, 1, 2 ) ).toBe( 3 );
		expect( targetIndex( track, items, -1 ) ).toBe( 0 );
		track.scrollLeft = 900;
		expect( targetIndex( track, items, 1 ) ).toBe( -1 );
	} );

	it( 'a track inset in a positioned wrapper reads the same as one that is not', () => {
		const { track, items } = build( { inset: 40 } );
		// First Next press from the start lands on the second card, not on the first.
		expect( targetIndex( track, items, 1 ) ).toBe( 1 );
		track.scrollLeft = 300;
		expect( targetIndex( track, items, 1 ) ).toBe( 2 );
		expect( targetIndex( track, items, -1 ) ).toBe( 0 );
		expect( nearestIndex( track, items ) ).toBe( 1 );
		scrollToItem( track, items[ 3 ] );
		expect( track.scrollTo ).toHaveBeenLastCalledWith(
			expect.objectContaining( { left: 900 } )
		);
	} );

	it( 'a track that is its own offset parent, inset in the page, scrolls to the same place', () => {
		const { track, items } = build( {
			inset: 40,
			trackIsOffsetParent: true,
		} );
		expect( targetIndex( track, items, 1 ) ).toBe( 1 );
		scrollToItem( track, items[ 3 ] );
		expect( track.scrollTo ).toHaveBeenLastCalledWith(
			expect.objectContaining( { left: 900 } )
		);
	} );

	it( 'syncDots marks one dot for sight and for assistive technology', () => {
		const { root } = build();
		const dots = root.querySelectorAll( '.dot' );
		syncDots( dots, 2, { activeClass: 'on', ariaCurrent: true } );
		expect( dots[ 2 ].classList.contains( 'on' ) ).toBe( true );
		expect( dots[ 2 ].getAttribute( 'aria-selected' ) ).toBe( 'true' );
		expect( dots[ 2 ].getAttribute( 'aria-current' ) ).toBe( 'true' );
		expect( dots[ 0 ].getAttribute( 'aria-selected' ) ).toBe( 'false' );
		expect( dots[ 0 ].hasAttribute( 'aria-current' ) ).toBe( false );
	} );
} );

describe( 'createCarousel', () => {
	it( 'an arrow lands on the next item and a dot on its own item', () => {
		const parts = build();
		createCarousel( options( parts ) );
		parts.root.querySelector( '.next' ).click();
		expect( parts.track.scrollTo ).toHaveBeenLastCalledWith(
			expect.objectContaining( { left: 300 } )
		);
		parts.root.querySelectorAll( '.dot' )[ 3 ].click();
		expect( parts.track.scrollTo ).toHaveBeenLastCalledWith(
			expect.objectContaining( { left: 900 } )
		);
	} );

	it( 'clamps at the end by default and wraps when asked', () => {
		const parts = build();
		createCarousel( options( parts ) );
		parts.track.scrollLeft = 900;
		parts.root.querySelector( '.next' ).click();
		expect( parts.track.scrollTo ).not.toHaveBeenCalled();

		const wrapping = build();
		createCarousel( { ...options( wrapping ), edge: 'wrap' } );
		wrapping.track.scrollLeft = 900;
		wrapping.root.querySelector( '.next' ).click();
		expect( wrapping.track.scrollTo ).toHaveBeenLastCalledWith(
			expect.objectContaining( { left: 0 } )
		);
	} );

	it( 'disables an arrow at its end, and never on a loop', () => {
		const parts = build();
		const carousel = createCarousel( {
			...options( parts ),
			disableAtEnds: true,
		} );
		const prev = parts.root.querySelector( '.prev' );
		const next = parts.root.querySelector( '.next' );
		expect( prev.disabled ).toBe( true );
		expect( next.disabled ).toBe( false );
		parts.track.scrollLeft = 600;
		carousel.sync();
		expect( next.disabled ).toBe( true );

		const looping = build( { loop: true } );
		const loopCarousel = createCarousel( {
			...options( looping ),
			disableAtEnds: true,
		} );
		looping.track.scrollLeft = 600;
		loopCarousel.sync();
		expect( looping.root.querySelector( '.prev' ).disabled ).toBe( false );
		expect( looping.root.querySelector( '.next' ).disabled ).toBe( false );
	} );

	it( 'a loop scrolls one card per press instead of landing on an item', () => {
		const parts = build( { loop: true } );
		createCarousel( options( parts ) );
		parts.root.querySelector( '.next' ).click();
		expect( parts.track.scrollBy ).toHaveBeenCalledWith(
			expect.objectContaining( { left: expect.any( Number ) } )
		);
		expect( parts.track.scrollTo ).not.toHaveBeenCalled();
	} );

	it( 'card mode scrolls one card width and stops at either end', () => {
		const parts = build();
		createCarousel( { ...options( parts ), moveBy: 'card' } );
		parts.root.querySelector( '.next' ).click();
		expect( parts.track.scrollBy ).toHaveBeenCalledTimes( 1 );
		parts.track.scrollLeft = 600;
		parts.root.querySelector( '.next' ).click();
		expect( parts.track.scrollBy ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'autoplay on a track that does not loop returns to the first item at the end, in card mode too', () => {
		jest.useFakeTimers();
		try {
			const parts = build();
			createCarousel( {
				...options( parts ),
				moveBy: 'card',
				autoplay: { speed: 1000, wrap: false },
			} );
			jest.advanceTimersByTime( 1000 );
			expect( parts.track.scrollBy ).toHaveBeenCalledTimes( 1 );
			parts.track.scrollLeft = 600; // the most a 1200px track in a 600px window scrolls
			jest.advanceTimersByTime( 1000 );
			expect( parts.track.scrollBy ).toHaveBeenCalledTimes( 1 );
			expect( parts.track.scrollTo ).toHaveBeenLastCalledWith(
				expect.objectContaining( { left: 0 } )
			);
		} finally {
			jest.clearAllTimers();
			jest.useRealTimers();
		}
	} );

	it( 'keeps the dots in step with a scroll it did not drive', () => {
		const raf = jest
			.spyOn( window, 'requestAnimationFrame' )
			.mockImplementation( ( cb ) => {
				cb();
				return 1;
			} );
		const parts = build();
		createCarousel( { ...options( parts ), dotActiveClass: 'on' } );
		parts.track.scrollLeft = 600;
		parts.track.dispatchEvent( new Event( 'scroll' ) );
		const dots = parts.root.querySelectorAll( '.dot' );
		expect( dots[ 2 ].classList.contains( 'on' ) ).toBe( true );
		expect( dots[ 0 ].classList.contains( 'on' ) ).toBe( false );
		raf.mockRestore();
	} );

	it( 'left and right keys move the track when keyboard is on', () => {
		const parts = build();
		createCarousel( { ...options( parts ), keyboard: true } );
		const key = new KeyboardEvent( 'keydown', {
			key: 'ArrowRight',
			bubbles: true,
			cancelable: true,
		} );
		parts.track.dispatchEvent( key );
		expect( key.defaultPrevented ).toBe( true );
		expect( parts.track.scrollTo ).toHaveBeenCalled();
	} );

	it( 'builds the dots for a block that prints an empty row', () => {
		const parts = build( { dots: false } );
		const host = document.createElement( 'div' );
		parts.root.appendChild( host );
		createCarousel( {
			root: parts.root,
			track: parts.track,
			itemSelector: '.item',
			buildDots: {
				host,
				className: 'dot',
				activeClass: 'on',
				label: ( n ) => `Go to ${ n }`,
			},
		} );
		expect( host.querySelectorAll( 'button.dot' ) ).toHaveLength( 4 );
		expect( host.children[ 1 ].getAttribute( 'aria-label' ) ).toBe(
			'Go to 2'
		);
		expect( host.children[ 0 ].classList.contains( 'on' ) ).toBe( true );
	} );

	it( 'returns null when there is nothing to move', () => {
		document.body.innerHTML =
			'<div class="root"><div class="track"></div></div>';
		expect(
			createCarousel( {
				root: document.querySelector( '.root' ),
				track: document.querySelector( '.track' ),
				itemSelector: '.item',
			} )
		).toBeNull();
	} );
} );
