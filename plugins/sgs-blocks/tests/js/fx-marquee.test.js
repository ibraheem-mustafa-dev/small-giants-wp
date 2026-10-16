/**
 * Marquee (Spec 38A FR-44): clones the block's marquee set and runs one Web Animations loop per copy through the
 * shared loop control. `@sgs/loop-control` is a webpack external with no jest mapping, so it is mapped virtually onto
 * the real source. Layout numbers jsdom does not compute are stubbed on `getBoundingClientRect`.
 */

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const TABLET = '(max-width: 1023px)';
const MOBILE = '(max-width: 767px)';

let animations;
let queries;
let reduced;
let matching;
let props;
let layout;
let resizeObservers;
let originalRect;

let intersections;

class FakeObserver {
	constructor( callback ) {
		this.callback = callback;
		this.watched = new Set();
		intersections.push( this );
	}

	observe( el ) {
		this.watched.add( el );
	}

	unobserve( el ) {
		this.watched.delete( el );
	}
}

/**
 * Report an element in or out of view to every observer watching it.
 * @param el
 * @param isIntersecting
 */
function report( el, isIntersecting ) {
	intersections.forEach( ( io ) => {
		if ( io.watched.has( el ) ) {
			io.callback( [ { target: el, isIntersecting } ] );
		}
	} );
}

class FakeResize {
	constructor( callback ) {
		this.callback = callback;
		resizeObservers.push( this );
	}

	observe() {}

	disconnect() {}

	fire() {
		this.callback();
	}
}

function fakeAnimation( target, keyframes, options ) {
	const animation = {
		target,
		keyframes,
		options,
		playState: 'running',
		rate: 1,
		pause: jest.fn( () => {
			animation.playState = 'paused';
		} ),
		play: jest.fn( () => {
			animation.playState = 'running';
		} ),
		cancel: jest.fn( () => {
			animation.playState = 'idle';
		} ),
		updatePlaybackRate: jest.fn( ( rate ) => {
			animation.rate = rate;
		} ),
	};
	animations.push( animation );
	return animation;
}

function query( text ) {
	if ( ! queries[ text ] ) {
		const q = {
			listeners: [],
			get matches() {
				return text.includes( 'reduced-motion' )
					? reduced
					: Boolean( matching[ text ] );
			},
			addEventListener: ( type, listener ) =>
				q.listeners.push( listener ),
			removeEventListener: ( type, listener ) => {
				q.listeners = q.listeners.filter(
					( item ) => item !== listener
				);
			},
			// A listener removed by an earlier one in the same dispatch is not called, as in a browser.
			fire: () =>
				q.listeners
					.slice()
					.forEach(
						( listener ) =>
							q.listeners.includes( listener ) && listener()
					),
		};
		queries[ text ] = q;
	}
	return queries[ text ];
}

const ITEMS = '<a href="#one" id="one">One</a><a href="#two">Two</a>';

function mount( { fx = 'marquee', attrs = '', rootClass = 'wp-block-sgs-brand-strip', items = ITEMS } = {} ) {
	document.body.innerHTML = `<div class="${ rootClass }" data-sgs-fx="${ fx }" ${ attrs }><div class="track"><div class="set" data-sgs-marquee-set>${ items }</div></div></div>`;
	const root = document.body.firstElementChild;
	const set = root.querySelector( '[data-sgs-marquee-set]' );
	const track = root.querySelector( '.track' );
	Element.prototype.animate = jest.fn( function ( keyframes, options ) {
		return fakeAnimation( this, keyframes, options );
	} );
	return { root, set, track };
}

const live = () => animations.filter( ( a ) => a.playState !== 'idle' );
const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await Promise.resolve();
	}
};

async function boot() {
	jest.resetModules();
	require( '../../src/shared/effects/fx-marquee' );
	await flush();
}

function pointer( target, type, pointerType = 'mouse' ) {
	const event = new Event( type );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	target.dispatchEvent( event );
}

