// Structure and drive checks for draft-live-walk.mjs: where each pair sits relative to the
// other pairs (inside which, in whose row), and how each state was reached (click or URL).

// In-page: for each named finder, the other pairs whose element contains it ("inside") and
// the pairs sharing its row ("row": vertical overlap of at least half the shorter box, heights
// within 3x of each other, neither containing the other). Self-contained for page.evaluate().
export function collectStructure( [ finders, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const els = {};
	for ( const [ name, f ] of Object.entries( finders ) ) {
		const el = resolve( f );
		if ( el ) {
			els[ name ] = el;
		}
	}
	const rect = {};
	for ( const [ n, el ] of Object.entries( els ) ) {
		const r = el.getBoundingClientRect();
		rect[ n ] = { top: r.top, bottom: r.bottom, h: r.height };
	}
	const related = ( a, b ) => els[ a ] === els[ b ] || els[ a ].contains( els[ b ] ) || els[ b ].contains( els[ a ] );
	const sameRow = ( a, b ) => {
		const [ x, y ] = [ rect[ a ], rect[ b ] ];
		const low = Math.min( x.h, y.h );
		const overlap = Math.min( x.bottom, y.bottom ) - Math.max( x.top, y.top );
		return low > 0 && overlap >= low / 2 && Math.max( x.h, y.h ) <= low * 3;
	};
	const out = {};
	for ( const a of Object.keys( els ) ) {
		const others = Object.keys( els ).filter( ( b ) => b !== a );
		out[ a ] = {
			inside: others.filter( ( b ) => els[ b ] !== els[ a ] && els[ b ].contains( els[ a ] ) ).sort(),
			row: others.filter( ( b ) => ! related( a, b ) && sameRow( a, b ) ).sort(),
		};
	}
	return out;
}

// Structure differences for one pair, counting only pairs found on both sides.
export function compareStructure( name, d, l ) {
	if ( ! d?.[ name ] || ! l?.[ name ] ) {
		return [];
	}
	const both = ( list ) => list.filter( ( n ) => d[ n ] && l[ n ] ).join( ', ' ) || 'none';
	const diffs = [];
	for ( const key of [ 'inside', 'row' ] ) {
		const a = both( d[ name ][ key ] );
		const b = both( l[ name ][ key ] );
		if ( a !== b ) {
			diffs.push( { kind: 'structure', key, draft: a, live: b } );
		}
	}
	return diffs;
}

// How a state was reached on each side. A state the draft reaches by clicking and live
// reaches only by loading a URL has never exercised live's click path (the shop's
// filter-click break hid behind URL-loaded filter states). An optional action that hits on
// one side and finds nothing on the other means a control is missing on that side.
export function driveDiffs( dlog, llog ) {
	const diffs = [];
	const acts = ( log ) => log.filter( ( e ) => ( 'click' === e.type || 'hover' === e.type ) && e.hit );
	const gone = ( log ) => log.some( ( e ) => 'goto' === e.type );
	const label = ( log ) => acts( log ).map( ( e ) => e.target ).join( ', ' );
	if ( acts( dlog ).length && ! acts( llog ).length && gone( llog ) ) {
		diffs.push( { kind: 'drive', key: 'live-by-url', draft: `clicked ${ label( dlog ) }`, live: 'loaded a URL only' } );
	}
	if ( acts( llog ).length && ! acts( dlog ).length && gone( dlog ) ) {
		diffs.push( { kind: 'drive', key: 'draft-by-url', draft: 'loaded a URL only', live: `clicked ${ label( llog ) }` } );
	}
	// A real-mouse tap (h.tap) that navigates on one side and opens something on the other, or
	// does nothing on one side (a label that does not take the click): paired by order.
	const taps = ( log ) => log.filter( ( e ) => e.tap );
	taps( dlog ).forEach( ( e, i ) => {
		const twin = taps( llog )[ i ];
		if ( twin && twin.outcome !== e.outcome ) {
			diffs.push( { kind: 'drive', key: `tap ${ e.target }`, draft: e.outcome, live: twin.outcome } );
		}
	} );
	for ( const e of dlog.filter( ( x ) => 'click' === x.type && x.optional && ! x.tap ) ) {
		const twin = llog.find( ( x ) => 'click' === x.type && x.target === e.target );
		if ( twin && twin.hit !== e.hit ) {
			diffs.push( { kind: 'drive', key: `control ${ e.target }`, draft: e.hit ? 'found' : 'none', live: twin.hit ? 'found' : 'none' } );
		}
	}
	return diffs;
}
