/**
 * svg-parts.js sets `data-sgs-svg-armed` in the tick it applies an entrance's from-states.
 */
import { bootSvgParts } from '../../src/shared/svg-parts/svg-parts';

const DOC = ( trigger ) =>
	JSON.stringify( {
		trigger,
		parts: [ { target: 'mark', fromOpacity: 0, duration: 300 } ],
	} );

function mount( trigger ) {
	document.body.innerHTML = `<span data-sgs-svg-parts='${ DOC(
		trigger
	) }'><svg><g id="mark"></g></svg></span>`;
	return document.querySelector( '[data-sgs-svg-parts]' );
}

describe( 'svg-parts armed attribute', () => {
	beforeEach( () => {
		window.matchMedia = jest.fn( () => ( { matches: false } ) );
		Element.prototype.animate = jest.fn( () => ( { cancel: jest.fn() } ) );
	} );

	it( 'arms with the first animate() on a load trigger', () => {
		const root = mount( 'load' );
		bootSvgParts();
		expect( root.hasAttribute( 'data-sgs-svg-armed' ) ).toBe( true );
		expect( Element.prototype.animate ).toHaveBeenCalled();
	} );

	it( 'on a visible trigger, stays unarmed (held hidden) until it scrolls into view, then arms as it plays', () => {
		let callback;
		window.IntersectionObserver = jest.fn( ( cb ) => {
			callback = cb;
			return { observe: jest.fn(), disconnect: jest.fn() };
		} );
		const root = mount( 'visible' );
		bootSvgParts();
		expect( root.hasAttribute( 'data-sgs-svg-parts-booted' ) ).toBe( true );
		expect( root.hasAttribute( 'data-sgs-svg-armed' ) ).toBe( false );
		// negative control: a logo below the fold is not revealed by the observer's first, off-screen delivery
		callback( [ { isIntersecting: false } ] );
		expect( root.hasAttribute( 'data-sgs-svg-armed' ) ).toBe( false );
		callback( [ { isIntersecting: true } ] );
		expect( root.hasAttribute( 'data-sgs-svg-armed' ) ).toBe( true );
	} );

	it( 'does not arm under reduced motion (the finished logo is never hidden)', () => {
		window.matchMedia = jest.fn( () => ( { matches: true } ) );
		const root = mount( 'load' );
		bootSvgParts();
		expect( root.hasAttribute( 'data-sgs-svg-armed' ) ).toBe( false );
	} );
} );