beforeEach( () => {
	animations = [];
	intersections = [];
	queries = {};
	reduced = false;
	matching = {};
	props = {};
	resizeObservers = [];
	layout = { root: 600, set: 400, gap: 0, height: 100, rootHeight: 300 };
	window.IntersectionObserver = FakeObserver;
	window.ResizeObserver = FakeResize;
	window.matchMedia = jest.fn( query );
	window.getComputedStyle = jest.fn( () => ( {
		getPropertyValue: ( name ) => props[ name ] || '',
		columnGap: `${ layout.gap }px`,
		rowGap: `${ layout.gap }px`,
	} ) );
	originalRect = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function () {
		if ( this.hasAttribute( 'data-sgs-fx' ) ) {
			return { width: layout.root, height: layout.rootHeight, left: 0, top: 0 };
		}
		if (
			this.hasAttribute( 'data-sgs-marquee-set' ) ||
			this.hasAttribute( 'data-sgs-marquee-clone' )
		) {
			const copies = Array.from( this.parentElement.children ).filter(
				( el ) =>
					el.hasAttribute( 'data-sgs-marquee-set' ) ||
					el.hasAttribute( 'data-sgs-marquee-clone' )
			);
			const index = copies.indexOf( this );
			if ( layout.boxOnlyWhenOn && ! this.closest( '[data-sgs-marquee="on"]' ) ) {
				return { width: 0, height: 0, left: 0, top: 0 };
			}
			return {
				width: layout.set,
				height: layout.height,
				left: index * ( layout.set + layout.gap ),
				top: index * ( layout.height + layout.gap ),
			};
		}
		return { width: 0, height: 0, left: 0, top: 0 };
	};
	document.body.innerHTML = '';
} );

afterEach( () => {
	Element.prototype.getBoundingClientRect = originalRect;
	delete Element.prototype.animate;
} );

describe( 'marquee speed in px/s', () => {
	test( 'the loop time is the measured pitch over the speed, on every copy', async () => {
		const { root } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		// 600px root over a 400px set: two copies cover it plus one buffer.
		expect( live() ).toHaveLength( 3 );
		const [ first ] = animations;
		expect( first.options.duration ).toBe( 4000 );
		expect( first.options.easing ).toBe( 'linear' );
		expect( first.options.iterations ).toBe( Infinity );
		expect( first.options.direction ).toBe( 'normal' );
		expect( first.keyframes ).toEqual( [
			{ '--sgs-marquee-x': '0px' },
			{ '--sgs-marquee-x': '-400px' },
		] );
		expect( root.getAttribute( 'data-sgs-marquee' ) ).toBe( 'on' );
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 2 );
	} );

	test( 'the gap between two copies is part of the pitch', async () => {
		layout.gap = 40;
		mount( { attrs: 'data-sgs-fx-marquee-speed="110"' } );
		await boot();
		expect( animations[ 0 ].keyframes[ 1 ][ '--sgs-marquee-x' ] ).toBe(
			'-440px'
		);
		expect( animations[ 0 ].options.duration ).toBe( 4000 );
	} );

	test( 'a per-device custom property wins over the data attribute', async () => {
		props[ '--sgs-marquee-speed' ] = '200';
		mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		expect( animations[ 0 ].options.duration ).toBe( 2000 );
	} );

	test( 'a resize recomputes the duration, with the same number of copies', async () => {
		mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		expect( animations[ 0 ].options.duration ).toBe( 4000 );
		layout.set = 500;
		resizeObservers[ 0 ].fire();
		const latest = live().pop();
		expect( latest.options.duration ).toBe( 5000 );
		expect( latest.keyframes[ 1 ][ '--sgs-marquee-x' ] ).toBe( '-500px' );
		expect( live() ).toHaveLength( 3 );
	} );

	test( 'a resize that needs fewer copies rebuilds them', async () => {
		const { root } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		layout.set = 800;
		resizeObservers[ 0 ].fire();
		expect( live() ).toHaveLength( 2 );
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 1 );
		expect( live()[ 0 ].options.duration ).toBe( 8000 );
	} );

	test( 'a resize with the same measurements changes nothing', async () => {
		mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		const before = animations.length;
		resizeObservers[ 0 ].fire();
		expect( animations ).toHaveLength( before );
	} );
} );

describe( 'a set with no box until the marquee runs', () => {
	test( 'the block is switched to its running layout before the set is measured, so the marquee starts', async () => {
		layout.boxOnlyWhenOn = true;
		const { root } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"', rootClass: 'wp-block-sgs-trust-bar' } );
		await boot();
		expect( root.getAttribute( 'data-sgs-marquee' ) ).toBe( 'on' );
		expect( live() ).toHaveLength( 3 );
		expect( animations[ 0 ].options.duration ).toBe( 4000 );
	} );

	test( 'NEGATIVE CONTROL: a set that still has no size is left static, with the running marks removed', async () => {
		layout.set = 0;
		const { root, track } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		expect( root.hasAttribute( 'data-sgs-marquee' ) ).toBe( false );
		expect( track.hasAttribute( 'data-sgs-marquee-lane' ) ).toBe( false );
		expect( live() ).toHaveLength( 0 );
	} );
} );

