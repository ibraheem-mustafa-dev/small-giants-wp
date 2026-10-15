/**
 * Particle runtime parameters (Spec 38A M5.16c): life, speed, gravity, drag and
 * spawnRate, the precedence helper, and the pool cap that still binds under
 * spawnRate 200.
 *
 * jsdom with a recording canvas context, a manual clock (performance.now) and a
 * manual requestAnimationFrame queue. Math.random is fixed at 0.5 so every
 * particle launches at the same angle and the trajectories are exact.
 */

/* global jest, describe, it, expect, beforeEach, afterEach, HTMLCanvasElement */

import {
	createParticles,
	resolveParticleOptions,
} from '../../src/shared/effects/particles';

const RECT = {
	left: 0,
	top: 0,
	width: 200,
	height: 100,
	right: 200,
	bottom: 100,
};
const POINT = { x: 50, y: 50 };

let clock;
let rafQueue;
let frames;
let observerCallbacks;
let mounted;

/**
 * Install the canvas, clock, rAF and observer mocks. Each drawn frame is
 * recorded as the list of { x, y, r } arcs it painted.
 */
function installMocks() {
	clock = { now: 1000 };
	rafQueue = new Map();
	frames = [];
	observerCallbacks = [];
	mounted = [];

	let nextId = 1;
	jest.spyOn( performance, 'now' ).mockImplementation( () => clock.now );
	jest.spyOn( Math, 'random' ).mockReturnValue( 0.5 );

	window.requestAnimationFrame = ( cb ) => {
		const id = nextId++;
		rafQueue.set( id, cb );
		return id;
	};
	window.cancelAnimationFrame = ( id ) => {
		rafQueue.delete( id );
	};

	window.IntersectionObserver = class {
		constructor( cb ) {
			observerCallbacks.push( cb );
		}
		observe() {}
		disconnect() {}
	};
	window.ResizeObserver = class {
		observe() {}
		disconnect() {}
	};

	HTMLCanvasElement.prototype.getContext = () => ( {
		globalAlpha: 1,
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
		setTransform() {},
		clearRect() {
			frames.push( [] );
		},
		beginPath() {},
		arc( x, y, r ) {
			frames[ frames.length - 1 ].push( { x, y, r } );
		},
		fill() {},
		stroke() {},
	} );
}

/**
 * Create one emitter and make it visible, so push() is accepted.
 *
 * @param {Object} options The createParticles options.
 * @return {{el: HTMLElement, particles: Object}} The mounted emitter.
 */
function mount( options ) {
	const el = document.createElement( 'div' );
	el.getBoundingClientRect = () => RECT;
	document.body.appendChild( el );

	const before = observerCallbacks.length;
	const particles = createParticles( el, options );
	observerCallbacks
		.slice( before )
		.forEach( ( cb ) => cb( [ { isIntersecting: true } ] ) );

	mounted.push( { el, particles } );
	return { el, particles };
}

/** Run every pending rAF callback at the current clock time. */
function flushRaf() {
	const pending = [ ...rafQueue.values() ];
	rafQueue.clear();
	pending.forEach( ( cb ) => cb( clock.now ) );
}

/**
 * Advance the clock in 10 ms frames, running the loop each frame.
 *
 * @param {number} ms How far to advance, in milliseconds.
 */
function advance( ms ) {
	const end = clock.now + ms;
	while ( clock.now < end ) {
		clock.now += 10;
		flushRaf();
	}
}

/**
 * Push one pointer event at each step for `durationMs`, running the loop
 * after every event.
 *
 * @param {Object}   particles  The emitter.
 * @param {number}   durationMs How long to keep pushing, in milliseconds.
 * @param {number}   stepMs     Gap between pointer events, in milliseconds.
 * @param {Function} [onStep]   Called after every event, for sampling.
 */
function pointerEvery( particles, durationMs, stepMs, onStep = () => {} ) {
	const end = clock.now + durationMs;
	while ( clock.now < end ) {
		clock.now += stepMs;
		particles.push( POINT.x, POINT.y );
		flushRaf();
		onStep();
	}
}

