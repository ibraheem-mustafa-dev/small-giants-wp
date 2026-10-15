/**
 * Tier G scroll-family parameters (Spec 38A, FR-38A-22, unit M5.16a).
 *
 * Each parameter of scrub, pin-scrub, image-sequence and draggable reaches the
 * GSAP / ScrollTrigger / InertiaPlugin call it configures, and an element with
 * no parameter attributes gets the options these runtimes shipped with.
 *
 * GSAP is replaced by a recording double; `@sgs/motion-provider` is the real
 * provider (its `resolveEase`, `resolveStart`, `resolveTrigger`) with the
 * matchMedia wrapper and the boot call replaced so each effect's init runs at
 * once against the double.
 */

jest.mock(
	'@sgs/motion-provider',
	() => {
		const gsapDouble = {
			defaults: jest.fn(),
			registerPlugin: jest.fn(),
			fromTo: jest.fn(),
			to: jest.fn(),
			timelines: [],
			timeline: jest.fn(),
			ticker: { add: jest.fn(), remove: jest.fn() },
		};
		const tween = () => ( {
			progress: jest.fn( () => 0 ),
			kill: jest.fn(),
			scrollTrigger: { kill: jest.fn() },
		} );
		gsapDouble.fromTo.mockImplementation( tween );
		gsapDouble.to.mockImplementation( tween );
		gsapDouble.timeline.mockImplementation( ( config ) => {
			const timeline = {
				...tween(),
				config,
				fromTo: jest.fn(),
				to: jest.fn(),
				duration: jest.fn( () => 1 ),
			};
			gsapDouble.timelines.push( timeline );
			return timeline;
		} );
		const actual = jest.requireActual(
			'../../src/shared/effects/gsap/provider.js'
		);
		return {
			...actual,
			__gsap: gsapDouble,
			tierG: jest.fn(),
			bootEffect: jest.fn(),
			withMotionAllowed: ( setup ) => setup( gsapDouble ),
		};
	},
	{ virtual: true }
);
jest.mock( 'gsap', () => ( {
	gsap: { defaults: jest.fn(), registerPlugin: jest.fn() },
} ) );
jest.mock( '../../src/shared/effects/motion-utils.js', () => ( {
	chromeOffsetPx: () => 0,
} ) );
jest.mock( 'gsap/ScrollTrigger', () => ( {
	ScrollTrigger: { create: jest.fn( () => ( { kill: jest.fn() } ) ) },
} ) );
jest.mock( 'gsap/InertiaPlugin', () => ( {
	InertiaPlugin: {
		track: jest.fn(),
		untrack: jest.fn(),
		getVelocity: jest.fn( () => 500 ),
	},
} ) );

const { __gsap: gsap } = require( '@sgs/motion-provider' );
const { ScrollTrigger } = require( 'gsap/ScrollTrigger' );
const { initScrub } = require( '../../src/shared/effects/gsap/fx-scrub.js' );
const {
	initPinScrub,
} = require( '../../src/shared/effects/gsap/fx-pin-scrub.js' );
const {
	initImageSequence,
} = require( '../../src/shared/effects/gsap/fx-image-sequence.js' );
const {
	initDraggable,
} = require( '../../src/shared/effects/gsap/fx-draggable.js' );

/**
 * A detached element carrying data attributes.
 *
 * @param {Object<string, string>} attrs Attribute name to value.
 * @param {string}                 tag   Tag name.
 * @return {HTMLElement} The element.
 */
function make( attrs = {}, tag = 'div' ) {
	const el = document.createElement( tag );
	Object.entries( attrs ).forEach( ( [ name, value ] ) =>
		el.setAttribute( name, value )
	);
	return el;
}

beforeEach( () => {
	jest.clearAllMocks();
	gsap.timelines.length = 0;
} );