describe( 'per-item entrances on a running marquee', () => {
	const PENDING = '<a href="#one" data-sgs-me="scroll opacity">One</a><a href="#two" data-sgs-me="scroll opacity">Two</a>';
	const hidden = ( root ) =>
		Array.from( root.querySelectorAll( '[data-sgs-me~="scroll"]' ) ).filter(
			( el ) => ! el.hasAttribute( 'data-sgs-in' )
		);

	test( 'every item, in the set and in each copy, is revealed once the marquee runs', async () => {
		const { root } = mount( { items: PENDING } );
		await boot();
		expect( root.querySelectorAll( '[data-sgs-marquee-clone]' ).length ).toBeGreaterThan( 0 );
		expect( root.querySelectorAll( '[data-sgs-me~="scroll"]' ) ).toHaveLength( 2 * ( 1 + root.querySelectorAll( '[data-sgs-marquee-clone]' ).length ) );
		expect( hidden( root ) ).toHaveLength( 0 );
	} );

	test( 'NEGATIVE CONTROL: a marquee that does not run (reduced motion) leaves the items for the reveal module', async () => {
		reduced = true;
		const { root } = mount( { items: PENDING } );
		await boot();
		expect( root.querySelectorAll( '[data-sgs-marquee-clone]' ) ).toHaveLength( 0 );
		expect( hidden( root ) ).toHaveLength( 2 );
	} );

	test( 'a multi-keyframe entrance is marked played, so the keyframes module never plays it in the lane', async () => {
		const keyed = '<a href="#one" data-sgs-me="scroll opacity" data-sgs-me-keyframes="[]">One</a><a href="#two" data-sgs-me="scroll opacity">Two</a>';
		const { root } = mount( { items: keyed } );
		await boot();
		const keyframed = Array.from( root.querySelectorAll( '[data-sgs-me-keyframes]' ) );
		expect( keyframed.length ).toBeGreaterThan( 1 );
		keyframed.forEach( ( el ) => expect( el.getAttribute( 'data-sgs-me-kf' ) ).toBe( 'played' ) );
		// NEGATIVE CONTROL: a plain two-state entrance carries no played marker (the stylesheet animation is what the lane stops).
		const plain = Array.from( root.querySelectorAll( '[data-sgs-me]:not([data-sgs-me-keyframes])' ) );
		expect( plain.length ).toBeGreaterThan( 0 );
		plain.forEach( ( el ) => expect( el.hasAttribute( 'data-sgs-me-kf' ) ).toBe( false ) );
	} );

	test( 'a set that is itself waiting for its entrance is revealed too', async () => {
		const { root, set } = mount();
		set.setAttribute( 'data-sgs-me', 'scroll opacity' );
		await boot();
		expect( set.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		expect( hidden( root ) ).toHaveLength( 0 );
	} );
} );

describe( 'marquee duration mode', () => {
	test( 'a stored duration is the loop time whatever the width', async () => {
		mount( {
			attrs: 'data-sgs-fx-marquee-duration="24" data-sgs-fx-marquee-speed="100"',
		} );
		await boot();
		expect( animations[ 0 ].options.duration ).toBe( 24000 );
		layout.set = 500;
		resizeObservers[ 0 ].fire();
		expect( live().pop().options.duration ).toBe( 24000 );
	} );
} );

describe( 'marquee per-device duration', () => {
	test( 'the custom property (ms or s) wins over the attribute and over speed', async () => {
		props[ '--sgs-marquee-duration' ] = '12s';
		mount( {
			attrs: 'data-sgs-fx-marquee-duration="24" data-sgs-fx-marquee-speed="100"',
		} );
		await boot();
		expect( animations[ 0 ].options.duration ).toBe( 12000 );
	} );

	test( 'milliseconds are read as milliseconds', async () => {
		props[ '--sgs-marquee-duration' ] = '30000ms';
		mount();
		await boot();
		expect( animations[ 0 ].options.duration ).toBe( 30000 );
	} );

	test( 'a tier change rebuilds with the new duration and speed', async () => {
		mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		expect( live()[ 0 ].options.duration ).toBe( 4000 );
		props[ '--sgs-marquee-duration' ] = '30s';
		matching[ MOBILE ] = true;
		query( MOBILE ).fire();
		expect( live().pop().options.duration ).toBe( 30000 );
		delete props[ '--sgs-marquee-duration' ];
		props[ '--sgs-marquee-speed' ] = '200';
		query( TABLET ).fire();
		expect( live().pop().options.duration ).toBe( 2000 );
	} );

	test( 'NEGATIVE CONTROL: a zero duration falls back to speed', async () => {
		props[ '--sgs-marquee-duration' ] = '0s';
		mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		expect( animations[ 0 ].options.duration ).toBe( 4000 );
	} );
} );

describe( 'marquee direction', () => {
	test( 'right runs the same keyframes in reverse', async () => {
		mount( { attrs: 'data-sgs-fx-marquee-direction="right"' } );
		await boot();
		expect( animations[ 0 ].options.direction ).toBe( 'reverse' );
		expect( animations[ 0 ].keyframes[ 1 ][ '--sgs-marquee-x' ] ).toBe(
			'-400px'
		);
	} );

	test( 'up animates the vertical channel by the set height', async () => {
		mount( { attrs: 'data-sgs-fx-marquee-direction="up"' } );
		await boot();
		expect( animations[ 0 ].keyframes ).toEqual( [
			{ '--sgs-marquee-y': '0px' },
			{ '--sgs-marquee-y': '-100px' },
		] );
		expect( animations[ 0 ].options.direction ).toBe( 'normal' );
	} );
} );

describe( 'marquee hover rate', () => {
	test( '0.15 sets that playback rate on every copy and restores it on leave', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-hover-rate="0.15"',
		} );
		await boot();
		pointer( root, 'pointerenter' );
		live().forEach( ( a ) => {
			expect( a.updatePlaybackRate ).toHaveBeenLastCalledWith( 0.15 );
			expect( a.rate ).toBe( 0.15 );
			expect( a.pause ).not.toHaveBeenCalled();
		} );
		pointer( root, 'pointerleave' );
		live().forEach( ( a ) => expect( a.rate ).toBe( 1 ) );
	} );

	test( '0 pauses while hovered and plays again on leave', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-hover-rate="0"',
		} );
		await boot();
		pointer( root, 'pointerenter' );
		live().forEach( ( a ) => expect( a.playState ).toBe( 'paused' ) );
		pointer( root, 'pointerleave' );
		live().forEach( ( a ) => expect( a.playState ).toBe( 'running' ) );
	} );

	test( 'a touch pointer entering does not slow the loop', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-hover-rate="0.15"',
		} );
		await boot();
		pointer( root, 'pointerenter', 'touch' );
		live().forEach( ( a ) => expect( a.rate ).toBe( 1 ) );
	} );

	test( 'the per-device custom property wins over the attribute', async () => {
		props[ '--sgs-marquee-hover-rate' ] = '0.5';
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-hover-rate="0.15"',
		} );
		await boot();
		pointer( root, 'pointerenter' );
		expect( live()[ 0 ].rate ).toBe( 0.5 );
	} );

	test( 'NEGATIVE CONTROL: no hover rate means hovering changes nothing', async () => {
		const { root } = mount();
		await boot();
		pointer( root, 'pointerenter' );
		live().forEach( ( a ) => {
			expect( a.updatePlaybackRate ).not.toHaveBeenCalled();
			expect( a.playState ).toBe( 'running' );
		} );
	} );
} );

