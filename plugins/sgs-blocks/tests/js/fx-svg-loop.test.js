/**
 * SVG loop (Spec 38A FR-38A-52): a Web Animations loop built from the emitted data attributes and run through the
 * shared loop control. `@sgs/loop-control` is a webpack external with no jest mapping, so it is mapped virtually onto
 * the real source.
 */

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const REDUCED = '(prefers-reduced-motion: reduce)';
const ATTR = 'data-sgs-fx-svg-loop-';

let animations;
let observers;
let queries;
let reduced;

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

function mount( { fxToken = 'svg-loop', attrs = '' } = {} ) {
	document.body.innerHTML = `<div class="wp-block-sgs-container"><div data-sgs-fx="${ fxToken }" ${ attrs }></div><a href="#x">link</a></div>`;
	const root = document.body.firstElementChild;
	const el = root.querySelector( '[data-sgs-fx]' );
	el.animate = jest.fn( fakeAnimation );
	return { root, el };
}

const live = () => animations.filter( ( a ) => a.playState !== 'idle' );

beforeEach( () => {
	animations = [];
	observers = [];
	queries = {};
	reduced = false;
	window.IntersectionObserver = FakeObserver;
	window.matchMedia = jest.fn( query );
	window.getComputedStyle = jest.fn( () => ( {
		getPropertyValue: () => '',
	} ) );
	document.body.innerHTML = '';
} );

function boot() {
	// The module boots on import when the document is ready; run it again against the mounted DOM.
	jest.resetModules();
	return require( '../../src/shared/effects/fx-svg-loop' );
}

describe( 'pulse', () => {
	test( 'the default pulse dips opacity 1 to 0.5 over 3s, easing ease between keyframes', () => {
		const { el } = mount( { attrs: `${ ATTR }motion="pulse"` } );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes ).toEqual( [
			{ '--sgs-svl-op': '1', easing: 'ease' },
			{ '--sgs-svl-op': '0.5', easing: 'ease' },
			{ '--sgs-svl-op': '1' },
		] );
		expect( options ).toEqual( {
			duration: 3000,
			delay: -0,
			iterations: Infinity,
			direction: 'normal',
			easing: 'linear',
			fill: 'both',
		} );
	} );

	test( 'a stored duration and amplitude are played', () => {
		const { el } = mount( {
			attrs: `${ ATTR }motion="pulse" ${ ATTR }duration="1500" ${ ATTR }amplitude="1.6"`,
		} );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( options.duration ).toBe( 1500 );
		expect( keyframes[ 1 ][ '--sgs-svl-op' ] ).toBe( '0.2' );
	} );

	test( 'a large amplitude never takes opacity below 0', () => {
		const { el } = mount( {
			attrs: `${ ATTR }motion="pulse" ${ ATTR }amplitude="5"`,
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 0 ][ 1 ][ '--sgs-svl-op' ] ).toBe(
			'0'
		);
	} );

	test( 'an unknown motion is a pulse and an out-of-range amplitude is 1', () => {
		const { el } = mount( {
			attrs: `${ ATTR }motion="spin" ${ ATTR }amplitude="9"`,
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 0 ][ 1 ] ).toEqual( {
			'--sgs-svl-op': '0.5',
			easing: 'ease',
		} );
	} );
} );

describe( 'wave', () => {
	test( 'the default wave swells to 1.05 and rocks one degree each way over 5s', () => {
		const { el } = mount( { attrs: `${ ATTR }motion="wave"` } );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		const easing = 'ease-in-out';
		expect( keyframes ).toEqual( [
			{ '--sgs-svl-s': '1', '--sgs-svl-rot': '0deg', easing },
			{ '--sgs-svl-s': '1.05', '--sgs-svl-rot': '1deg', easing },
			{ '--sgs-svl-s': '1', '--sgs-svl-rot': '0deg', easing },
			{ '--sgs-svl-s': '1.05', '--sgs-svl-rot': '-1deg', easing },
			{ '--sgs-svl-s': '1', '--sgs-svl-rot': '0deg' },
		] );
		expect( options.duration ).toBe( 5000 );
		expect( options.iterations ).toBe( Infinity );
	} );

	test( 'amplitude scales the swell and the rock together', () => {
		const { el } = mount( {
			attrs: `${ ATTR }motion="wave" ${ ATTR }amplitude="2" ${ ATTR }duration="8000"`,
		} );
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( keyframes[ 1 ] ).toMatchObject( {
			'--sgs-svl-s': '1.1',
			'--sgs-svl-rot': '2deg',
		} );
		expect( keyframes[ 3 ][ '--sgs-svl-rot' ] ).toBe( '-2deg' );
		expect( options.duration ).toBe( 8000 );
	} );
} );

describe( 'pausing and reduced motion', () => {
	test( 'reduced motion means no animation, and clearing it rebuilds', () => {
		reduced = true;
		const { el } = mount();
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
		reduced = false;
		query( REDUCED ).fire();
		expect( live() ).toHaveLength( 1 );
		reduced = true;
		query( REDUCED ).fire();
		expect( live() ).toHaveLength( 0 );
	} );

	test( 'the pause button pauses and plays when pauseControl is true', () => {
		const { root } = mount( { attrs: `${ ATTR }pause-control="true"` } );
		boot();
		const button = root.querySelector( 'button.sgs-motion-pause' );
		expect( button ).not.toBeNull();
		button.click();
		expect( animations[ 0 ].playState ).toBe( 'paused' );
		button.click();
		expect( animations[ 0 ].playState ).toBe( 'running' );
	} );

	test( 'NEGATIVE CONTROL: no button without the pause-control attribute', () => {
		const { root } = mount();
		boot();
		expect( root.querySelector( 'button' ) ).toBeNull();
	} );

	test( 'pauses off screen', () => {
		const { el } = mount();
		boot();
		observers[ observers.length - 1 ].report( el, false );
		expect( animations[ 0 ].playState ).toBe( 'paused' );
	} );
} );

describe( 'selection', () => {
	test( 'NEGATIVE CONTROL: an element without svg-loop in data-sgs-fx is never animated', () => {
		const { el } = mount( {
			fxToken: 'ken-burns ambient-float',
			attrs: `${ ATTR }motion="pulse"`,
		} );
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
		expect( animations ).toHaveLength( 0 );
	} );

	test( 'a token list that includes svg-loop is animated', () => {
		const { el } = mount( { fxToken: 'sheen svg-loop' } );
		boot();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
	} );
} );
