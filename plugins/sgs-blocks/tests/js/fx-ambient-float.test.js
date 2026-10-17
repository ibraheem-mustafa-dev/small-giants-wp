/**
 * Ambient float (Spec 38A FR-38A-37): a Web Animations loop built from the computed custom properties and run through
 * the shared loop control. `@sgs/loop-control` is a webpack external with no jest mapping, so it is mapped virtually
 * onto the real source.
 */

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const TABLET = '(max-width: 1023px)';
const MOBILE = '(max-width: 767px)';

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

function mount( { effectToken = 'ambient-float', attrs = '' } = {} ) {
	document.body.innerHTML = `<div class="wp-block-sgs-container"><span data-sgs-fx="${ effectToken }" ${ attrs }></span><a href="#x">link</a></div>`;
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
	require( '../../src/shared/effects/fx-ambient-float' );
}

describe( 'ambient float animation', () => {
	test( 'options come from the computed properties, with the phase as a negative delay', () => {
		props = {
			'--sgs-float-period': '6s',
			'--sgs-float-phase': '1500ms',
			'--sgs-float-easing': 'linear',
			'--sgs-float-direction': 'normal',
			'--sgs-float-travel': '20px',
		};
		const { el } = mount();
		boot();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( options ).toEqual( {
			duration: 6000,
			delay: -1500,
			iterations: Infinity,
			direction: 'normal',
			easing: 'linear',
			fill: 'both',
		} );
		expect( keyframes ).toEqual( [
			{ '--sgs-float-y': '0px' },
			{ '--sgs-float-y': '20px' },
		] );
	} );

	test( 'empty properties fall back to the defaults, axis y', () => {
		const { el } = mount();
		boot();
		const [ keyframes, options ] = el.animate.mock.calls[ 0 ];
		expect( options.duration ).toBe( 4200 );
		expect( options.delay ).toBe( -0 );
		expect( options.easing ).toBe( 'ease-in-out' );
		expect( options.direction ).toBe( 'alternate' );
		expect( keyframes[ 1 ] ).toEqual( { '--sgs-float-y': '12px' } );
	} );

	test( 'axis x animates only the x property', () => {
		const { el } = mount( {
			attrs: 'data-sgs-fx-ambient-float-axis="x"',
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 0 ] ).toEqual( [
			{ '--sgs-float-x': '0px' },
			{ '--sgs-float-x': '12px' },
		] );
	} );

	test( 'axis both builds ONE animation with both properties and a travel-y', () => {
		props = {
			'--sgs-float-travel': '10px',
			'--sgs-float-travel-y': '24px',
		};
		const { el } = mount( {
			attrs: 'data-sgs-fx-ambient-float-axis="both"',
		} );
		boot();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
		expect( el.animate.mock.calls[ 0 ][ 0 ] ).toEqual( [
			{ '--sgs-float-x': '0px', '--sgs-float-y': '0px' },
			{ '--sgs-float-x': '10px', '--sgs-float-y': '24px' },
		] );
	} );

	test( 'axis both with no travel-y uses the travel for y', () => {
		props = { '--sgs-float-travel': '10px' };
		const { el } = mount( {
			attrs: 'data-sgs-fx-ambient-float-axis="both"',
		} );
		boot();
		expect( el.animate.mock.calls[ 0 ][ 0 ][ 1 ] ).toEqual( {
			'--sgs-float-x': '10px',
			'--sgs-float-y': '10px',
		} );
	} );

	test( 'NEGATIVE CONTROL: an element without ambient-float in data-sgs-fx is never animated', () => {
		const { el } = mount( { effectToken: 'sheen magnet' } );
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
		expect( animations ).toHaveLength( 0 );
	} );

	test( 'a token list that includes ambient-float is animated', () => {
		const { el } = mount( { effectToken: 'sheen ambient-float' } );
		boot();
		expect( el.animate ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'pausing', () => {
	test( 'pauses and plays with focus inside the block', () => {
		const { root } = mount();
		boot();
		const [ animation ] = animations;
		root.querySelector( 'a' ).dispatchEvent(
			new FocusEvent( 'focusin', { bubbles: true } )
		);
		expect( animation.pause ).toHaveBeenCalledTimes( 1 );
		root.querySelector( 'a' ).dispatchEvent(
			new FocusEvent( 'focusout', { bubbles: true } )
		);
		expect( animation.play ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'pauses off screen and plays on return', () => {
		const { el } = mount();
		boot();
		const [ animation ] = animations;
		observers[ observers.length - 1 ].report( el, false );
		expect( animation.playState ).toBe( 'paused' );
		expect( el.hasAttribute( 'data-sgs-loop-paused' ) ).toBe( true );
		observers[ observers.length - 1 ].report( el, true );
		expect( animation.playState ).toBe( 'running' );
	} );

	test( 'the pause button pauses and plays', () => {
		const { root } = mount( {
			attrs: 'data-sgs-fx-ambient-float-pause-control="true"',
		} );
		boot();
		const [ animation ] = animations;
		const button = root.querySelector( 'button.sgs-motion-pause' );
		button.click();
		expect( animation.playState ).toBe( 'paused' );
		button.click();
		expect( animation.playState ).toBe( 'running' );
	} );

	test( 'NEGATIVE CONTROL: no button without the pause-control attribute', () => {
		const { root } = mount();
		boot();
		expect( root.querySelector( 'button' ) ).toBeNull();
	} );
} );

describe( 'reduced motion and breakpoints', () => {
	test( 'reduced motion cancels the animation and clearing it rebuilds', () => {
		mount();
		boot();
		const [ first ] = animations;
		reduced = true;
		query( '(prefers-reduced-motion: reduce)' ).fire();
		expect( first.cancel ).toHaveBeenCalled();
		expect( live() ).toHaveLength( 0 );
		reduced = false;
		query( '(prefers-reduced-motion: reduce)' ).fire();
		expect( live() ).toHaveLength( 1 );
	} );

	test( 'does not animate at all when reduced motion is already on', () => {
		reduced = true;
		const { el } = mount();
		boot();
		expect( el.animate ).not.toHaveBeenCalled();
	} );

	test.each( [ TABLET, MOBILE ] )(
		'a change at %s rebuilds with the new period, keeping the phase',
		( breakpoint ) => {
			props = {
				'--sgs-float-period': '6000ms',
				'--sgs-float-phase': '900ms',
			};
			const { el } = mount();
			boot();
			const [ first ] = animations;
			props = {
				'--sgs-float-period': '3000ms',
				'--sgs-float-phase': '900ms',
			};
			query( breakpoint ).fire();
			expect( first.cancel ).toHaveBeenCalled();
			expect( el.animate ).toHaveBeenCalledTimes( 2 );
			expect( live() ).toHaveLength( 1 );
			expect( live()[ 0 ].options.duration ).toBe( 3000 );
			expect( live()[ 0 ].options.delay ).toBe( -900 );
		}
	);

	test( 'a rebuild while paused starts paused', () => {
		const { el } = mount();
		boot();
		observers[ observers.length - 1 ].report( el, false );
		query( TABLET ).fire();
		expect( live()[ 0 ].pause ).toHaveBeenCalled();
	} );
} );

describe( 'parsers', () => {
	test( 'time and length parsing', () => {
		const loop = require( '../../src/shared/effects/loop-control' );
		expect( loop.parseTime( '4200ms', 1 ) ).toBe( 4200 );
		expect( loop.parseTime( ' 4.2s ', 1 ) ).toBe( 4200 );
		expect( loop.parseTime( '', 7 ) ).toBe( 7 );
		expect( loop.parseTime( 'calc(1px)', 7 ) ).toBe( 7 );
		expect( loop.parseLength( '12px', '1px' ) ).toBe( '12px' );
		expect( loop.parseLength( 'url(x)', '1px' ) ).toBe( '1px' );
	} );
} );
