/**
 * A simulated viewport for the per-device off switch tests (Spec 38A FR-38A-23).
 *
 * `window.matchMedia` answers for a chosen width: each list reads `matches` live, and `resize()` fires the `change`
 * listeners of every query whose answer flips, so a runtime that watches the tier queries sees a real tier change. A
 * query with no width bound (reduced motion, pointer) is answered `false` for reduced motion and `true` otherwise, which
 * reads as a fine-pointer desktop with no motion preference.
 */

/* global jest */

const path = require( 'path' );

const OFF_SWITCH = path.resolve(
	__dirname,
	'../../../src/shared/effects/off-switch'
);

let width = 1440;
let listeners = [];

function queryMatches( query, at ) {
	if ( query.includes( 'reduced-motion' ) ) {
		return false;
	}
	const max = /max-width:\s*(\d+)px/.exec( query );
	const min = /min-width:\s*(\d+)px/.exec( query );
	return (
		( ! max || at <= Number( max[ 1 ] ) ) &&
		( ! min || at >= Number( min[ 1 ] ) )
	);
}

/**
 * Install the stubbed matchMedia at a viewport width.
 *
 * @param {number} initial Viewport width in px.
 */
function installViewport( initial ) {
	width = initial;
	listeners = [];
	window.matchMedia = ( query ) => ( {
		media: query,
		get matches() {
			return queryMatches( query, width );
		},
		addEventListener: ( type, listener ) => {
			listeners.push( { query, listener } );
		},
		removeEventListener: ( type, listener ) => {
			listeners = listeners.filter(
				( entry ) =>
					entry.query !== query || entry.listener !== listener
			);
		},
	} );
}

/**
 * Move the viewport and fire the change listeners of every query whose answer flipped.
 *
 * @param {number} to New viewport width in px.
 */
function resize( to ) {
	const from = width;
	width = to;
	listeners
		.filter(
			( entry ) =>
				queryMatches( entry.query, from ) !==
				queryMatches( entry.query, to )
		)
		.forEach( ( entry ) => {
			// A listener removed by an earlier one in the same dispatch is not called, as in a browser.
			if ( ! listeners.includes( entry ) ) {
				return;
			}
			entry.listener( {
				matches: queryMatches( entry.query, to ),
				media: entry.query,
			} );
		} );
}

/**
 * Replace `bootGated` with an ungated loop, for the RED CONTROL of a suite. Call before the runtime is required.
 *
 */
function bypassGate() {
	jest.doMock( OFF_SWITCH, () => ( {
		bootGated: ( effect, targets, init ) => {
			const elements =
				typeof targets === 'string'
					? Array.from( document.querySelectorAll( targets ) )
					: Array.from( targets );
			const cleanups = elements.map( init );
			return () =>
				cleanups.forEach( ( cleanup ) => cleanup && cleanup() );
		},
		isEffectOffAtThisTier: () => false,
	} ) );
}

module.exports = { installViewport, resize, bypassGate, OFF_SWITCH };