describe( 'marquee visibility', () => {
	test( 'every copy is watched through the block root, so the copies pause and run together', async () => {
		const { root } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		const watched = new Set( intersections.flatMap( ( io ) => [ ...io.watched ] ) );
		expect( [ ...watched ] ).toEqual( [ root ] );
		report( root, false );
		expect( live().every( ( a ) => a.playState === 'paused' ) ).toBe( true );
		report( root, true );
		expect( live().every( ( a ) => a.playState === 'running' ) ).toBe( true );
	} );

	test( 'a rebuild while the root is off screen keeps the new copies paused', async () => {
		const { root } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		report( root, false );
		layout.root = 900;
		resizeObservers.forEach( ( ro ) => ro.fire() );
		expect( live().length ).toBeGreaterThan( 0 );
		expect( live().every( ( a ) => a.playState === 'paused' ) ).toBe( true );
	} );

	test( 'NEGATIVE CONTROL: a clone reported out of view on its own pauses nothing, since no copy watches itself', async () => {
		const { root } = mount( { attrs: 'data-sgs-fx-marquee-speed="100"' } );
		await boot();
		report( root.querySelector( '[data-sgs-marquee-clone]' ), false );
		expect( live().every( ( a ) => a.playState === 'running' ) ).toBe( true );
	} );
} );

