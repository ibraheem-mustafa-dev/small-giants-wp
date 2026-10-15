/**
 * Tier G text and SVG runtimes read every parameter their schema declares
 * (Spec 38A FR-38A-22, FR-38A-11, unit M5.16b): split-reveal, scramble, draw,
 * morph, motion-path and flip. GSAP and its plugins are mocked; each test reads
 * the options the runtime hands to GSAP.
 */

jest.mock( 'gsap', () => ( {
	gsap: { defaults: jest.fn(), registerPlugin: jest.fn() },
} ) );
jest.mock( '../../src/shared/effects/motion-utils.js', () => ( {
	chromeOffsetPx: () => 0,
} ) );
jest.mock( 'gsap/ScrollTrigger', () => ( { ScrollTrigger: {} } ) );
jest.mock( 'gsap/DrawSVGPlugin', () => ( { DrawSVGPlugin: {} } ) );
jest.mock( 'gsap/MorphSVGPlugin', () => ( { MorphSVGPlugin: {} } ) );
jest.mock( 'gsap/MotionPathPlugin', () => ( { MotionPathPlugin: {} } ) );
jest.mock( 'gsap/ScrambleTextPlugin', () => ( { ScrambleTextPlugin: {} } ) );
jest.mock( 'gsap/SplitText', () => ( { SplitText: { create: jest.fn() } } ) );
jest.mock( 'gsap/Flip', () => ( {
	Flip: { getState: jest.fn(), from: jest.fn(), killFlipsOf: jest.fn() },
} ) );

const mockTween = () => ( {
	play: jest.fn(),
	reverse: jest.fn(),
	restart: jest.fn(),
	kill: jest.fn(),
	progress: jest.fn(),
	scrollTrigger: { kill: jest.fn() },
} );
const mockGsap = {
	to: jest.fn( () => mockTween() ),
	from: jest.fn( () => mockTween() ),
	fromTo: jest.fn( () => mockTween() ),
	set: jest.fn(),
};

jest.mock(
	'@sgs/motion-provider',
	() => ( {
		...jest.requireActual( '../../src/shared/effects/gsap/provider.js' ),
		tierG: jest.fn(),
		bootEffect: jest.fn(),
		withMotionAllowed: ( setup ) => setup( mockGsap, {} ),
	} ),
	{ virtual: true }
);

import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { initSplitReveal } from '../../src/shared/effects/gsap/fx-split-reveal.js';
import { initScramble } from '../../src/shared/effects/gsap/fx-scramble.js';
import {
	initDraw,
	drawRange,
	bindDrawHover,
} from '../../src/shared/effects/gsap/fx-draw.js';
import { initMorph } from '../../src/shared/effects/gsap/fx-morph.js';
import { initMotionPath } from '../../src/shared/effects/gsap/fx-motion-path.js';
import { initFlip } from '../../src/shared/effects/gsap/fx-flip.js';

const CUBIC = 'cubic-bezier(0.16,1,0.3,1)';

/**
 * A mounted element carrying the given attributes.
 *
 * @param {Object} attrs   Attribute name to value.
 * @param {string} [html]  Inner markup.
 * @param {string} [tag]   Tag name.
 * @return {HTMLElement} The element.
 */
function mount( attrs = {}, html = '', tag = 'div' ) {
	const el = document.createElement( tag );
	Object.entries( attrs ).forEach( ( [ name, value ] ) =>
		el.setAttribute( name, value )
	);
	el.innerHTML = html;
	document.body.appendChild( el );
	return el;
}

beforeEach( () => {
	document.body.innerHTML = '';
	jest.clearAllMocks();
	SplitText.create.mockImplementation( ( target, config ) => {
		config.onSplit( {
			chars: [ 'c1', 'c2', 'c3', 'c4' ],
			words: [ 'w1', 'w2', 'w3', 'w4' ],
			lines: [ 'l1' ],
		} );
		return { revert: jest.fn() };
	} );
} );

