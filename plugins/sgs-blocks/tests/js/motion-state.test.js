/**
 * Motion state (Spec 38A M4.4): the state attribute a block's script sets for the `open` and `state` entrance
 * triggers. Real CSS animations do not run in jsdom; the restart itself is proved in a browser (the M4.4 report).
 * Here: set and clear, the open and close pairing, the pulse's remove, flush and re-add order, and the
 * reduced-motion listener.
 */

const ATTR = 'data-sgs-motion-state';

function makeMatchMedia( initial ) {
	const listeners = new Set();
	const query = {
		matches: initial,
		addEventListener: ( type, fn ) => listeners.add( fn ),
		removeEventListener: ( type, fn ) => listeners.delete( fn ),
	};
	return {
		query,
		listeners,
		set( value ) {
			query.matches = value;
			listeners.forEach( ( fn ) => fn( { matches: value } ) );
		},
	};
}

function load( { reduced = false } = {} ) {
	const media = makeMatchMedia( reduced );
	window.matchMedia = ( query ) =>
		'(prefers-reduced-motion: reduce)' === query
			? media.query
			: {
					matches: false,
					addEventListener() {},
					removeEventListener() {},
			  };
	document.body.innerHTML = '';
	let mod;
	jest.isolateModules( () => {
		mod = require( '../../src/shared/effects/motion-state' );
	} );
	return { mod, media };
}

/**
 * An element whose offsetWidth reads are logged with the attribute value at that moment.
 *
 * @param {string} [initial] Initial attribute value.
 * @return {{el: HTMLElement, log: string[]}} The element and the event log.
 */
function host( initial ) {
	const el = document.createElement( 'div' );
	if ( undefined !== initial ) {
		el.setAttribute( ATTR, initial );
	}
	document.body.appendChild( el );
	const log = [];
	const set = el.setAttribute.bind( el );
	el.setAttribute = ( name, value ) => {
		if ( ATTR === name ) {
			log.push( `set:${ value }` );
		}
		set( name, value );
	};
	Object.defineProperty( el, 'offsetWidth', {
		configurable: true,
		get() {
			log.push( `flush:${ el.getAttribute( ATTR ) }` );
			return 100;
		},
	} );
	return { el, log };
}

describe( 'setMotionState and clearMotionState', () => {
	it( 'adds and removes a named state token, keeping others', () => {
		const { mod } = load();
		const { el } = host( '' );
		mod.setMotionState( el, 'invalid', true );
		mod.setMotionState( el, 'success', true );
		expect( el.getAttribute( ATTR ) ).toBe( 'invalid success' );
		expect( mod.hasMotionState( el, 'invalid' ) ).toBe( true );
		mod.setMotionState( el, 'invalid', false );
		expect( el.getAttribute( ATTR ) ).toBe( 'success' );
		mod.setMotionState( el, 'success', true );
		expect( el.getAttribute( ATTR ) ).toBe( 'success' );
	} );

	it( 'pairs open and close: close appears only after an open', () => {
		const { mod } = load();
		const { el } = host( '' );
		mod.setMotionState( el, 'open', false );
		expect( el.getAttribute( ATTR ) ).toBe( '' );
		mod.setMotionState( el, 'open', true );
		expect( el.getAttribute( ATTR ) ).toBe( 'open' );
		mod.setMotionState( el, 'open', false );
		expect( el.getAttribute( ATTR ) ).toBe( 'close' );
		mod.setMotionState( el, 'open' );
		expect( el.getAttribute( ATTR ) ).toBe( 'open' );
		mod.setMotionState( el, 'close', true );
		expect( el.getAttribute( ATTR ) ).toBe( 'close' );
	} );

	it( 'clears one token or all, keeping the attribute so the host still shields its subtree', () => {
		const { mod } = load();
		const { el } = host( 'open invalid' );
		mod.clearMotionState( el, 'invalid' );
		expect( el.getAttribute( ATTR ) ).toBe( 'open' );
		mod.clearMotionState( el );
		expect( el.hasAttribute( ATTR ) ).toBe( true );
		expect( el.getAttribute( ATTR ) ).toBe( '' );
	} );

	it( 'ignores a name outside the schema pattern and a non-element', () => {
		const { mod } = load();
		const { el } = host( '' );
		mod.setMotionState( el, 'Bad Name', true );
		mod.setMotionState( el, '"]{x', true );
		mod.pulseMotionState( el, '9lives' );
		expect( el.getAttribute( ATTR ) ).toBe( '' );
		expect( () => mod.setMotionState( null, 'open' ) ).not.toThrow();
		expect( () => mod.pulseMotionState( {}, 'invalid' ) ).not.toThrow();
	} );
} );

