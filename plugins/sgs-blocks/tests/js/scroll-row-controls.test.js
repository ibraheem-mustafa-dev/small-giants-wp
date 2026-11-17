/**
 * Behaviour of src/shared/scroll-row-controls (sgs/container's "Scroll sideways" arrows, dots and mouse drag).
 *
 * jsdom has no layout, so the row's geometry is stubbed: five 220px items in a 300px window (scrollWidth 1100), so the
 * furthest the row scrolls is 800 and the stops it can rest on are 0, 220, 440, 660 and 800 (the fifth item's own
 * position, 880, is clamped to the end).
 */

const MODULE = '../../src/shared/scroll-row-controls/index.js';
const ITEM = 220;

let scroll;

function build( { overflow = 'auto', scrollWidth = 1100, controls = 'arrows dots drag' } = {} ) {
	document.body.innerHTML = `
		<section>
			<div class="row" data-sgs-scroll-controls="${ controls }" style="overflow-x:${ overflow }">
				<p>1</p><p>2</p><p>3</p><p>4</p><p>5</p>
			</div>
			<div class="sgs-container__scroll-nav">
				<button class="sgs-container__arrow sgs-container__arrow--prev" type="button" aria-label="Previous"></button>
				<div class="sgs-container__dots" role="group" aria-label="Scroll position"></div>
				<button class="sgs-container__arrow sgs-container__arrow--next" type="button" aria-label="Next"></button>
			</div>
		</section>`;
	const row = document.querySelector( '.row' );
	scroll = 0;
	Object.defineProperty( row, 'scrollLeft', {
		configurable: true,
		get: () => scroll,
		set: ( v ) => {
			scroll = v;
		},
	} );
	Object.defineProperty( row, 'clientWidth', { configurable: true, value: 300 } );
	Object.defineProperty( row, 'scrollWidth', { configurable: true, value: scrollWidth } );
	row.getBoundingClientRect = () => ( { left: 0, right: 300, width: 300, top: 0, bottom: 100, height: 100 } );
	Array.from( row.children ).forEach( ( item, i ) => {
		item.getBoundingClientRect = () => ( {
			left: i * ITEM - scroll,
			right: i * ITEM - scroll + ITEM,
			width: ITEM,
			top: 0,
			bottom: 100,
			height: 100,
		} );
	} );
	row.scrollTo = jest.fn( ( { left } ) => {
		scroll = left;
	} );
	return {
		row,
		nav: document.querySelector( '.sgs-container__scroll-nav' ),
		prev: document.querySelector( '.sgs-container__arrow--prev' ),
		next: document.querySelector( '.sgs-container__arrow--next' ),
		dots: () => Array.from( document.querySelectorAll( '.sgs-container__dot' ) ),
	};
}

function stubMatchMedia( reduced ) {
	window.matchMedia = jest.fn( ( query ) => ( {
		matches: reduced && query.includes( 'reduce' ),
		media: query,
		addEventListener() {},
		removeEventListener() {},
	} ) );
}

function load() {
	let mod;
	jest.isolateModules( () => {
		mod = require( MODULE );
	} );
	return mod;
}

function scrollTo( row, left ) {
	scroll = left;
	row.dispatchEvent( new Event( 'scroll' ) );
}

function pointer( target, type, x, pointerType = 'mouse' ) {
	const event = new MouseEvent( type, { clientX: x, button: 0, bubbles: true, cancelable: true } );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	Object.defineProperty( event, 'pointerId', { value: 1 } );
	target.dispatchEvent( event );
	return event;
}

const activeIndex = ( dots ) => dots.findIndex( ( d ) => d.classList.contains( 'sgs-container__dot--active' ) );

beforeEach( () => {
	window.requestAnimationFrame = ( cb ) => cb();
	window.ResizeObserver = undefined;
	stubMatchMedia( false );
} );

describe( 'stops', () => {
	test( 'one stop per position the row can rest on, the last clamped to the end', () => {
		const { row } = build();
		expect( load().scrollStops( row ) ).toEqual( [ 0, 220, 440, 660, 800 ] );
	} );
} );

describe( 'dots', () => {
	test( 'the dot count follows the stops and the active dot follows the scroll position', () => {
		const { row, dots } = build();
		load().initScrollRowControl( row );
		expect( dots() ).toHaveLength( 5 );
		expect( activeIndex( dots() ) ).toBe( 0 );
		expect( dots()[ 0 ].getAttribute( 'aria-current' ) ).toBe( 'true' );
		scrollTo( row, 450 );
		expect( activeIndex( dots() ) ).toBe( 2 );
		expect( dots().filter( ( d ) => d.hasAttribute( 'aria-current' ) ) ).toHaveLength( 1 );
		scrollTo( row, 800 );
		expect( activeIndex( dots() ) ).toBe( 4 );
	} );

	test( 'a dot moves the row to its stop, and its name says which', () => {
		const { row, dots } = build();
		load().initScrollRowControl( row );
		dots()[ 3 ].click();
		expect( row.scrollTo ).toHaveBeenCalledWith( { left: 660, behavior: 'smooth' } );
		expect( dots()[ 3 ].getAttribute( 'aria-label' ) ).toMatch( /4/ );
	} );

	test( 'the dots are rebuilt when a resize changes how many stops there are', () => {
		const { row, dots } = build();
		load().initScrollRowControl( row );
		Object.defineProperty( row, 'scrollWidth', { configurable: true, value: 760 } );
		window.dispatchEvent( new Event( 'resize' ) );
		expect( dots() ).toHaveLength( 4 ); // furthest scroll is now 460: stops 0, 220, 440, 460
	} );
} );

