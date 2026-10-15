/**
 * Ken Burns (Spec 38A FR-38A-52): a Web Animations run built from the emitted data attributes and run through the
 * shared loop control. `@sgs/loop-control` is a webpack external with no jest mapping, so it is mapped virtually onto
 * the real source.
 */

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const REDUCED = '(prefers-reduced-motion: reduce)';
const ATTR = 'data-sgs-fx-ken-burns-';

let animations;
let observers;
let queries;
let reduced;
let props;

class FakeObserver {
	constructor( callback ) {
		this.callback = callback;
		observers.push( this );
	}

	observe() {}

	unobserve() {}

	report( el, isIntersecting ) {
		this.callback( [ { target: el, isIntersecting } ] );
	}
}

function fakeAnimation( keyframes, options ) {
	const animation = {
		keyframes,
		options,
		playState: 'running',
		pause: jest.fn( () => {
			animation.playState = 'paused';
		} ),
		play: jest.fn( () => {
			animation.playState = 'running';
		} ),
		cancel: jest.fn( () => {
			animation.playState = 'idle';
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
				return text.includes( 'reduced-motion' ) ? reduced : false;
			},
			addEventListener: ( type, listener ) =>
				q.listeners.push( listener ),
			removeEventListener: ( type, listener ) => {
				q.listeners = q.listeners.filter(
					( item ) => item !== listener
				);
			},
			fire: () =>
				q.listeners.slice().forEach( ( listener ) => listener() ),
		};
		queries[ text ] = q;
	}
	return queries[ text ];
}

function mount( { fxToken = 'ken-burns', attrs = '' } = {} ) {
	document.body.innerHTML = `<div class="wp-block-sgs-container"><div data-sgs-fx="${ fxToken }" ${ attrs }></div><a href="#x">link</a></div>`;
	const root = document.body.firstElementChild;
	const el = root.querySelector( '[data-sgs-fx]' );
	el.animate = jest.fn( fakeAnimation );
	Object.defineProperty( el, 'offsetWidth', { value: 1000 } );
	Object.defineProperty( el, 'offsetHeight', { value: 500 } );
	return { root, el };
}

const live = () => animations.filter( ( a ) => a.playState !== 'idle' );

beforeEach( () => {
	animations = [];
	observers = [];
	queries = {};
	reduced = false;
	props = {};
	window.IntersectionObserver = FakeObserver;
	window.matchMedia = jest.fn( query );
	window.getComputedStyle = jest.fn( () => ( {
		getPropertyValue: ( name ) => props[ name ] || '',
	} ) );
	document.body.innerHTML = '';
} );

function boot() {
	// The module boots on import when the document is ready; run it again against the mounted DOM.
	jest.resetModules();
	return require( '../../src/shared/effects/fx-ken-burns' );
}

const once = ( extra = '' ) =>
	`${ ATTR }mode="zoom-out-once" ${ ATTR }zoom-start="108" ${ ATTR }zoom-end="100" ${ ATTR }duration="20000" ${ extra }`;

