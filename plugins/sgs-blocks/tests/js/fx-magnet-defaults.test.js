/**
 * The magnet boot module's defaults (Spec 38A FR-38A-40): an element that stores no magnet values leans toward the pointer
 * only while the pointer is over it, by up to 5px on x and 4px on y, easing toward the pointer; stored values and the
 * proximity mode stay available.
 */

/* global jest, describe, test, expect */

jest.mock(
	'@sgs/magnet',
	() => ( {
		DEFAULT_RADIUS: 120,
		DEFAULT_RETURN_MS: 250,
		DEFAULT_FOLLOW_MS: 250,
		registerMagnet: () => () => {},
	} ),
	{ virtual: true }
);

function options( attrs ) {
	document.body.innerHTML = `<a id="t" data-sgs-fx="magnet" ${ attrs }>Go</a>`;
	let readOptions;
	jest.isolateModules( () => {
		( { readOptions } = require( '../../src/shared/effects/fx-magnet.js' ) );
	} );
	return readOptions( document.getElementById( 't' ) );
}

describe( 'magnet defaults', () => {
	test( 'no stored values: over the element, normalised 10 by 8 total travel, 250ms follow and return', () => {
		const o = options( '' );
		expect( o.engage ).toBe( 'over' );
		expect( o.pullModel ).toBe( 'normalised' );
		expect( o.maxPullX ).toBe( 10 );
		expect( o.maxPullY ).toBe( 8 );
		expect( o.followDuration ).toBe( 250 );
		expect( o.returnDuration ).toBe( 250 );
		expect( o.returnEasing ).toBe( 'cubic-bezier(0.16, 0.84, 0.32, 1)' );
	} );

	test( 'stored values keep winning, proximity and the distance model stay available', () => {
		const o = options(
			'data-sgs-fx-magnet-engage="proximity" data-sgs-fx-magnet-pull-model="distance" data-sgs-fx-magnet-strength="14" data-sgs-fx-magnet-max-pull-y="10" data-sgs-fx-magnet-return-duration="600" data-sgs-fx-magnet-follow-duration="0" data-sgs-fx-magnet-follow-easing="ease-in"'
		);
		expect( o.engage ).toBe( 'proximity' );
		expect( o.pullModel ).toBe( 'distance' );
		expect( o.maxPullX ).toBe( 14 );
		expect( o.maxPullY ).toBe( 10 );
		expect( o.returnDuration ).toBe( 600 );
		expect( o.followDuration ).toBe( 0 );
		expect( o.followEasing ).toBe( 'ease-in' );
	} );

	test( 'a stored x limit alone pulls the same on y', () => {
		const o = options( 'data-sgs-fx-magnet-strength="20"' );
		expect( o.maxPullY ).toBe( 20 );
	} );
} );