describe( 'marquee pause on touch', () => {
	test( 'a tap pauses and the next tap resumes', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-pause-on-touch="true"',
		} );
		await boot();
		pointer( root, 'pointerdown', 'touch' );
		live().forEach( ( a ) => expect( a.playState ).toBe( 'paused' ) );
		pointer( root, 'pointerdown', 'touch' );
		live().forEach( ( a ) => expect( a.playState ).toBe( 'running' ) );
	} );

	test( 'NEGATIVE CONTROL: a mouse press never pauses, and without the option a tap does nothing', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-pause-on-touch="true"',
		} );
		await boot();
		pointer( root, 'pointerdown', 'mouse' );
		live().forEach( ( a ) => expect( a.playState ).toBe( 'running' ) );
		animations = [];
		const second = mount();
		await boot();
		pointer( second.root, 'pointerdown', 'touch' );
		live().forEach( ( a ) => expect( a.playState ).toBe( 'running' ) );
	} );
} );

describe( 'marquee edge fade', () => {
	test( 'sets the fade size custom property from the width', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-edge-fade="true" data-sgs-fx-marquee-edge-fade-width="8"',
		} );
		await boot();
		expect( root.style.getPropertyValue( '--sgs-marquee-fade-size' ) ).toBe(
			'8%'
		);
	} );

	test( 'defaults to 5% and reads the per-device property', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-edge-fade="true"',
		} );
		await boot();
		expect( root.style.getPropertyValue( '--sgs-marquee-fade-size' ) ).toBe(
			'5%'
		);
	} );

	test( 'NEGATIVE CONTROL: no fade means no custom property', async () => {
		const { root } = mount();
		await boot();
		expect( root.style.getPropertyValue( '--sgs-marquee-fade-size' ) ).toBe(
			''
		);
	} );
} );

describe( 'marquee below a breakpoint', () => {
	test( 'static outside the range: no animation, no copies, every item visible', async () => {
		const { root, set } = mount( {
			attrs: 'data-sgs-fx-marquee-below-breakpoint="mobile"',
		} );
		await boot();
		expect( Element.prototype.animate ).not.toHaveBeenCalled();
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 0 );
		expect( root.hasAttribute( 'data-sgs-marquee' ) ).toBe( false );
		expect( set.children ).toHaveLength( 2 );
		expect( set.hidden ).toBe( false );
	} );

	test( 'runs inside the range and stops again when the viewport leaves it', async () => {
		matching[ MOBILE ] = true;
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-below-breakpoint="mobile"',
		} );
		await boot();
		expect( live() ).toHaveLength( 3 );
		matching[ MOBILE ] = false;
		query( MOBILE ).fire();
		expect( live() ).toHaveLength( 0 );
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 0 );
		expect( root.hasAttribute( 'data-sgs-marquee' ) ).toBe( false );
	} );

	test( 'tablet uses the 1023px query', async () => {
		matching[ TABLET ] = true;
		mount( { attrs: 'data-sgs-fx-marquee-below-breakpoint="tablet"' } );
		await boot();
		expect( live() ).toHaveLength( 3 );
	} );

	test( 'NEGATIVE CONTROL: always runs at any width', async () => {
		mount( { attrs: 'data-sgs-fx-marquee-below-breakpoint="always"' } );
		await boot();
		expect( live() ).toHaveLength( 3 );
	} );
} );

