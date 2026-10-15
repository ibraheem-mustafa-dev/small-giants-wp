/**
 * Multi-keyframe entrances on WAAPI (Spec 38A FR-38A-20): animate() receives the stored keyframes on the
 * --sgs-me-* properties, the stored delay and fill 'backwards'; reduced motion plays nothing; the channel
 * formulas match assets/css/motion.css. A `state` entrance replays each time its state token is added on the target
 * or an ancestor, so two pulses of an identical state play twice (Spec 38A FR-38A-53, plan unit M5.17).
 *
 * SGS_TEST_KEYFRAMES_JS points the suite at another copy of the module: run against the file before the replay was
 * added, the replay cases fail (the negative control for the replay itself).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const KEYFRAMES = [
	{ offset: 0, '--sgs-me-ty': '40px', '--sgs-me-op': '0' },
	{ offset: 0.6, '--sgs-me-ty': '-8px', '--sgs-me-op': '1' },
	{ offset: 1, '--sgs-me-ty': '0px', '--sgs-me-op': '1' },
];

let animate;
let reduced;

function load() {
	jest.resetModules();
	return require( process.env.SGS_TEST_KEYFRAMES_JS || '../../assets/js/motion-keyframes.js' );
}

function target( attrs ) {
	const el = document.createElement( 'div' );
	el.setAttribute( 'data-sgs-me', attrs.me || 'load translate opacity' );
	el.setAttribute( 'data-sgs-me-keyframes', JSON.stringify( attrs.frames || KEYFRAMES ) );
	document.body.appendChild( el );
	return el;
}

beforeEach( () => {
	document.head.innerHTML = '<style>[data-sgs-me] { --sgs-me-delay: 120ms; --sgs-me-dur: 0.9s; --sgs-me-ease: ease-in; }</style>';
	document.body.innerHTML = '';
	reduced = false;
	animate = jest.fn( () => ( { cancel: jest.fn() } ) );
	Element.prototype.animate = animate;
	global.matchMedia = jest.fn( ( q ) => ( { matches: reduced && '(prefers-reduced-motion: reduce)' === q } ) );
} );

describe( 'motion-keyframes', () => {
	it( 'plays the three keyframes on --sgs-me-* with the stored delay and fill backwards', () => {
		const { play } = load();
		play( target( {} ) );
		expect( animate ).toHaveBeenCalledTimes( 1 );
		const [ frames, options ] = animate.mock.calls[ 0 ];
		expect( frames ).toHaveLength( 3 );
		expect( frames.map( ( f ) => f.offset ) ).toEqual( [ 0, 0.6, 1 ] );
		expect( frames.map( ( f ) => f[ '--sgs-me-ty' ] ) ).toEqual( [ '40px', '-8px', '0px' ] );
		expect( frames.map( ( f ) => f[ '--sgs-me-op' ] ) ).toEqual( [ '0', '1', '1' ] );
		expect( options ).toEqual( { duration: 900, delay: 120, easing: 'ease-in', fill: 'backwards' } );
	} );

	it( 'declares each touched channel with its composite formula in every frame', () => {
		const { play, CHANNEL_FORMULA } = load();
		play( target( {} ) );
		animate.mock.calls[ 0 ][ 0 ].forEach( ( f ) => {
			expect( f.translate ).toBe( CHANNEL_FORMULA.translate[ 1 ] );
			expect( f.opacity ).toBe( CHANNEL_FORMULA.opacity[ 1 ] );
			expect( f.scale ).toBeUndefined();
		} );
	} );

	it( 'keeps every channel formula identical to the @keyframes in motion.css', () => {
		const css = fs.readFileSync( path.join( __dirname, '../../assets/css/motion.css' ), 'utf8' );
		const { CHANNEL_FORMULA } = load();
		Object.keys( CHANNEL_FORMULA ).forEach( ( channel ) => {
			const block = css.split( '@keyframes sgs-me-' + channel + ' {' )[ 1 ].split( '\n}' )[ 0 ];
			expect( block ).toContain( CHANNEL_FORMULA[ channel ][ 0 ] + ': ' + CHANNEL_FORMULA[ channel ][ 1 ] + ';' );
		} );
	} );

	it( 'maps every owner property to its channel and declares only the channels touched', () => {
		const { play, CHANNEL_FORMULA } = load();
		const every = { offset: 0, '--sgs-me-tx': '8px', '--sgs-me-ty': '4px', '--sgs-me-rot': '5deg', '--sgs-me-s': '0.9', '--sgs-me-sx': '1.1', '--sgs-me-sy': '0.85', '--sgs-me-op': '0', '--sgs-me-blur': '6px', '--sgs-me-clip-t': '0%', '--sgs-me-clip-r': '0%', '--sgs-me-clip-b': '100%', '--sgs-me-clip-l': '0%' };
		play( target( { frames: [ every, { ...every, offset: 1, '--sgs-me-op': '1' } ] } ) );
		const [ frames ] = animate.mock.calls[ 0 ];
		frames.forEach( ( f ) => {
			Object.keys( every ).filter( ( k ) => k !== 'offset' ).forEach( ( k ) => expect( f[ k ] ).toBeDefined() );
			[ 'translate', 'rotate', 'scale', 'opacity', 'filter', 'clip-path' ].forEach( ( channel ) =>
				expect( f[ CHANNEL_FORMULA[ channel ][ 0 ] ] ).toBe( CHANNEL_FORMULA[ channel ][ 1 ] )
			);
		} );
		expect( Object.keys( frames[ 0 ] ).sort() ).toEqual(
			[ 'offset', '--sgs-me-tx', '--sgs-me-ty', '--sgs-me-rot', '--sgs-me-s', '--sgs-me-sx', '--sgs-me-sy', '--sgs-me-op', '--sgs-me-blur', '--sgs-me-clip-t', '--sgs-me-clip-r', '--sgs-me-clip-b', '--sgs-me-clip-l', 'translate', 'rotate', 'scale', 'opacity', 'filter', 'clip-path' ].sort()
		);
	} );

	it( 'animates a uniform clip amount as all four edge owners, under the four-edge clip formula', () => {
		const { play, CHANNEL_FORMULA } = load();
		expect( CHANNEL_FORMULA[ 'clip-path' ] ).toEqual( [ 'clip-path', 'inset(var(--sgs-me-clip-t) var(--sgs-me-clip-r) var(--sgs-me-clip-b) var(--sgs-me-clip-l))' ] );
		play( target( { me: 'load clip-path', frames: [ { offset: 0, '--sgs-me-clip': '40%' }, { offset: 0.5, '--sgs-me-clip': '10%' }, { offset: 1, '--sgs-me-clip': '0%' } ] } ) );
		const [ frames ] = animate.mock.calls[ 0 ];
		[ 't', 'r', 'b', 'l' ].forEach( ( e ) => expect( frames.map( ( f ) => f[ `--sgs-me-clip-${ e }` ] ) ).toEqual( [ '40%', '10%', '0%' ] ) );
		frames.forEach( ( f ) => {
			expect( f ).not.toHaveProperty( '--sgs-me-clip' );
			expect( f[ 'clip-path' ] ).toBe( CHANNEL_FORMULA[ 'clip-path' ][ 1 ] );
		} );
	} );

	it( 'writes the X and Y owners per frame and the per-axis transform formula in every frame', () => {
		const { play, CHANNEL_FORMULA } = load();
		play( target( { me: 'load transform', frames: [ { offset: 0, '--sgs-me-rx': '0deg' }, { offset: 0.5, '--sgs-me-rx': '20deg', '--sgs-me-ry': '-10deg' }, { offset: 1, '--sgs-me-rx': '0deg' } ] } ) );
		const [ frames ] = animate.mock.calls[ 0 ];
		expect( frames.map( ( f ) => f[ '--sgs-me-rx' ] ) ).toEqual( [ '0deg', '20deg', '0deg' ] );
		expect( frames.map( ( f ) => f[ '--sgs-me-ry' ] ) ).toEqual( [ undefined, '-10deg', undefined ] );
		frames.forEach( ( f ) => {
			expect( f.transform ).toBe( CHANNEL_FORMULA.transform[ 1 ] );
			expect( f.transform ).toContain( 'perspective(var(--sgs-persp-self))' );
		} );
	} );

	it( 'maps each owner property alone to exactly its own channel', () => {
		const { play, CHANNEL_FORMULA } = load();
		const table = { 'tx': 'translate', 'ty': 'translate', 'rot': 'rotate', 'rx': 'transform', 'ry': 'transform', 's': 'scale', 'op': 'opacity', 'blur': 'filter', 'clip': 'clip-path', 'clip-t': 'clip-path', 'clip-r': 'clip-path', 'clip-b': 'clip-path', 'clip-l': 'clip-path' };
		Object.keys( table ).forEach( ( suffix ) => {
			document.body.innerHTML = '';
			animate.mockClear();
			play( target( { frames: [ { offset: 0, [ `--sgs-me-${ suffix }` ]: '1' }, { offset: 1, [ `--sgs-me-${ suffix }` ]: '0' } ] } ) );
			const f = animate.mock.calls[ 0 ][ 0 ][ 0 ];
			const declared = Object.keys( f ).filter( ( k ) => ! k.startsWith( '--' ) && 'offset' !== k );
			expect( declared ).toEqual( [ CHANNEL_FORMULA[ table[ suffix ] ][ 0 ] ] );
		} );
	} );

	it( 'falls back to the default easing when animate() rejects the stored one', () => {
		let firstEasing;
		animate.mockImplementationOnce( ( frames, options ) => {
			firstEasing = options.easing;
			throw new TypeError( 'bad easing' );
		} );
		const { play } = load();
		const el = target( {} );
		const result = play( el );
		expect( animate ).toHaveBeenCalledTimes( 2 );
		expect( firstEasing ).toBe( 'ease-in' );
		expect( animate.mock.calls[ 1 ][ 1 ] ).toEqual( { duration: 900, delay: 120, easing: 'ease-out', fill: 'backwards' } );
		expect( result ).not.toBeNull();
		expect( el.getAttribute( 'data-sgs-me-kf' ) ).toBe( 'played' );
	} );

	it( 'writes no inline style', () => {
		const { play } = load();
		const el = target( {} );
		play( el );
		expect( el.hasAttribute( 'style' ) ).toBe( false );
	} );

	it( 'plays nothing under reduced motion', () => {
		reduced = true;
		const { init, play } = load();
		const el = target( {} );
		init( document );
		play( el );
		expect( animate ).not.toHaveBeenCalled();
	} );

	it( 'plays a load entrance at init and a scroll entrance once, when data-sgs-in appears', async () => {
		const { init } = load();
		target( {} );
		const scroll = target( { me: 'scroll translate opacity' } );
		init( document );
		expect( animate ).toHaveBeenCalledTimes( 1 );
		scroll.setAttribute( 'data-sgs-in', '' );
		await new Promise( ( r ) => setTimeout( r, 0 ) );
		expect( animate ).toHaveBeenCalledTimes( 2 );
		scroll.removeAttribute( 'data-sgs-in' );
		scroll.setAttribute( 'data-sgs-in', '' );
		await new Promise( ( r ) => setTimeout( r, 0 ) );
		expect( animate ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'ignores keyframe JSON with fewer than two frames', () => {
		const { play } = load();
		play( target( { frames: [ KEYFRAMES[ 0 ] ] } ) );
		expect( animate ).not.toHaveBeenCalled();
	} );
} );

describe( 'motion-keyframes: state replay', () => {
	const SHAKE = [
		{ offset: 0, '--sgs-me-tx': '0px' },
		{ offset: 0.33, '--sgs-me-tx': '-8px' },
		{ offset: 0.66, '--sgs-me-tx': '8px' },
		{ offset: 1, '--sgs-me-tx': '0px' },
	];
	const flush = () => new Promise( ( r ) => setTimeout( r, 0 ) );

	// A form host with a shake on its inner part, named `invalid` by the renderer's --sgs-mt-kf rule.
	function fixture( state = 'invalid' ) {
		document.head.innerHTML += '<style>.inner { --sgs-mt-kf: ' + state + '; }</style>';
		document.body.innerHTML = '<div class="host" data-sgs-motion-state=""><form class="inner"></form></div><p class="outside"></p>';
		const inner = document.querySelector( '.inner' );
		inner.setAttribute( 'data-sgs-me', 'state translate' );
		inner.setAttribute( 'data-sgs-me-keyframes', JSON.stringify( SHAKE ) );
		const outside = document.querySelector( '.outside' );
		outside.setAttribute( 'data-sgs-me', 'state translate' );
		outside.setAttribute( 'data-sgs-me-keyframes', JSON.stringify( SHAKE ) );
		return { host: document.querySelector( '.host' ), inner, outside };
	}

	function stateModule() {
		return require( '../../src/shared/effects/motion-state.js' );
	}

	it( 'plays the shake on each pulse of its state, so two identical failed submits play twice', async () => {
		const { host, inner } = fixture();
		const cancels = [];
		animate.mockImplementation( () => {
			const run = { cancel: jest.fn() };
			cancels.push( run.cancel );
			return run;
		} );
		load();
		const { pulseMotionState } = stateModule();
		expect( animate ).not.toHaveBeenCalled();
		pulseMotionState( host, 'invalid' );
		await flush();
		pulseMotionState( host, 'invalid' );
		await flush();
		expect( animate ).toHaveBeenCalledTimes( 2 );
		expect( animate.mock.instances.length ).toBe( 2 );
		expect( animate.mock.calls[ 1 ][ 0 ].map( ( f ) => f[ '--sgs-me-tx' ] ) ).toEqual( [ '0px', '-8px', '8px', '0px' ] );
		expect( cancels[ 0 ] ).toHaveBeenCalledTimes( 1 );
		expect( cancels[ 1 ] ).not.toHaveBeenCalled();
		expect( inner.hasAttribute( 'style' ) ).toBe( false );
	} );

	it( 'NEGATIVE CONTROL: setting a state that is already on does not replay; only a pulse restarts it', async () => {
		const { host } = fixture();
		load();
		const { setMotionState } = stateModule();
		setMotionState( host, 'invalid' );
		await flush();
		setMotionState( host, 'invalid' );
		await flush();
		expect( animate ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'replays only the targets whose own state was added, and only inside the host', async () => {
		const { host } = fixture( 'invalid' );
		load();
		const { pulseMotionState, setMotionState } = stateModule();
		setMotionState( host, 'success' );
		pulseMotionState( host, 'step-changed' );
		await flush();
		expect( animate ).not.toHaveBeenCalled();
		pulseMotionState( host, 'invalid' );
		await flush();
		expect( animate ).toHaveBeenCalledTimes( 1 );
		expect( animate.mock.contexts[ 0 ].className ).toBe( 'inner' );
	} );

	it( 'replays nothing under reduced motion', async () => {
		reduced = true;
		const { host } = fixture();
		load();
		const { pulseMotionState } = stateModule();
		pulseMotionState( host, 'invalid' );
		await flush();
		pulseMotionState( host, 'invalid' );
		await flush();
		expect( animate ).not.toHaveBeenCalled();
	} );
} );
