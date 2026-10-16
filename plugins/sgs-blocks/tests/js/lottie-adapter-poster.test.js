/**
 * lottie-web's destroy() empties the container it was given. The adapter must put the server-rendered poster back, or a
 * Lottie switched off at a device tier (Spec 38A FR-38A-23) leaves an empty span instead of its poster.
 */
/* global jest, describe, test, expect, beforeEach */

const mockEmptyOnDestroy = { enabled: true };
const mockDocument = () => document;

jest.mock(
	'@sgs/lottie-web',
	() => ( {
		__esModule: true,
		default: {
			loadAnimation: ( { container } ) => {
				container.appendChild( mockDocument().createElementNS( 'http://www.w3.org/2000/svg', 'svg' ) );
				return {
					totalFrames: 10,
					play: jest.fn(),
					pause: jest.fn(),
					goToAndStop: jest.fn(),
					getDuration: () => 1,
					setSpeed: jest.fn(),
					destroy: () => {
						if ( mockEmptyOnDestroy.enabled ) {
							container.innerText = '';
							container.replaceChildren();
						}
					},
				};
			},
		},
	} ),
	{ virtual: true }
);

const { init } = require( '../../src/shared/effects/lottie-adapter' );

describe( 'lottie-adapter destroy', () => {
	let container;
	let poster;

	beforeEach( () => {
		mockEmptyOnDestroy.enabled = true;
		document.body.innerHTML = '<span class="sgs-lottie"><img class="sgs-lottie__poster" alt=""></span>';
		container = document.querySelector( '.sgs-lottie' );
		poster = container.querySelector( 'img' );
	} );

	test( 'puts the poster back after the player empties the container', async () => {
		const player = await init( { container, animationData: {} } );
		expect( container.querySelector( 'svg' ) ).not.toBeNull();
		player.destroy();
		expect( container.querySelector( 'svg' ) ).toBeNull();
		expect( container.querySelector( 'img' ) ).toBe( poster );
	} );

	test( 'RED CONTROL: the raw player destroy alone removes the poster', async () => {
		const lottie = ( await import( '@sgs/lottie-web' ) ).default;
		const raw = lottie.loadAnimation( { container } );
		raw.destroy();
		expect( container.querySelector( 'img' ) ).toBeNull();
	} );
} );