describe( 'scrub', () => {
	test( 'no attributes: today\'s tween, range, smoothing and ease', () => {
		initScrub( make( { 'data-sgs-fx': 'scrub' } ) );
		const [ , from, to ] = [ null, ...gsap.fromTo.mock.calls[ 0 ].slice( 1 ) ];
		expect( from ).toEqual( { opacity: 0, y: 40 } );
		expect( to ).toEqual( {
			opacity: 1,
			y: 0,
			ease: 'none',
			scrollTrigger: expect.objectContaining( {
				start: 'top 85%',
				end: 'top 40%',
				scrub: 1,
			} ),
		} );
	} );

	test( 'a scale row and a blur row both tween', () => {
		const rows = [
			{ property: 'scale', from: 0.8, to: 1 },
			{ property: 'blur', from: 12, to: 0 },
		];
		initScrub(
			make( {
				'data-sgs-fx': 'scrub',
				'data-sgs-fx-scrub-rows': JSON.stringify( rows ),
			} )
		);
		const [ , from, to ] = gsap.fromTo.mock.calls[ 0 ];
		expect( from ).toEqual( { scale: 0.8, filter: 'blur(12px)' } );
		expect( to ).toEqual(
			expect.objectContaining( { scale: 1, filter: 'blur(0px)' } )
		);
		expect( to ).not.toHaveProperty( 'opacity' );
	} );

	test( 'other row properties map to their GSAP properties', () => {
		const rows = [
			{ property: 'x', from: '10%', to: 0 },
			{ property: 'rotate', from: '0.5turn', to: 0 },
			{ property: 'clip', from: 100, to: 0 },
			{ property: 'backgroundPosition', from: 0, to: 100 },
			{ property: 'colour', from: '#ff0000', to: '#00ff00' },
			{ property: 'opacity', from: 'not-a-number', to: 1 },
		];
		initScrub(
			make( {
				'data-sgs-fx': 'scrub',
				'data-sgs-fx-scrub-rows': JSON.stringify( rows ),
			} )
		);
		const [ , from, to ] = gsap.fromTo.mock.calls[ 0 ];
		expect( from ).toEqual( {
			x: '10%',
			rotation: 180,
			clipPath: 'inset(100%)',
			backgroundPositionY: '0%',
			color: '#ff0000',
		} );
		expect( to ).toEqual(
			expect.objectContaining( {
				x: 0,
				rotation: 0,
				clipPath: 'inset(0%)',
				backgroundPositionY: '100%',
				color: '#00ff00',
			} )
		);
		expect( to ).not.toHaveProperty( 'opacity' );
	} );

	test( 'start, end, smoothing and a custom curve reach the trigger and tween', () => {
		initScrub(
			make( {
				'data-sgs-fx': 'scrub',
				'data-sgs-fx-start': 'center 60%',
				'data-sgs-fx-end': 'bottom top',
				'data-sgs-fx-scrub': '0.5',
				'data-sgs-fx-ease': 'cubic-bezier(0.16,1,0.3,1)',
			} )
		);
		const [ , , to ] = gsap.fromTo.mock.calls[ 0 ];
		expect( to.scrollTrigger ).toEqual(
			expect.objectContaining( {
				start: 'center 60%',
				end: 'bottom top',
				scrub: 0.5,
			} )
		);
		expect( typeof to.ease ).toBe( 'function' );
		expect( to.ease( 0 ) ).toBeCloseTo( 0, 3 );
		expect( to.ease( 1 ) ).toBeCloseTo( 1, 3 );
	} );

	test( 'a smoothing of 0 locks the scrub to the scrollbar', () => {
		initScrub( make( { 'data-sgs-fx': 'scrub', 'data-sgs-fx-scrub': '0' } ) );
		expect( gsap.fromTo.mock.calls[ 0 ][ 2 ].scrollTrigger.scrub ).toBe(
			true
		);
	} );

	test( 'a played (load) scrub uses the rows and the resolved curve', () => {
		initScrub(
			make( {
				'data-sgs-fx': 'scrub',
				'data-sgs-fx-trigger': 'load',
				'data-sgs-fx-scrub-rows': JSON.stringify( [
					{ property: 'scale', from: 0.5, to: 1 },
				] ),
				'data-sgs-fx-ease': 'cubic-bezier(0.16,1,0.3,1)',
			} )
		);
		const [ , from, to ] = gsap.fromTo.mock.calls[ 0 ];
		expect( from ).toEqual( { scale: 0.5 } );
		expect( to.scale ).toBe( 1 );
		expect( typeof to.ease ).toBe( 'function' );
	} );
} );

