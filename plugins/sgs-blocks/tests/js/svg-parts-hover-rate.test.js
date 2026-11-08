/**
 * svg-parts.js: a part's loop speed-up on hover lasts while the element is hovered or a finger is held on it
 * (`hoverRateDuration` 0 or unset), or for a fixed burst when `hoverRateDuration` is above 0.
 */
import { bootSvgParts } from '../../src/shared/svg-parts/svg-parts';

function mount( part ) {
	const doc = JSON.stringify( {
		trigger: 'load',
		parts: [ { target: 'sun', loopRotate: 360, loopDuration: 60000, hoverRate: 14, ...part } ],
	} );
	document.body.innerHTML = `<span data-sgs-svg-parts='${ doc }'><svg><g id="sun"></g></svg></span>`;
	return document.querySelector( '[data-sgs-svg-parts]' );
}

function pointer( root, type, pointerType ) {
	const event = new window.Event( type );
	event.pointerType = pointerType;
	root.dispatchEvent( event );
}

describe( 'svg-parts hover speed-up', () => {
	let loop;
	beforeEach( () => {
		jest.useFakeTimers();
		window.matchMedia = jest.fn( () => ( { matches: false } ) );
		loop = { cancel: jest.fn(), updatePlaybackRate: jest.fn(), rate: 1 };
		loop.updatePlaybackRate.mockImplementation( ( r ) => {
			loop.rate = r;
		} );
		Element.prototype.animate = jest.fn( ( frames, opts ) =>
			opts && opts.iterations === Infinity ? loop : { cancel: jest.fn() }
		);
	} );
	afterEach( () => jest.useRealTimers() );

	it( 'holds the fast speed for the whole hover and slows on leave (unset duration)', () => {
		const root = mount( {} );
		bootSvgParts();
		pointer( root, 'pointerenter', 'mouse' );
		expect( loop.rate ).toBe( 14 );
		jest.advanceTimersByTime( 5000 );
		expect( loop.rate ).toBe( 14 );
		pointer( root, 'pointerleave', 'mouse' );
		expect( loop.rate ).toBe( 1 );
	} );

	it( 'holds the fast speed while a finger is held, and slows on release', () => {
		const root = mount( { hoverRateDuration: 0 } );
		bootSvgParts();
		pointer( root, 'pointerenter', 'touch' );
		jest.advanceTimersByTime( 3000 );
		expect( loop.rate ).toBe( 14 );
		pointer( root, 'pointerleave', 'touch' );
		expect( loop.rate ).toBe( 1 );
	} );

	it( 'a duration above 0 is a timed burst that the pointer leaving does not cut short', () => {
		const root = mount( { hoverRateDuration: 900 } );
		bootSvgParts();
		pointer( root, 'pointerenter', 'mouse' );
		pointer( root, 'pointerleave', 'mouse' );
		expect( loop.rate ).toBe( 14 );
		jest.advanceTimersByTime( 900 );
		expect( loop.rate ).toBe( 1 );
	} );

	it( 'does not speed up under reduced motion', () => {
		window.matchMedia = jest.fn( () => ( { matches: true } ) );
		const root = mount( {} );
		bootSvgParts();
		pointer( root, 'pointerenter', 'mouse' );
		expect( loop.updatePlaybackRate ).not.toHaveBeenCalled();
	} );
} );