describe( 'arrows', () => {
	test( 'next moves one stop, prev moves back, each disabled at its end', () => {
		const { row, prev, next } = build();
		load().initScrollRowControl( row );
		expect( prev.disabled ).toBe( true );
		expect( next.disabled ).toBe( false );
		next.click();
		expect( row.scrollTo ).toHaveBeenLastCalledWith( { left: 220, behavior: 'smooth' } );
		scrollTo( row, 220 );
		expect( prev.disabled ).toBe( false );
		prev.click();
		expect( row.scrollTo ).toHaveBeenLastCalledWith( { left: 0, behavior: 'smooth' } );
		scrollTo( row, 800 );
		expect( next.disabled ).toBe( true );
		expect( prev.disabled ).toBe( false );
	} );

	test( 'focus moves to the other arrow when the focused one becomes disabled', () => {
		const { row, prev, next } = build();
		load().initScrollRowControl( row );
		scrollTo( row, 660 );
		next.focus();
		scrollTo( row, 800 );
		expect( next.disabled ).toBe( true );
		expect( document.activeElement ).toBe( prev );
	} );

	test( 'reduced motion scrolls without smoothing', () => {
		stubMatchMedia( true );
		const { row, next } = build();
		load().initScrollRowControl( row );
		next.click();
		expect( row.scrollTo ).toHaveBeenLastCalledWith( { left: 220, behavior: 'auto' } );
	} );
} );

describe( 'when the controls show', () => {
	test( 'the bar is ready while the row overflows and scrolls', () => {
		const { row, nav } = build();
		load().initScrollRowControl( row );
		expect( nav.classList.contains( 'is-ready' ) ).toBe( true );
	} );

	test( 'no overflow: the bar stays hidden and holds no dots', () => {
		const { row, nav, dots } = build( { scrollWidth: 300 } );
		load().initScrollRowControl( row );
		expect( nav.classList.contains( 'is-ready' ) ).toBe( false );
		expect( dots() ).toHaveLength( 0 );
	} );

	test( 'a device where the row does not scroll: the bar stays hidden', () => {
		const { row, nav } = build( { overflow: 'visible' } );
		load().initScrollRowControl( row );
		expect( nav.classList.contains( 'is-ready' ) ).toBe( false );
	} );

	test( 'a resize that turns the row into a scroller shows the bar', () => {
		const { row, nav } = build( { overflow: 'visible' } );
		load().initScrollRowControl( row );
		row.style.overflowX = 'auto';
		window.dispatchEvent( new Event( 'resize' ) );
		expect( nav.classList.contains( 'is-ready' ) ).toBe( true );
	} );
} );

describe( 'mouse drag', () => {
	test( 'dragging moves the row with the pointer, then rests on the nearest stop', () => {
		const { row } = build();
		load().initScrollRowControl( row );
		pointer( row, 'pointerdown', 300 );
		pointer( row, 'pointermove', 250 );
		expect( row.classList.contains( 'is-dragging' ) ).toBe( true );
		expect( scroll ).toBe( 50 );
		pointer( row, 'pointermove', 100 );
		expect( scroll ).toBe( 200 );
		pointer( row, 'pointerup', 100 );
		expect( row.classList.contains( 'is-dragging' ) ).toBe( false );
		expect( row.scrollTo ).toHaveBeenLastCalledWith( { left: 220, behavior: 'smooth' } );
	} );

	test( 'a click after a drag is swallowed, a plain click is not', () => {
		const { row } = build();
		load().initScrollRowControl( row );
		pointer( row, 'pointerdown', 300 );
		pointer( row, 'pointermove', 100 );
		pointer( row, 'pointerup', 100 );
		const dragClick = new MouseEvent( 'click', { bubbles: true, cancelable: true } );
		row.children[ 0 ].dispatchEvent( dragClick );
		expect( dragClick.defaultPrevented ).toBe( true );
		const plain = new MouseEvent( 'click', { bubbles: true, cancelable: true } );
		row.children[ 0 ].dispatchEvent( plain );
		expect( plain.defaultPrevented ).toBe( false );
	} );

	test( 'a touch pointer is left to native scrolling', () => {
		const { row } = build();
		load().initScrollRowControl( row );
		pointer( row, 'pointerdown', 300, 'touch' );
		pointer( row, 'pointermove', 100, 'touch' );
		expect( scroll ).toBe( 0 );
		expect( row.classList.contains( 'is-dragging' ) ).toBe( false );
	} );

	test( 'drag off: a mouse does nothing', () => {
		const { row } = build( { controls: 'arrows dots' } );
		load().initScrollRowControl( row );
		pointer( row, 'pointerdown', 300 );
		pointer( row, 'pointermove', 100 );
		expect( scroll ).toBe( 0 );
	} );
} );

describe( 'switches', () => {
	test( 'dots off: none are built, the arrows still work; arrows off: they are left alone', () => {
		const first = build( { controls: 'arrows' } );
		load().initScrollRowControl( first.row );
		expect( first.dots() ).toHaveLength( 0 );
		expect( first.prev.disabled ).toBe( true );
		const second = build( { controls: 'dots' } );
		load().initScrollRowControl( second.row );
		expect( second.dots() ).toHaveLength( 5 );
		expect( second.prev.disabled ).toBe( false );
	} );
} );