describe( 'distance tokens in rows', () => {
	afterEach( () => {
		document.documentElement.removeAttribute( 'style' );
		jest.restoreAllMocks();
	} );

	/**
	 * Run a scrub whose x row carries a token and return its from x.
	 *
	 * @param {string} token The row's from value.
	 * @return {Object} The fromTo from-variables.
	 */
	function fromOf( token ) {
		initScrub(
			make( {
				'data-sgs-fx': 'scrub',
				'data-sgs-fx-scrub-rows': JSON.stringify( [
					{ property: 'x', from: token, to: 0 },
					{ property: 'opacity', from: 0, to: 1 },
				] ),
			} )
		);
		return gsap.fromTo.mock.calls[ 0 ][ 1 ];
	}

	test( 'a token resolves to pixels, rem by the root font size', () => {
		document.documentElement.style.setProperty(
			'--wp--custom--distance--sm',
			'2rem'
		);
		jest.spyOn( window, 'getComputedStyle' ).mockImplementation(
			( node ) => ( {
				getPropertyValue: ( name ) =>
					node.style.getPropertyValue( name ),
				fontSize: '16px',
			} )
		);
		expect( fromOf( 'token:distance.sm' ) ).toEqual( { x: 32, opacity: 0 } );
	} );

	test( 'a negated token resolves negative', () => {
		document.documentElement.style.setProperty(
			'--wp--custom--distance--md',
			'24px'
		);
		jest.spyOn( window, 'getComputedStyle' ).mockImplementation(
			( node ) => ( {
				getPropertyValue: ( name ) =>
					node.style.getPropertyValue( name ),
				fontSize: '16px',
			} )
		);
		expect( fromOf( '-token:distance.md' ) ).toEqual( {
			x: -24,
			opacity: 0,
		} );
	} );

	test( 'an unknown token drops its row and keeps the others', () => {
		jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const from = fromOf( 'token:distance.nope' );
		expect( from ).toEqual( { opacity: 0 } );
	} );
} );

describe( 'pin-scrub', () => {
	/**
	 * A pinned section with two laid-out children.
	 *
	 * @param {Object<string, string>} attrs Attributes on the section.
	 * @return {HTMLElement} The section.
	 */
	function section( attrs = {} ) {
		const el = make( { 'data-sgs-fx': 'pin-scrub', ...attrs } );
		for ( let i = 0; i < 2; i++ ) {
			const child = make();
			Object.defineProperty( child, 'offsetWidth', { value: 100 } );
			el.appendChild( child );
		}
		document.body.appendChild( el );
		return el;
	}

	test( 'no attributes: today\'s pin, stagger, hold and presets', () => {
		initPinScrub( section() );
		const timeline = gsap.timelines[ 0 ];
		const trigger = timeline.config.scrollTrigger;
		expect( trigger.end ).toBe( '+=100%' );
		expect( trigger.pin ).toBe( true );
		expect( trigger.scrub ).toBe( 1 );
		expect( trigger.start() ).toBe( 'top top' );
		expect( timeline.fromTo.mock.calls ).toEqual( [
			[
				expect.anything(),
				{ opacity: 0, y: 40 },
				{ opacity: 1, y: 0 },
				0,
			],
			[
				expect.anything(),
				{ opacity: 0, y: 40 },
				{ opacity: 1, y: 0 },
				0.15,
			],
		] );
		// The standard hold (0.33): 1 * 0.33 / 0.67 of trailing dead time.
		expect( timeline.to ).toHaveBeenCalledWith(
			{},
			{ duration: expect.closeTo( 0.33 / 0.67, 5 ) }
		);
	} );

	test( 'rows, stagger, hold, pin top offset, smoothing and pin length reach the config', () => {
		initPinScrub(
			section( {
				'data-sgs-fx-pin-scrub-rows': JSON.stringify( [
					{ property: 'scale', from: 0.9, to: 1 },
					{ property: 'blur', from: 6, to: 0 },
				] ),
				'data-sgs-fx-stagger': '0.4',
				'data-sgs-fx-hold': '0.5',
				'data-sgs-fx-pin-scrub-pin-top-offset': '96px',
				'data-sgs-fx-scrub': '0.7',
				'data-sgs-fx-end': '+=250%',
			} )
		);
		const timeline = gsap.timelines[ 0 ];
		const trigger = timeline.config.scrollTrigger;
		expect( trigger.end ).toBe( '+=250%' );
		expect( trigger.scrub ).toBe( 0.7 );
		expect( trigger.start() ).toBe( 'top top+=96' );
		expect( timeline.fromTo.mock.calls.map( ( call ) => call[ 3 ] ) ).toEqual(
			[ 0, 0.4 ]
		);
		expect( timeline.fromTo.mock.calls[ 0 ][ 1 ] ).toEqual( {
			scale: 0.9,
			filter: 'blur(6px)',
		} );
		expect( timeline.fromTo.mock.calls[ 0 ][ 2 ] ).toEqual( {
			scale: 1,
			filter: 'blur(0px)',
		} );
		// Hold 0.5: the tail equals the children's duration (1).
		expect( timeline.to ).toHaveBeenCalledWith( {}, { duration: 1 } );
	} );

	test( 'a negative pin top offset and a named hold step', () => {
		initPinScrub(
			section( {
				'data-sgs-fx-pin-scrub-pin-top-offset': '-20',
				'data-sgs-fx-hold': 'none',
			} )
		);
		const timeline = gsap.timelines[ 0 ];
		expect( timeline.config.scrollTrigger.start() ).toBe( 'top top-=20' );
		expect( timeline.to ).not.toHaveBeenCalled();
	} );

	test( 'an authored start wins over the pin top offset', () => {
		initPinScrub(
			section( {
				'data-sgs-fx-start': 'top 10%',
				'data-sgs-fx-pin-scrub-pin-top-offset': '96',
			} )
		);
		expect( gsap.timelines[ 0 ].config.scrollTrigger.start() ).toBe(
			'top 10%'
		);
	} );
} );