describe( 'pulseMotionState', () => {
	it( 'sets the token on the first pulse with no flush', () => {
		const { mod } = load();
		const { el, log } = host( '' );
		mod.pulseMotionState( el, 'invalid' );
		expect( log ).toEqual( [ 'set:invalid' ] );
	} );

	it( 'removes, flushes with the token gone, then re-adds on a repeated pulse', () => {
		const { mod } = load();
		const { el, log } = host( 'open invalid' );
		mod.pulseMotionState( el, 'invalid' );
		expect( log ).toEqual( [
			'set:open',
			'flush:open',
			'set:open invalid',
		] );
		mod.pulseMotionState( el, 'invalid' );
		expect( log.slice( 3 ) ).toEqual( [
			'set:open',
			'flush:open',
			'set:open invalid',
		] );
	} );

	it( 'never pulses open or close (they are a held pair)', () => {
		const { mod } = load();
		const { el, log } = host( 'open' );
		mod.pulseMotionState( el, 'open' );
		mod.pulseMotionState( el, 'close' );
		expect( log ).toEqual( [] );
	} );

	it( 'skips the restart under reduced motion and follows a mid-session change', () => {
		const { mod, media } = load( { reduced: true } );
		const { el, log } = host( 'invalid' );
		expect( mod.isReducedMotion() ).toBe( true );
		mod.pulseMotionState( el, 'invalid' );
		expect( log ).toEqual( [] );
		media.set( false );
		expect( mod.isReducedMotion() ).toBe( false );
		mod.pulseMotionState( el, 'invalid' );
		expect( log ).toEqual( [ 'set:', 'flush:', 'set:invalid' ] );
		media.set( true );
		expect( mod.isReducedMotion() ).toBe( true );
		expect( media.listeners.size ).toBe( 1 );
	} );
} );

describe( 'motionSettled', () => {
	it( 'waits only for the motion model animations under the host', async () => {
		const { mod } = load();
		const { el } = host( 'close' );
		let release;
		const pending = new Promise( ( resolve ) => {
			release = resolve;
		} );
		const never = new Promise( () => {} );
		el.getAnimations = ( options ) => {
			expect( options ).toEqual( { subtree: true } );
			return [
				{ animationName: 'sgs-me-close-opacity', finished: pending },
				{
					animationName: 'sgs-me-close-translate',
					finished: Promise.reject( new Error( 'cancelled' ) ),
				},
				{ animationName: 'unrelated-spin', finished: never },
				{ finished: never },
			];
		};
		let done = false;
		const settled = mod.motionSettled( el ).then( () => {
			done = true;
		} );
		await Promise.resolve();
		expect( done ).toBe( false );
		release();
		await settled;
		expect( done ).toBe( true );
	} );

	it( 'resolves at once under reduced motion or without getAnimations', async () => {
		const { mod } = load( { reduced: true } );
		const { el } = host( 'close' );
		el.getAnimations = () => [
			{
				animationName: 'sgs-me-close-opacity',
				finished: new Promise( () => {} ),
			},
		];
		await expect( mod.motionSettled( el ) ).resolves.toBeUndefined();
		await expect( mod.motionSettled( {} ) ).resolves.toBeUndefined();
	} );
} );
