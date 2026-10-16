/**
 * A stubbed viewport for the per-device off switch tests (Spec 38A FR-38A-23). `window.matchMedia` answers for a chosen
 * width: each list reads `matches` live, and `resize()` fires the `change` listeners of every query whose answer flips,
 * so a test sees the same events a browser sends. `reduced-motion` is always false and `pointer: fine` always true.
 */

let width = 1440;
let listeners = [];

function queryMatches( query, at ) {
	if ( query.includes( 'reduced-motion' ) ) {
		return false;
	}
	if ( query.includes( 'pointer: fine' ) ) {
		return true;
	}
	const max = /max-width:\s*(\d+)px/.exec( query );
	const min = /min-width:\s*(\d+)px/.exec( query );
	return (
		( ! max || at <= Number( max[ 1 ] ) ) &&
		( ! min || at >= Number( min[ 1 ] ) )
	);
}

function installViewport( initial ) {
	width = initial;
	listeners = [];
	window.matchMedia = ( query ) => ( {
		media: query,
		get matches() {
			return queryMatches( query, width );
		},
		addEventListener: ( type, listener ) =>
			listeners.push( { query, listener } ),
		removeEventListener: ( type, listener ) => {
			listeners = listeners.filter(
				( entry ) =>
					entry.query !== query || entry.listener !== listener
			);
		},
	} );
}

function resize( to ) {
	const from = width;
	width = to;
	listeners
		.filter(
			( entry ) =>
				queryMatches( entry.query, from ) !==
				queryMatches( entry.query, to )
		)
		.slice()
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

/** The change listeners now attached to any media query list. */
function listenerCount() {
	return listeners.length;
}

module.exports = { installViewport, resize, listenerCount };
