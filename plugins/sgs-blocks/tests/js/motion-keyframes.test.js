/**
 * Multi-keyframe entrances on WAAPI (Spec 38A FR-38A-20): animate() receives the stored keyframes on the
 * --sgs-me-* properties, the stored delay and fill 'backwards'; reduced motion plays nothing; the channel
 * formulas match assets/css/motion.css.
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
	return require( '../../assets/js/motion-keyframes.js' );
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
	global.matchMedia = jest.fn( ( q ) => ( { matches: reduced && q.includes( 'reduce' ) } ) );
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