describe( 'per-device scroll parameters', () => {
	afterEach( () => {
		delete window.matchMedia;
	} );

	test( 'a scrub custom property beats the attribute', () => {
		const el = make( {
			'data-sgs-fx': 'scrub',
			'data-sgs-fx-start': 'top 85%',
			'data-sgs-fx-end': 'top 40%',
			'data-sgs-fx-scrub': '2',
		} );
		el.style.setProperty( '--sgs-scrub-start', 'top 60%' );
		el.style.setProperty( '--sgs-scrub-end', 'bottom 10%' );
		el.style.setProperty( '--sgs-scrub-smoothing', '500ms' );
		document.body.appendChild( el );
		initScrub( el );
		expect( gsap.fromTo.mock.calls[ 0 ][ 2 ].scrollTrigger ).toEqual(
			expect.objectContaining( {
				start: 'top 60%',
				end: 'bottom 10%',
				scrub: 0.5,
			} )
		);
	} );

	test( 'a pin-scrub custom property beats the attribute', () => {
		const el = make( {
			'data-sgs-fx': 'pin-scrub',
			'data-sgs-fx-start': 'top 10%',
			'data-sgs-fx-end': '+=100%',
			'data-sgs-fx-scrub': '2',
			'data-sgs-fx-hold': 'none',
		} );
		el.style.setProperty( '--sgs-pin-scrub-start', 'top top+=40' );
		el.style.setProperty( '--sgs-pin-scrub-end', '+=300%' );
		el.style.setProperty( '--sgs-pin-scrub-smoothing', '0.25' );
		el.style.setProperty( '--sgs-pin-scrub-hold', '0.5' );
		const child = make();
		Object.defineProperty( child, 'offsetWidth', { value: 100 } );
		el.appendChild( child );
		document.body.appendChild( el );
		initPinScrub( el );
		const timeline = gsap.timelines[ 0 ];
		const trigger = timeline.config.scrollTrigger;
		expect( trigger.start() ).toBe( 'top top+=40' );
		expect( trigger.end ).toBe( '+=300%' );
		expect( trigger.scrub ).toBe( 0.25 );
		expect( timeline.to ).toHaveBeenCalledWith( {}, { duration: 1 } );
	} );

	test( 'a pin-scrub stagger custom property beats the attribute', () => {
		const el = make( {
			'data-sgs-fx': 'pin-scrub',
			'data-sgs-fx-stagger': '0.4',
		} );
		el.style.setProperty( '--sgs-pin-scrub-stagger', '0.25' );
		for ( let i = 0; i < 2; i++ ) {
			const child = make();
			Object.defineProperty( child, 'offsetWidth', { value: 100 } );
			el.appendChild( child );
		}
		document.body.appendChild( el );
		initPinScrub( el );
		expect(
			gsap.timelines[ 0 ].fromTo.mock.calls.map( ( call ) => call[ 3 ] )
		).toEqual( [ 0, 0.25 ] );
	} );

	test( 'a pin-scrub pin top offset custom property beats the attribute', () => {
		const el = make( {
			'data-sgs-fx': 'pin-scrub',
			'data-sgs-fx-pin-scrub-pin-top-offset': '96px',
		} );
		el.style.setProperty( '--sgs-pin-scrub-pin-top-offset', '40px' );
		const child = make();
		Object.defineProperty( child, 'offsetWidth', { value: 100 } );
		el.appendChild( child );
		document.body.appendChild( el );
		initPinScrub( el );
		expect( gsap.timelines[ 0 ].config.scrollTrigger.start() ).toBe(
			'top top+=40'
		);
	} );

	test( 'a numeric hold of 0.25 reaches the timeline, above 0.6 is clamped', () => {
		const run = ( hold ) => {
			gsap.timelines.length = 0;
			const el = make( {
				'data-sgs-fx': 'pin-scrub',
				'data-sgs-fx-hold': hold,
			} );
			const child = make();
			Object.defineProperty( child, 'offsetWidth', { value: 100 } );
			el.appendChild( child );
			document.body.appendChild( el );
			initPinScrub( el );
			return gsap.timelines[ 0 ].to.mock.calls[ 0 ][ 1 ].duration;
		};
		expect( run( '0.25' ) ).toBeCloseTo( 0.25 / 0.75, 5 );
		expect( run( '0.9' ) ).toBeCloseTo( 0.6 / 0.4, 5 );
	} );

	test( 'a tier change rebuilds with the new start and kills the old trigger', () => {
		const listeners = [];
		let narrow = false;
		window.matchMedia = jest.fn( () => ( {
			get matches() {
				return narrow;
			},
			addEventListener: ( type, fn ) => listeners.push( fn ),
			removeEventListener: jest.fn(),
		} ) );
		const el = make( { 'data-sgs-fx': 'scrub' } );
		el.style.setProperty( '--sgs-scrub-start', 'top 85%' );
		document.body.appendChild( el );
		initScrub( el );
		expect( gsap.fromTo ).toHaveBeenCalledTimes( 1 );
		const first = gsap.fromTo.mock.results[ 0 ].value;

		el.style.setProperty( '--sgs-scrub-start', 'top 50%' );
		narrow = true;
		listeners.forEach( ( fn ) => fn() );

		expect( first.scrollTrigger.kill ).toHaveBeenCalledTimes( 1 );
		expect( first.kill ).toHaveBeenCalledTimes( 1 );
		expect( gsap.fromTo ).toHaveBeenCalledTimes( 2 );
		expect(
			gsap.fromTo.mock.calls[ 1 ][ 2 ].scrollTrigger.start
		).toBe( 'top 50%' );
	} );
} );

