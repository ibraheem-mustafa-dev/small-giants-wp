/**
 * A success toast stays up for as long as its own CSS motion runs (the
 * stylesheet's animation duration plus a short margin), and for 5 seconds
 * when it has no motion to follow.
 */

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: ( ns, def ) => {
			require( '@wordpress/interactivity' ).__state = def.state;
			return { state: def.state, actions: def.actions };
		},
	} ),
	{ virtual: true }
);

const { toastActions } = require( '../../src/shared/toast/store.js' );

const stateOf = () => require( '@wordpress/interactivity' ).__state;

describe( 'toast lifetime', () => {
	let styleSpy;

	beforeEach( () => {
		jest.useFakeTimers();
		document.body.innerHTML = '<div class="sgs-toast"></div>';
	} );
	afterEach( () => {
		toastActions.close();
		if ( styleSpy ) {
			styleSpy.mockRestore();
			styleSpy = null;
		}
		jest.useRealTimers();
	} );

	test( 'follows the stylesheet animation duration', () => {
		styleSpy = jest
			.spyOn( window, 'getComputedStyle' )
			.mockReturnValue( { animationDuration: '3.2s' } );
		toastActions.showSuccess( 'Added to bag' );
		jest.advanceTimersByTime( 3200 );
		expect( stateOf().variant ).toBe( 'success' );
		jest.advanceTimersByTime( 100 );
		expect( stateOf().variant ).toBe( '' );
	} );

	test( 'falls back to 5 seconds with no animation (negative control)', () => {
		styleSpy = jest
			.spyOn( window, 'getComputedStyle' )
			.mockReturnValue( { animationDuration: '0s' } );
		toastActions.showSuccess( 'Added to bag' );
		jest.advanceTimersByTime( 4900 );
		expect( stateOf().variant ).toBe( 'success' );
		jest.advanceTimersByTime( 100 );
		expect( stateOf().variant ).toBe( '' );
	} );

	test( 'replays the entrance when the same message is added again', () => {
		const toast = document.querySelector( '.sgs-toast' );
		const cancel = jest.fn();
		const play = jest.fn();
		toast.getAnimations = () => [ { cancel, play } ];
		toastActions.showSuccess( 'Added to bag' );
		toastActions.showSuccess( 'Added to bag' );
		expect( cancel ).toHaveBeenCalledTimes( 1 );
		expect( play ).toHaveBeenCalledTimes( 1 );
	} );
} );