/**
 * Start a fresh emitter with one pointer event, then run its first frame.
 * The first frame has dt 0; later frames carry the real step.
 *
 * @param {Object} options The createParticles options.
 * @return {Object} The emitter.
 */
function start( options ) {
	frames.length = 0;
	rafQueue.clear();
	const { particles } = mount( options );
	particles.push( POINT.x, POINT.y );
	flushRaf();
	return particles;
}

/**
 * One pointer burst, then ten 10 ms frames. Returns every frame drawn.
 *
 * @param {Object} options The createParticles options.
 * @return {Array<Array<{x: number, y: number, r: number}>>} Frames drawn.
 */
function burst( options ) {
	start( options );
	advance( 100 );
	return frames.map( ( frame ) => frame.slice() );
}

beforeEach( installMocks );

afterEach( () => {
	mounted.forEach( ( { particles } ) => particles.destroy() );
	document.body.replaceChildren();
	jest.restoreAllMocks();
} );

describe( 'particle parameters (Spec 38A M5.16c)', () => {
	it( 'gravity 0 and gravity 2 give different trajectories after the same steps', () => {
		const still = burst( { preset: 'sparks', gravity: 0 } );
		const falling = burst( { preset: 'sparks', gravity: 2 } );

		expect( falling ).not.toEqual( still );
		const lastStill = still[ still.length - 1 ][ 0 ];
		const lastFalling = falling[ falling.length - 1 ][ 0 ];
		expect( lastFalling.y ).toBeGreaterThan( lastStill.y + 0.5 );
	} );

	it( 'gravity 1 on gravity-dots is the preset 140 px/s² (ratio base)', () => {
		expect( burst( { preset: 'gravity-dots' } ) ).toEqual(
			burst( { preset: 'gravity-dots', gravity: 1 } )
		);
	} );

	it( 'speed 2 doubles the launch velocity relative to speed 1', () => {
		const one = burst( { preset: 'sparks', speed: 1 } );
		const two = burst( { preset: 'sparks', speed: 2 } );
		const move = ( frs ) => frs[ 1 ][ 0 ].x - frs[ 0 ][ 0 ].x;

		expect( move( one ) ).not.toBe( 0 );
		expect( move( two ) ).toBeCloseTo( 2 * move( one ), 9 );
	} );

	it( 'life 500ms removes particles sooner than the preset life', () => {
		const preset = start( { preset: 'sparks' } );
		advance( 520 );
		expect( preset.stats().live ).toBe( 3 );

		const short = start( { preset: 'sparks', life: 500 } );
		advance( 520 );
		expect( short.stats().live ).toBe( 0 );
	} );

	it( 'drag replaces the preset per-step velocity multiplier', () => {
		// The drag multiplier is applied once per step, the first (dt 0) frame
		// included, so the first step carries two applications. The ratio
		// between later steps is the multiplier itself, unaffected by that.
		const decayRatio = ( options ) => {
			const x = burst( options ).map( ( frame ) => frame[ 0 ].x );
			const step = ( i ) => x[ i + 1 ] - x[ i ];
			return step( 2 ) / step( 1 );
		};

		expect( decayRatio( { preset: 'sparks', drag: 1 } ) ).toBeCloseTo(
			1,
			9
		);
		expect( decayRatio( { preset: 'sparks', drag: 0.5 } ) ).toBeCloseTo(
			0.5,
			9
		);
		expect( decayRatio( { preset: 'sparks' } ) ).toBeCloseTo( 0.92, 9 );
	} );

	it( 'spawnRate limits emission over time instead of the preset count', () => {
		const limited = start( {
			preset: 'sparks',
			life: 20000,
			spawnRate: 20,
		} );
		pointerEvery( limited, 1000, 10 );
		// 20 per second over one second, with float rounding at the edges.
		expect( limited.stats().live ).toBeGreaterThanOrEqual( 19 );
		expect( limited.stats().live ).toBeLessThanOrEqual( 20 );

		// The same gesture without spawnRate emits the preset count per event,
		// which the pool cap of 150 cuts short.
		const preset = start( { preset: 'sparks', life: 20000 } );
		pointerEvery( preset, 1000, 10 );
		expect( preset.stats().live ).toBe( 150 );
	} );

	it( 'MAX_PARTICLES still caps the pool under spawnRate 200', () => {
		const particles = start( {
			preset: 'sparks',
			life: 20000,
			spawnRate: 200,
		} );
		let peak = 0;
		pointerEvery( particles, 2000, 10, () => {
			peak = Math.max( peak, particles.stats().live );
		} );
		expect( peak ).toBe( 150 );
	} );

	it( 'ripple minIntervalMs becomes 1000 / spawnRate', () => {
		// spawnRate 4 gives a 250 ms gap between rings.
		const rings = start( { preset: 'ripple', spawnRate: 4 } );
		clock.now = 1100;
		rings.push( POINT.x, POINT.y );
		flushRaf();
		expect( rings.stats().live ).toBe( 1 );

		clock.now = 1260;
		rings.push( POINT.x, POINT.y );
		flushRaf();
		expect( rings.stats().live ).toBe( 2 );
	} );

	it( 'configure re-reads the values without creating a second canvas', () => {
		const { el, particles } = mount( { preset: 'sparks', life: 20000 } );
		particles.configure( { preset: 'sparks', life: 20000, spawnRate: 20 } );

		pointerEvery( particles, 1000, 10 );
		expect( el.querySelectorAll( 'canvas' ) ).toHaveLength( 1 );
		expect( particles.stats().live ).toBeGreaterThanOrEqual( 18 );
		expect( particles.stats().live ).toBeLessThanOrEqual( 20 );
	} );

	it( 'parses life as ms or seconds, and rejects a unit on any other field', () => {
		expect( resolveParticleOptions( { life: [ '1.2s' ] } ).life ).toBe(
			1200
		);
		expect( resolveParticleOptions( { life: [ '1200ms' ] } ).life ).toBe(
			1200
		);
		expect( resolveParticleOptions( { life: [ '1200' ] } ).life ).toBe(
			1200
		);
		expect( resolveParticleOptions( { life: [ ' 1200 ' ] } ).life ).toBe(
			1200
		);
		expect(
			resolveParticleOptions( { life: [ 'soon' ] } ).life
		).toBeUndefined();
		expect(
			resolveParticleOptions( { speed: [ '1s' ] } ).speed
		).toBeUndefined();
		expect( resolveParticleOptions( { gravity: [ '-2' ] } ).gravity ).toBe(
			-2
		);
	} );

	it( 'precedence: a custom property beats the data attribute, which beats the preset', () => {
		// Custom property first; an empty or invalid one falls through to the attribute.
		expect(
			resolveParticleOptions( { density: [ '2', '1.5' ] } ).density
		).toBe( 2 );
		expect(
			resolveParticleOptions( { density: [ '', '1.5' ] } ).density
		).toBe( 1.5 );
		expect(
			resolveParticleOptions( { density: [ 'auto', '1.5' ] } ).density
		).toBe( 1.5 );
		expect( resolveParticleOptions( { life: [ '', '500' ] } ).life ).toBe(
			500
		);

		// Nothing valid: undefined, so the engine uses the preset's own value.
		expect(
			resolveParticleOptions( { density: [ '', '' ] } ).density
		).toBeUndefined();
		expect( resolveParticleOptions( {} ).density ).toBeUndefined();
	} );

	it( 'negative control: with nothing set, the engine plays the preset values exactly', () => {
		const unset = resolveParticleOptions( {} );
		const fromUnset = burst( { preset: 'sparks', ...unset } );
		const fromPreset = burst( {
			preset: 'sparks',
			life: 550,
			speed: 1,
			gravity: 0,
			drag: 0.92,
			spawnRate: 0,
		} );

		expect( fromUnset ).toEqual( fromPreset );
	} );
} );