describe( 'image-sequence', () => {
	/**
	 * A canvas with a frame config and a 2D context.
	 *
	 * @param {Object<string, string>} attrs Attributes on the canvas.
	 * @return {HTMLCanvasElement} The canvas.
	 */
	function canvas( attrs = {} ) {
		const el = make(
			{
				'data-sgs-fx': 'image-sequence',
				'data-sgs-image-sequence-frames': JSON.stringify( {
					desktop: { count: 10, base: '/frames' },
				} ),
				...attrs,
			},
			'canvas'
		);
		el.getContext = jest.fn( () => ( {} ) );
		const wrapper = make( { class: 'sgs-image-sequence' } );
		wrapper.appendChild( el );
		document.body.appendChild( wrapper );
		return el;
	}

	beforeAll( () => {
		window.IntersectionObserver = class {
			observe() {}
			disconnect() {}
		};
	} );

	test( 'no attributes: a computed window, no pin', () => {
		initImageSequence( canvas() );
		const config = ScrollTrigger.create.mock.calls[ 0 ][ 0 ];
		expect( typeof config.start ).toBe( 'function' );
		expect( typeof config.end ).toBe( 'function' );
		expect( config.pin ).toBe( false );
		expect( config.pinSpacing ).toBe( false );
		expect( config.scrub ).toBe( 1 );
	} );

	test( 'start, end and pin reach the trigger', () => {
		initImageSequence(
			canvas( {
				'data-sgs-fx-start': 'top 70%',
				'data-sgs-fx-end': 'bottom 20%',
				'data-sgs-fx-pin': 'true',
			} )
		);
		const config = ScrollTrigger.create.mock.calls[ 0 ][ 0 ];
		expect( config.start() ).toBe( 'top 70%' );
		expect( config.end() ).toBe( 'bottom 20%' );
		expect( config.pin ).toBe( true );
		expect( config.pinSpacing ).toBe( true );
		expect( config.invalidateOnRefresh ).toBe( true );
	} );
} );

