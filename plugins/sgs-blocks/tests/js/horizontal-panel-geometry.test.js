/**
 * horizontal-panel-geometry.js::travelDistance: the row travels at least until the last panel's centre reaches the
 * host's centre (the pin holds until the last card is in the middle of the screen), in both travel modes.
 */
import { travelDistance } from '../../src/shared/effects/gsap/horizontal-panel-geometry';

// A host 1000px wide with five 400px cards, 24px apart, the first starting 40px in (layout boxes set by hand: jsdom
// has no layout).
function build() {
	const host = document.createElement( 'div' );
	const track = document.createElement( 'div' );
	host.appendChild( track );
	const box = ( node, left, width, parent ) => {
		Object.defineProperty( node, 'offsetLeft', { configurable: true, get: () => left } );
		Object.defineProperty( node, 'offsetWidth', { configurable: true, get: () => width } );
		Object.defineProperty( node, 'offsetParent', { configurable: true, get: () => parent } );
	};
	box( host, 0, 1000, null );
	Object.defineProperty( host, 'clientWidth', { configurable: true, get: () => 1000 } );
	Object.defineProperty( host, 'clientLeft', { configurable: true, get: () => 0 } );
	for ( let i = 0; i < 5; i++ ) {
		const card = document.createElement( 'div' );
		box( card, 40 + i * 424, 400, host );
		track.appendChild( card );
	}
	return { host, track };
}

describe( 'travelDistance', () => {
	// last card: left 1736, centre 1936; centred travel = 1936 - 500 = 1436
	it( 'track-end: travels until the last card is centred, past the point where it is fully in view', () => {
		const { host, track } = build();
		// fully in view with the start margin: 2136 - (1000 - 40) = 1176
		expect( travelDistance( host, track, 'track-end' ) ).toBe( 1436 );
	} );

	it( 'first-start: travels until the last card is centred when that is further than the start position', () => {
		const { host, track } = build();
		// last card's left at the first card's start: 1736 - 40 = 1696, already past centre, so it stands
		expect( travelDistance( host, track, 'first-start' ) ).toBe( 1696 );
	} );

	it( 'first-start with a wide card: the centre rule wins over the start position', () => {
		const { host, track } = build();
		const last = track.lastElementChild;
		Object.defineProperty( last, 'offsetWidth', { configurable: true, get: () => 1400 } );
		// centred: 1736 + 700 - 500 = 1936; flush right: 1736 + 1400 - 1000 = 2136 wins
		expect( travelDistance( host, track, 'first-start' ) ).toBe( 2136 );
	} );
} );
