/**
 * whenAnimationsSettle(): a closing drawer waits only for what is still to run. An endless
 * loop inside it, or an entrance that ended when it opened, must not hold the dialog open,
 * because an open dialog blocks the page behind it.
 */
import { whenAnimationsSettle } from '../../src/shared/nav-interactivity/drawer-lifecycle';

const anim = ( { playState = 'running', endTime, currentTime = 0, finished = new Promise( () => {} ) } ) => ( {
	playState,
	currentTime,
	finished,
	effect: { getComputedTiming: () => ( { endTime } ) },
} );
const host = ( list ) => ( { getAnimations: () => list } );

describe( 'whenAnimationsSettle', () => {
	beforeEach( () => jest.useFakeTimers() );
	afterEach( () => jest.useRealTimers() );

	test( 'an endless loop does not hold it', () => {
		const done = jest.fn();
		whenAnimationsSettle( host( [ anim( { endTime: Infinity } ) ] ), done );
		jest.advanceTimersByTime( 60 );
		expect( done ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'an animation that already ended does not hold it', () => {
		const done = jest.fn();
		whenAnimationsSettle( host( [ anim( { playState: 'finished', endTime: 1900, currentTime: 1900 } ) ] ), done );
		jest.advanceTimersByTime( 60 );
		expect( done ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'it waits only for what is left of a running animation', () => {
		const done = jest.fn();
		whenAnimationsSettle( host( [ anim( { endTime: 1000, currentTime: 700 } ) ] ), done );
		jest.advanceTimersByTime( 300 );
		expect( done ).not.toHaveBeenCalled();
		jest.advanceTimersByTime( 60 );
		expect( done ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'a running animation among loops is still waited for', () => {
		const done = jest.fn();
		whenAnimationsSettle( host( [ anim( { endTime: Infinity } ), anim( { endTime: 340 } ) ] ), done );
		jest.advanceTimersByTime( 200 );
		expect( done ).not.toHaveBeenCalled();
		jest.advanceTimersByTime( 200 );
		expect( done ).toHaveBeenCalledTimes( 1 );
	} );
} );