describe( 'draggable', () => {
	const { InertiaPlugin } = require( 'gsap/InertiaPlugin' );

	/**
	 * A horizontally overflowing scroller on a fine-pointer device.
	 *
	 * @param {Object<string, string>} attrs Attributes on the scroller.
	 * @return {HTMLElement} The scroller.
	 */
	function scroller( attrs = {} ) {
		window.matchMedia = jest.fn( ( query ) => ( {
			matches: '(pointer: fine)' === query,
			addEventListener() {},
			removeEventListener() {},
		} ) );
		const el = make( { 'data-sgs-fx': 'draggable', ...attrs } );
		el.style.overflowX = 'auto';
		Object.defineProperty( el, 'scrollWidth', { value: 2000 } );
		Object.defineProperty( el, 'clientWidth', { value: 500 } );
		el.setPointerCapture = jest.fn();
		document.body.appendChild( el );
		return el;
	}

	/**
	 * Press, move and release the primary pointer.
	 *
	 * @param {HTMLElement} el    The scroller.
	 * @param {number}      delta Pointer travel (px) to the left.
	 */
	function drag( el, delta ) {
		const fire = ( type, clientX ) => {
			const event = new MouseEvent( type, {
				bubbles: true,
				cancelable: true,
				button: 0,
				clientX,
			} );
			Object.defineProperty( event, 'pointerId', { value: 1 } );
			el.dispatchEvent( event );
		};
		fire( 'pointerdown', 200 );
		fire( 'pointermove', 200 - delta );
		fire( 'pointerup', 200 - delta );
	}

	test( 'no attributes: threshold 4, inertia without a resistance', () => {
		const el = scroller();
		initDraggable( el );
		drag( el, 3 );
		expect( el.scrollLeft ).toBe( 0 );
		expect( gsap.to ).not.toHaveBeenCalled();
		drag( el, 10 );
		expect( gsap.to ).toHaveBeenCalledTimes( 1 );
		const [ , vars ] = gsap.to.mock.calls[ 0 ];
		expect( Object.keys( vars.inertia ) ).toEqual( [ 'x' ] );
		expect( InertiaPlugin.track ).toHaveBeenCalled();
	} );

	test( 'threshold keeps a short gesture a click', () => {
		const el = scroller( { 'data-sgs-fx-draggable-threshold': '30px' } );
		initDraggable( el );
		drag( el, 20 );
		expect( gsap.to ).not.toHaveBeenCalled();
		drag( el, 40 );
		expect( gsap.to ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'resistance reaches the inertia options', () => {
		const el = scroller( { 'data-sgs-fx-draggable-resistance': '0.5' } );
		initDraggable( el );
		drag( el, 40 );
		expect( gsap.to.mock.calls[ 0 ][ 1 ].inertia.resistance ).toBeCloseTo(
			100,
			5
		);
	} );

	test( 'resistance 1 is stronger than 0', () => {
		const strong = scroller( { 'data-sgs-fx-draggable-resistance': '1' } );
		initDraggable( strong );
		drag( strong, 40 );
		const weak = scroller( { 'data-sgs-fx-draggable-resistance': '0' } );
		initDraggable( weak );
		drag( weak, 40 );
		expect( gsap.to.mock.calls[ 0 ][ 1 ].inertia.resistance ).toBeGreaterThan(
			gsap.to.mock.calls[ 1 ][ 1 ].inertia.resistance
		);
	} );

	test( 'momentum off builds no inertia tween', () => {
		const el = scroller( { 'data-sgs-fx-momentum': 'false' } );
		initDraggable( el );
		drag( el, 40 );
		expect( gsap.to ).not.toHaveBeenCalled();
		expect( InertiaPlugin.track ).not.toHaveBeenCalled();
	} );
} );
