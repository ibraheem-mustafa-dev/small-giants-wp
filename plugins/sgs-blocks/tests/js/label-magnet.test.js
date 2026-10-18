/**
 * Nav label magnet loader (Spec 38A FR-38A-40): the nav views reach the one shared `@sgs/magnet` instance through a
 * native import, attach after it loads, and cancel cleanly when torn down first.
 */
const stops = [];
const mockInitMagnet = jest.fn( () => {
	const stop = jest.fn();
	stops.push( stop );
	return stop;
} );

jest.mock( '@sgs/magnet', () => ( { initMagnet: ( ...args ) => mockInitMagnet( ...args ) } ), { virtual: true } );

const { initLabelMagnet } = require( '../../src/shared/effects/label-magnet' );

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

beforeEach( () => {
	mockInitMagnet.mockClear();
	stops.length = 0;
} );

describe( 'initLabelMagnet', () => {
	test( 'attaches the shared magnet to the label with the given options', async () => {
		const el = document.createElement( 'span' );
		const opts = { factor: 0.2, maxPull: Infinity };
		initLabelMagnet( el, opts );
		await flush();
		expect( mockInitMagnet ).toHaveBeenCalledWith( el, opts );
	} );

	test( 'with no options the shared magnet gets the element alone (the label defaults)', async () => {
		const el = document.createElement( 'span' );
		initLabelMagnet( el );
		await flush();
		expect( mockInitMagnet ).toHaveBeenCalledTimes( 1 );
		expect( mockInitMagnet.mock.calls[ 0 ] ).toEqual( [ el ] );
	} );

	test( 'cleanup after the load stops the magnet', async () => {
		const stop = initLabelMagnet( document.createElement( 'span' ) );
		await flush();
		stop();
		expect( stops[ 0 ] ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'negative control: cleanup before the load cancels the attach', async () => {
		const stop = initLabelMagnet( document.createElement( 'span' ) );
		stop();
		await flush();
		expect( mockInitMagnet ).not.toHaveBeenCalled();
	} );
} );