describe( 'marquee under reduced motion', () => {
	test( 'no animation and no copies, every item still visible', async () => {
		reduced = true;
		const { root, set } = mount();
		await boot();
		expect( Element.prototype.animate ).not.toHaveBeenCalled();
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 0 );
		expect( set.children ).toHaveLength( 2 );
	} );

	test( 'starts when the preference clears and stops when it returns', async () => {
		reduced = true;
		const { root } = mount();
		await boot();
		reduced = false;
		query( '(prefers-reduced-motion: reduce)' ).fire();
		expect( live() ).toHaveLength( 3 );
		reduced = true;
		query( '(prefers-reduced-motion: reduce)' ).fire();
		expect( live() ).toHaveLength( 0 );
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 0 );
	} );
} );

describe( 'marquee pause button', () => {
	test( 'is created only with pauseControl, once, outside the moving copies', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-pause-control="true"',
		} );
		await boot();
		const buttons = root.querySelectorAll( 'button.sgs-motion-pause' );
		expect( buttons ).toHaveLength( 1 );
		expect( buttons[ 0 ].closest( '[data-sgs-marquee-set]' ) ).toBeNull();
		expect(
			buttons[ 0 ].closest( '[data-sgs-marquee-clone]' )
		).toBeNull();
		buttons[ 0 ].click();
		live().forEach( ( a ) => expect( a.playState ).toBe( 'paused' ) );
		buttons[ 0 ].click();
		live().forEach( ( a ) => expect( a.playState ).toBe( 'running' ) );
	} );

	test( 'NEGATIVE CONTROL: no button without pauseControl', async () => {
		const { root } = mount();
		await boot();
		expect( root.querySelectorAll( 'button.sgs-motion-pause' ) ).toHaveLength(
			0
		);
	} );

	test( 'a resize keeps the single button', async () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-marquee-pause-control="true"',
		} );
		await boot();
		layout.set = 800;
		resizeObservers[ 0 ].fire();
		expect( root.querySelectorAll( 'button.sgs-motion-pause' ) ).toHaveLength(
			1
		);
	} );
} );

describe( 'marquee copies', () => {
	test( 'are inert and hidden from assistive technology, with no duplicate ids or tab stops', async () => {
		const { root } = mount();
		await boot();
		const clones = root.querySelectorAll( '[data-sgs-marquee-clone]' );
		expect( clones.length ).toBeGreaterThan( 0 );
		clones.forEach( ( clone ) => {
			expect( clone.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
			expect( clone.hasAttribute( 'inert' ) ).toBe( true );
			expect( clone.querySelector( '[id]' ) ).toBeNull();
			clone
				.querySelectorAll( 'a' )
				.forEach( ( a ) =>
					expect( a.getAttribute( 'tabindex' ) ).toBe( '-1' )
				);
		} );
		expect( root.querySelector( '#one' ) ).not.toBeNull();
	} );

	test( 'follow the set in the DOM, inside the same lane', async () => {
		const { track, set } = mount();
		await boot();
		expect( track.children[ 0 ] ).toBe( set );
		expect( track.children[ 1 ].hasAttribute( 'data-sgs-marquee-clone' ) ).toBe(
			true
		);
		expect( track.getAttribute( 'data-sgs-marquee-lane' ) ).toBe( 'on' );
	} );

	test( 'the loop control pauses every copy while focus is inside the block', async () => {
		const { root } = mount();
		await boot();
		root.querySelector( 'a' ).dispatchEvent(
			new FocusEvent( 'focusin', { bubbles: true } )
		);
		live().forEach( ( a ) => expect( a.playState ).toBe( 'paused' ) );
	} );
} );

describe( 'marquee selection', () => {
	test( 'NEGATIVE CONTROL: an element without the marquee token is ignored', async () => {
		const { root } = mount( { fx: 'ambient-float' } );
		await boot();
		expect( Element.prototype.animate ).not.toHaveBeenCalled();
		expect(
			root.querySelectorAll( '[data-sgs-marquee-clone]' )
		).toHaveLength( 0 );
		expect( root.hasAttribute( 'data-sgs-marquee' ) ).toBe( false );
	} );

	test( 'the token can sit in a list with other effects', async () => {
		mount( { fx: 'glare marquee' } );
		await boot();
		expect( live() ).toHaveLength( 3 );
	} );

	test( 'a marquee root without a set is skipped without error', async () => {
		document.body.innerHTML =
			'<div class="wp-block-sgs-brand-strip" data-sgs-fx="marquee"></div>';
		await expect( boot() ).resolves.toBeUndefined();
		expect( Element.prototype.animate ).toBeUndefined();
	} );
} );