describe( 'split-reveal', () => {
	const run = ( attrs ) => {
		initSplitReveal( mount( attrs, 'Hello brave new world' ) );
		return mockGsap.from.mock.calls[ 0 ][ 1 ];
	};

	it( 'with no attributes keeps today\'s options exactly (negative control)', () => {
		const el = mount( {}, 'Hello' );
		initSplitReveal( el );
		expect( mockGsap.from ).toHaveBeenCalledWith( [ 'w1', 'w2', 'w3', 'w4' ], {
			opacity: 0,
			y: '0.6em',
			duration: 0.6,
			stagger: 0.03,
			ease: 'power2.out',
			scrollTrigger: { trigger: el, start: 'top 85%' },
		} );
		expect( SplitText.create.mock.calls[ 0 ][ 1 ].mask ).toBeUndefined();
	} );

	it( 'reads the from-state, duration, stagger step, ease and range', () => {
		const vars = run( {
			'data-sgs-fx-split-reveal-from-opacity': '0.2',
			'data-sgs-fx-split-reveal-from-translate-y': '24px',
			'data-sgs-fx-split-reveal-from-blur': '8px',
			'data-sgs-fx-split-reveal-from-rotate': '6deg',
			'data-sgs-fx-duration': '1.4',
			'data-sgs-fx-stagger': '0.1',
			'data-sgs-fx-ease': 'power4.out',
			'data-sgs-fx-start': 'top 70%',
			'data-sgs-fx-end': 'bottom 20%',
		} );
		expect( vars ).toMatchObject( {
			opacity: 0.2,
			y: '24px',
			filter: 'blur(8px)',
			rotation: '6deg',
			duration: 1.4,
			stagger: 0.1,
			ease: 'power4.out',
		} );
		expect( vars.scrollTrigger ).toMatchObject( {
			start: 'top 70%',
			end: 'bottom 20%',
		} );
	} );

	it( 'reads the split unit and the mask', () => {
		run( {
			'data-sgs-fx-split': 'chars',
			'data-sgs-fx-mask': 'chars',
		} );
		expect( SplitText.create.mock.calls[ 0 ][ 1 ] ).toMatchObject( {
			type: 'chars',
			mask: 'chars',
		} );
		expect( mockGsap.from.mock.calls[ 0 ][ 0 ] ).toEqual( [ 'c1', 'c2', 'c3', 'c4' ] );
	} );

	it( 'reads the stagger order, and a stored seed gives one fixed shuffle', () => {
		expect(
			run( {
				'data-sgs-fx-split-reveal-stagger-order': 'centre',
				'data-sgs-fx-stagger': '0.05',
			} ).stagger
		).toEqual( { each: 0.05, from: 'center' } );
		mockGsap.from.mockClear();
		expect(
			run( { 'data-sgs-fx-split-reveal-stagger-order': 'end' } ).stagger
		).toEqual( { each: 0.03, from: 'end' } );
		mockGsap.from.mockClear();
		expect(
			run( { 'data-sgs-fx-split-reveal-stagger-order': 'random' } ).stagger
		).toEqual( { each: 0.03, from: 'random' } );

		const seeded = { 'data-sgs-fx-split-reveal-stagger-order': 'random', 'data-sgs-fx-split-reveal-seed': '42' };
		mockGsap.from.mockClear();
		const a = run( seeded ).stagger;
		mockGsap.from.mockClear();
		const b = run( seeded ).stagger;
		const orderA = [ 0, 1, 2, 3 ].map( ( i ) => a( i ) );
		expect( orderA ).toEqual( [ 0, 1, 2, 3 ].map( ( i ) => b( i ) ) );
		expect( [ ...orderA ].sort() ).toEqual( [ 0, 0.03, 0.06, 0.09 ].sort() );
	} );

	it( 'passes a custom cubic-bezier as a function', () => {
		expect( typeof run( { 'data-sgs-fx-ease': CUBIC } ).ease ).toBe( 'function' );
	} );
} );