describe( 'zoom out once', () => {
	test( 'a zoom from 108% over 20s is one run that holds its last frame', () => {
		const { el } = mount( { attrs: once() } );
		boot();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes ).toEqual( [
			{ '--sgs-kb-s': '1.08' },
			{ '--sgs-kb-s': '1' },
		] );
		expect( options ).toEqual( {
			duration: 20000,
			easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
			fill: 'forwards',
		} );
		expect( options.iterations ).toBeUndefined();
	} );

	test( 'a stored easing is used as written', () => {
		const { el } = mount( {
			attrs: once( `${ ATTR }easing="ease-out"` ),
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 1 ].easing ).toBe( 'ease-out' );
	} );

	test( 'a var() easing is read from the computed custom property', () => {
		props = {
			'--wp--custom--entrance--easing': 'cubic-bezier(0.2, 0, 0, 1)',
		};
		const { el } = mount( {
			attrs: once(
				`${ ATTR }easing="var(--wp--custom--entrance--easing)"`
			),
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 1 ].easing ).toBe(
			'cubic-bezier(0.2, 0, 0, 1)'
		);
	} );

	test( 'a duration in the attribute wins and an unreadable one falls back to 20s', () => {
		const { el } = mount( {
			attrs: `${ ATTR }mode="zoom-out-once" ${ ATTR }duration="12000"`,
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 1 ].duration ).toBe( 12000 );
		const second = mount( {
			attrs: `${ ATTR }mode="zoom-out-once" ${ ATTR }duration="soon"`,
		} );
		boot();
		expect( second.el.animate.mock.calls[ 0 ][ 1 ].duration ).toBe( 20000 );
	} );

	test( 'reduced motion means no animation, and lifting it starts the run', () => {
		reduced = true;
		const { el } = mount( { attrs: once() } );
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
		reduced = false;
		query( REDUCED ).fire();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
		reduced = true;
		query( REDUCED ).fire();
		expect( live() ).toHaveLength( 0 );
	} );

	test( 'it pauses off screen and plays on return, but never restarts a finished run', () => {
		const { el } = mount( { attrs: once() } );
		boot();
		const [ animation ] = animations;
		const observer = observers[ observers.length - 1 ];
		observer.report( el, false );
		expect( animation.playState ).toBe( 'paused' );
		observer.report( el, true );
		expect( animation.playState ).toBe( 'running' );
		animation.playState = 'finished';
		observer.report( el, false );
		// A real finished animation stays finished when paused.
		animation.playState = 'finished';
		observer.report( el, true );
		expect( animation.play ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'the pause button pauses and plays the run', () => {
		const { root } = mount( {
			attrs: once( `${ ATTR }pause-control="true"` ),
		} );
		boot();
		const [ animation ] = animations;
		const button = root.querySelector( 'button.sgs-motion-pause' );
		expect( button ).not.toBeNull();
		button.click();
		expect( animation.playState ).toBe( 'paused' );
		button.click();
		expect( animation.playState ).toBe( 'running' );
	} );

	test( 'NEGATIVE CONTROL: no button without the pause-control attribute', () => {
		const { root } = mount( { attrs: once() } );
		boot();
		expect( root.querySelector( 'button' ) ).toBeNull();
	} );
} );

describe( 'loop', () => {
	test( 'a loop alternates for ever between the start and end zoom', () => {
		const { el } = mount( {
			attrs: `${ ATTR }mode="loop" ${ ATTR }zoom-start="110" ${ ATTR }zoom-end="120" ${ ATTR }duration="20000"`,
		} );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes ).toEqual( [
			{ '--sgs-kb-s': '1.1' },
			{ '--sgs-kb-s': '1.2' },
		] );
		expect( options ).toEqual( {
			duration: 20000,
			delay: -0,
			iterations: Infinity,
			direction: 'alternate',
			easing: 'ease-in-out',
			fill: 'both',
		} );
	} );

	test( 'no mode attribute is a loop with the defaults 108% to 100% over 20s', () => {
		const { el } = mount();
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes ).toEqual( [
			{ '--sgs-kb-s': '1.08' },
			{ '--sgs-kb-s': '1' },
		] );
		expect( options.iterations ).toBe( Infinity );
		expect( options.duration ).toBe( 20000 );
	} );

	test.each( [
		[ 'left', { '--sgs-kb-x': '-20px' } ],
		[ 'right', { '--sgs-kb-x': '20px' } ],
		[ 'up', { '--sgs-kb-y': '-10px' } ],
		[ 'down', { '--sgs-kb-y': '10px' } ],
	] )( 'pan %s moves the end keyframe by 2% of the element', ( dir, end ) => {
		const { el } = mount( {
			attrs: `${ ATTR }zoom-start="110" ${ ATTR }zoom-end="120" ${ ATTR }pan-direction="${ dir }"`,
		} );
		boot();
		const [ from, to ] = el.animate.mock.calls[ 0 ][ 0 ];
		expect( to ).toEqual( { '--sgs-kb-s': '1.2', ...end } );
		expect( from[ Object.keys( end )[ 0 ] ] ).toBe( '0px' );
	} );

	test( 'pan none writes no translate owner', () => {
		const { el } = mount( { attrs: `${ ATTR }pan-direction="none"` } );
		boot();
		const keyframes = el.animate.mock.calls[ 0 ][ 0 ];
		expect( Object.keys( keyframes[ 1 ] ) ).toEqual( [ '--sgs-kb-s' ] );
	} );

	test( 'the pan never exceeds what the zoom leaves spare on a side', () => {
		const { el } = mount( {
			attrs: `${ ATTR }zoom-start="101" ${ ATTR }zoom-end="100" ${ ATTR }pan-direction="right"`,
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 0 ][ 1 ][ '--sgs-kb-x' ] ).toBe(
			'5px'
		);
	} );

	test( 'a zoom outside 100 to 200 falls back to the default', () => {
		const { el } = mount( {
			attrs: `${ ATTR }zoom-start="50" ${ ATTR }zoom-end="900"`,
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 0 ] ).toEqual( [
			{ '--sgs-kb-s': '1.08' },
			{ '--sgs-kb-s': '1' },
		] );
	} );

	test( 'reduced motion means no animation and clearing it rebuilds', () => {
		reduced = true;
		const { el } = mount();
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
		reduced = false;
		query( REDUCED ).fire();
		expect( live() ).toHaveLength( 1 );
	} );

	test( 'the pause button pauses the loop', () => {
		const { root } = mount( { attrs: `${ ATTR }pause-control="true"` } );
		boot();
		const [ animation ] = animations;
		root.querySelector( 'button.sgs-motion-pause' ).click();
		expect( animation.playState ).toBe( 'paused' );
	} );

	test( 'pauses while focus is inside the block', () => {
		const { root } = mount();
		boot();
		const [ animation ] = animations;
		root.querySelector( 'a' ).dispatchEvent(
			new FocusEvent( 'focusin', { bubbles: true } )
		);
		expect( animation.pause ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'selection', () => {
	test( 'NEGATIVE CONTROL: an element without ken-burns in data-sgs-fx is never animated', () => {
		const { el } = mount( {
			fxToken: 'sheen ambient-float',
			attrs: once(),
		} );
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
		expect( animations ).toHaveLength( 0 );
	} );

	test( 'a token list that includes ken-burns is animated', () => {
		const { el } = mount( { fxToken: 'sheen ken-burns' } );
		boot();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'readKenBurns reports the stored values', () => {
		const { el } = mount( {
			attrs: once( `${ ATTR }pan-direction="left"` ),
		} );
		const { readKenBurns } = boot();
		expect( readKenBurns( el ) ).toMatchObject( {
			mode: 'zoom-out-once',
			zoomStart: 1.08,
			zoomEnd: 1,
			panX: -20,
			period: 20000,
		} );
	} );
} );

describe( 'per-device custom properties', () => {
	test( 'computed custom properties beat the attributes for zoom and duration', () => {
		props = {
			'--sgs-kb-zoom-start': '120',
			'--sgs-kb-zoom-end': '110',
			'--sgs-kb-duration': '8s',
		};
		const { el } = mount( {
			attrs: `${ ATTR }mode="loop" ${ ATTR }zoom-start="108" ${ ATTR }zoom-end="100" ${ ATTR }duration="20000"`,
		} );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes ).toEqual( [
			{ '--sgs-kb-s': '1.2' },
			{ '--sgs-kb-s': '1.1' },
		] );
		expect( options.duration ).toBe( 8000 );
	} );

	test( 'an empty or out-of-range custom property falls back to the attribute', () => {
		props = { '--sgs-kb-zoom-start': '900', '--sgs-kb-duration': 'soon' };
		const { el } = mount( {
			attrs: `${ ATTR }zoom-start="110" ${ ATTR }zoom-end="100" ${ ATTR }duration="12000"`,
		} );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes[ 0 ] ).toEqual( { '--sgs-kb-s': '1.1' } );
		expect( options.duration ).toBe( 12000 );
	} );

	test( 'a tier change rebuilds the loop with the new value', () => {
		const { el } = mount( {
			attrs: `${ ATTR }zoom-start="108" ${ ATTR }zoom-end="100" ${ ATTR }duration="20000"`,
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 1 ].duration ).toBe( 20000 );
		props = { '--sgs-kb-duration': '10000ms', '--sgs-kb-zoom-start': '115' };
		query( '(max-width: 1023px)' ).fire();
		expect( el.animate ).toHaveBeenCalledTimes( 2 );
		const [ keyframes, options ] = el.animate.mock.calls[ 1 ];
		expect( options.duration ).toBe( 10000 );
		expect( keyframes[ 0 ] ).toEqual( { '--sgs-kb-s': '1.15' } );
	} );
} );