describe( 'scramble', () => {
	const run = ( attrs ) => {
		initScramble( mount( attrs, 'Scramble me' ) );
		return mockGsap.to.mock.calls[ 0 ][ 1 ];
	};

	it( 'with no attributes keeps today\'s options exactly (negative control)', () => {
		const el = mount( {}, 'Scramble me' );
		initScramble( el );
		expect( mockGsap.to ).toHaveBeenCalledWith( expect.anything(), {
			duration: 1.2,
			ease: 'none',
			scrambleText: { text: 'Scramble me', tweenLength: false },
			immediateRender: false,
			scrollTrigger: { trigger: el, start: 'top 85%' },
		} );
	} );

	it( 'reads the character set, duration, reveal delay, ease and range', () => {
		const vars = run( {
			'data-sgs-fx-scramble-charset': 'digits',
			'data-sgs-fx-duration': '2',
			'data-sgs-fx-scramble-reveal-delay': '300',
			'data-sgs-fx-ease': 'power1.inOut',
			'data-sgs-fx-start': 'top 60%',
			'data-sgs-fx-end': 'top 10%',
		} );
		expect( vars.scrambleText ).toMatchObject( {
			chars: '0123456789',
			revealDelay: 0.3,
		} );
		expect( vars ).toMatchObject( { duration: 2, ease: 'power1.inOut' } );
		expect( vars.scrollTrigger ).toMatchObject( { start: 'top 60%', end: 'top 10%' } );
	} );

	it( 'maps upper and lower to the plugin sets', () => {
		expect( run( { 'data-sgs-fx-scramble-charset': 'upper' } ).scrambleText.chars ).toBe( 'upperCase' );
		mockGsap.to.mockClear();
		expect( run( { 'data-sgs-fx-scramble-charset': 'lower' } ).scrambleText.chars ).toBe( 'lowerCase' );
	} );

	it( 'passes a custom cubic-bezier as a function', () => {
		expect( typeof run( { 'data-sgs-fx-ease': CUBIC } ).ease ).toBe( 'function' );
	} );
} );

describe( 'draw', () => {
	const SVG = '<svg><path d="M0 0L10 10"/></svg>';
	const run = ( attrs, html = SVG ) => {
		const el = mount( attrs, html );
		const cleanup = initDraw( el );
		return { el, cleanup, call: mockGsap.fromTo.mock.calls[ 0 ] };
	};

	it( 'with no attributes keeps today\'s options exactly (negative control)', () => {
		const { el, call } = run( {} );
		expect( call[ 1 ] ).toEqual( { drawSVG: '0%' } );
		expect( call[ 2 ] ).toEqual( {
			drawSVG: '100%',
			duration: 1,
			ease: 'power2.inOut',
			scrollTrigger: {
				trigger: el,
				start: 'top 85%',
				end: 'top 40%',
				scrub: 1,
			},
		} );
	} );

	it( 'a partial reverse draw from 100% to 40% reaches DrawSVG as 100% then 40%', () => {
		const { call } = run( {
			'data-sgs-fx-draw-from': '100',
			'data-sgs-fx-draw-to': '40',
		} );
		expect( call[ 1 ] ).toEqual( { drawSVG: '100%' } );
		expect( call[ 2 ].drawSVG ).toBe( '40%' );
	} );

	it( 'direction reverse anchors the segment at the far end of the stroke', () => {
		const el = mount( { 'data-sgs-fx-draw-direction': 'reverse' } );
		expect( drawRange( el ) ).toEqual( { from: '100% 100%', to: '0% 100%' } );
		const partial = mount( {
			'data-sgs-fx-draw-direction': 'reverse',
			'data-sgs-fx-draw-from': '0',
			'data-sgs-fx-draw-to': '60',
		} );
		expect( drawRange( partial ) ).toEqual( { from: '100% 100%', to: '40% 100%' } );
	} );

	it( 'reads duration, ease and the range lines', () => {
		const { call } = run( {
			'data-sgs-fx-duration': '2.5',
			'data-sgs-fx-ease': 'back.out',
			'data-sgs-fx-start': 'top 90%',
			'data-sgs-fx-end': 'top 30%',
		} );
		expect( call[ 2 ] ).toMatchObject( { duration: 2.5, ease: 'back.out' } );
		expect( call[ 2 ].scrollTrigger ).toMatchObject( { start: 'top 90%', end: 'top 30%' } );
	} );

	it( 'passes a custom cubic-bezier as a function', () => {
		expect( typeof run( { 'data-sgs-fx-ease': CUBIC } ).call[ 2 ].ease ).toBe( 'function' );
	} );

	it( 'warns when a named asset has nothing drawable', () => {
		const warn = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const { cleanup } = run( { 'data-sgs-fx-draw-asset': '42' }, '<svg></svg>' );
		expect( cleanup ).toBeUndefined();
		expect( warn ).toHaveBeenCalledWith( expect.stringContaining( 'draw-asset "42"' ), expect.anything() );
		warn.mockRestore();
	} );

	describe( 'hover trigger', () => {
		const hover = () => {
			const { el, cleanup, call } = run( { 'data-sgs-fx-trigger': 'hover' } );
			const tween = mockGsap.fromTo.mock.results[ 0 ].value;
			return { el, cleanup, call, tween };
		};

		it( 'builds a paused tween that does not hide the stroke at rest', () => {
			const { call } = hover();
			expect( call[ 2 ] ).toMatchObject( { paused: true, immediateRender: false } );
			expect( call[ 2 ].scrollTrigger ).toBeUndefined();
		} );

		it( 'plays on pointerenter and reverses on pointerleave', () => {
			const { el, tween } = hover();
			el.dispatchEvent( new Event( 'pointerenter' ) );
			expect( tween.play ).toHaveBeenCalledTimes( 1 );
			el.dispatchEvent( new Event( 'pointerleave' ) );
			expect( tween.reverse ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'plays on focus and reverses on blur out of the element', () => {
			const { el, tween } = hover();
			el.dispatchEvent( new Event( 'focusin' ) );
			expect( tween.play ).toHaveBeenCalledTimes( 1 );
			el.dispatchEvent( new FocusEvent( 'focusout', { relatedTarget: document.body } ) );
			expect( tween.reverse ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'stays drawn while focus moves inside it or the pointer still rests on it', () => {
			const { el, tween } = hover();
			el.dispatchEvent( new Event( 'pointerenter' ) );
			el.dispatchEvent( new Event( 'focusin' ) );
			el.dispatchEvent( new FocusEvent( 'focusout', { relatedTarget: document.body } ) );
			expect( tween.reverse ).not.toHaveBeenCalled();
			el.dispatchEvent( new Event( 'pointerleave' ) );
			expect( tween.reverse ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'cleanup detaches the listeners', () => {
			const { el, cleanup, tween } = hover();
			cleanup();
			el.dispatchEvent( new Event( 'pointerenter' ) );
			expect( tween.play ).not.toHaveBeenCalled();
			expect( tween.kill ).toHaveBeenCalled();
		} );

		it( 'bindDrawHover is reusable on any element and tween', () => {
			const target = mount();
			const tween = mockTween();
			const unbind = bindDrawHover( target, tween );
			target.dispatchEvent( new Event( 'pointerenter' ) );
			expect( tween.play ).toHaveBeenCalled();
			unbind();
		} );
	} );
} );

describe( 'morph', () => {
	let observed;
	beforeEach( () => {
		observed = [];
		window.IntersectionObserver = class {
			constructor( callback, options ) {
				observed.push( options );
			}

			observe() {}

			unobserve() {}

			disconnect() {}
		};
	} );

	const run = ( attrs ) => {
		document.body.insertAdjacentHTML( 'beforeend', '<svg><path id="morph-to" d="M0 0L5 5"/></svg>' );
		const el = mount( { 'data-sgs-fx-morph-target': '#morph-to', ...attrs } );
		initMorph( el );
		return mockGsap.to.mock.calls[ 0 ][ 1 ];
	};

	it( 'with no attributes keeps today\'s options exactly (negative control)', () => {
		const vars = run( {} );
		expect( vars ).toEqual( {
			morphSVG: document.getElementById( 'morph-to' ),
			duration: 0.8,
			ease: 'power2.inOut',
			paused: true,
			immediateRender: false,
		} );
		expect( observed[ 0 ] ).toEqual( { rootMargin: '0px 0px -15% 0px' } );
	} );

	it( 'reads duration, ease and the start line', () => {
		const vars = run( {
			'data-sgs-fx-duration': '1.5',
			'data-sgs-fx-ease': 'elastic.out(1,0.5)',
			'data-sgs-fx-morph-start-line': '60',
		} );
		expect( vars ).toMatchObject( { duration: 1.5, ease: 'elastic.out(1,0.5)' } );
		expect( observed[ 0 ].rootMargin ).toBe( '0px 0px -40% 0px' );
	} );

	it( 'passes a custom cubic-bezier as a function', () => {
		expect( typeof run( { 'data-sgs-fx-ease': CUBIC } ).ease ).toBe( 'function' );
	} );

	it( 'names the shape inputs when the render layer produced no target', () => {
		const warn = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const el = mount( {
			'data-sgs-fx-shape': 'plus-cross',
			'data-sgs-fx-shape-asset-from': '7',
			'data-sgs-fx-shape-asset-to': '8',
		} );
		expect( initMorph( el ) ).toBeUndefined();
		const message = warn.mock.calls[ 0 ][ 0 ];
		expect( message ).toContain( 'data-sgs-fx-shape="plus-cross"' );
		expect( message ).toContain( 'data-sgs-fx-shape-asset-from="7"' );
		expect( message ).toContain( 'data-sgs-fx-shape-asset-to="8"' );
		warn.mockRestore();
	} );
} );

describe( 'motion-path', () => {
	const run = ( attrs ) => {
		document.body.insertAdjacentHTML( 'beforeend', '<svg><path id="route" d="M0 0C10 0 10 10 20 10"/></svg>' );
		const el = mount( { 'data-sgs-fx-motion-path-target': '#route', ...attrs } );
		initMotionPath( el );
		return { el, vars: mockGsap.to.mock.calls[ 0 ][ 1 ] };
	};

	it( 'with no attributes keeps today\'s options exactly (negative control)', () => {
		const { el, vars } = run( {} );
		const path = document.getElementById( 'route' );
		expect( vars ).toEqual( {
			motionPath: {
				path,
				align: path,
				alignOrigin: [ 0.5, 0.5 ],
				autoRotate: true,
				start: 0,
				end: 1,
			},
			ease: 'none',
			scrollTrigger: {
				trigger: el,
				start: 'top bottom',
				end: 'bottom top',
				scrub: 1,
				onLeave: expect.any( Function ),
				onEnterBack: expect.any( Function ),
			},
		} );
	} );

	it( 'reads the progress range, origin, rotate, ease, smoothing and range lines', () => {
		const { vars } = run( {
			'data-sgs-fx-motion-path-range-start': '0.2',
			'data-sgs-fx-motion-path-range-end': '0.8',
			'data-sgs-fx-motion-path-origin-x': '0.25',
			'data-sgs-fx-motion-path-origin-y': '0.75',
			'data-sgs-fx-motion-path-rotate': 'false',
			'data-sgs-fx-ease': 'sine.inOut',
			'data-sgs-fx-scrub': '0.5',
			'data-sgs-fx-start': 'top 80%',
			'data-sgs-fx-end': 'bottom 20%',
		} );
		expect( vars.motionPath ).toMatchObject( {
			start: 0.2,
			end: 0.8,
			alignOrigin: [ 0.25, 0.75 ],
			autoRotate: false,
		} );
		expect( vars.ease ).toBe( 'sine.inOut' );
		expect( vars.scrollTrigger ).toMatchObject( {
			start: 'top 80%',
			end: 'bottom 20%',
			scrub: 0.5,
		} );
	} );

	it( 'passes a custom cubic-bezier as a function', () => {
		expect( typeof run( { 'data-sgs-fx-ease': CUBIC } ).vars.ease ).toBe( 'function' );
	} );

	it( 'names the route inputs when the render layer produced no target', () => {
		const warn = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const el = mount( { 'data-sgs-fx-path': 'arc', 'data-sgs-fx-path-asset': '9' } );
		expect( initMotionPath( el ) ).toBeUndefined();
		const message = warn.mock.calls[ 0 ][ 0 ];
		expect( message ).toContain( 'data-sgs-fx-path="arc"' );
		expect( message ).toContain( 'data-sgs-fx-path-asset="9"' );
		warn.mockRestore();
	} );
} );

describe( 'flip', () => {
	jest.useFakeTimers();

	const settle = async ( attrs ) => {
		const el = mount( attrs, '<ul><li>a</li></ul>' );
		Flip.getState.mockReturnValue( { snapshot: true } );
		initFlip( el );
		el.querySelector( 'ul' ).appendChild( document.createElement( 'li' ) );
		await Promise.resolve();
		jest.advanceTimersByTime( 400 );
		return Flip.from.mock.calls[ 0 ][ 1 ];
	};

	it( 'with no attributes keeps today\'s options exactly (negative control)', async () => {
		expect( await settle( {} ) ).toEqual( {
			duration: 0.5,
			ease: 'power2.out',
			stagger: 0.03,
			absolute: true,
			nested: true,
			onComplete: expect.any( Function ),
		} );
	} );

	it( 'reads duration and ease', async () => {
		expect(
			await settle( { 'data-sgs-fx-duration': '0.9', 'data-sgs-fx-ease': 'power3.inOut' } )
		).toMatchObject( { duration: 0.9, ease: 'power3.inOut' } );
	} );

	it( 'passes a custom cubic-bezier as a function', async () => {
		expect( typeof ( await settle( { 'data-sgs-fx-ease': CUBIC } ) ).ease ).toBe( 'function' );
	} );
} );
