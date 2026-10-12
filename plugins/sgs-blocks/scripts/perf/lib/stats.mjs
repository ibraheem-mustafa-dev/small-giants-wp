/**
 * Statistics for the editor typing harness: median, percentile, rounding and the per-run summary.
 */

export const median = ( xs ) => { const s = [ ...xs ].sort( ( p, q ) => p - q ); const n = s.length; return n % 2 ? s[ ( n - 1 ) / 2 ] : ( s[ n / 2 - 1 ] + s[ n / 2 ] ) / 2; };
export const percentile = ( xs, p ) => { const s = [ ...xs ].sort( ( a, b ) => a - b ); return s[ Math.min( s.length - 1, Math.ceil( ( p / 100 ) * s.length ) - 1 ) ]; };
export const r2 = ( x ) => Math.round( x * 100 ) / 100;

/** Median, min, max and spread ((max - min) / median) of a list of values. */
export function summarise( values ) {
	const med = median( values );
	const lo = Math.min( ...values ), hi = Math.max( ...values );
	const r4 = ( x ) => Math.round( x * 10000 ) / 10000;
	return { median: r2( med ), min: r2( lo ), max: r2( hi ), spread: r4( ( hi - lo ) / med ) };
}

/** The summary block written to the output file: p95 latency, heap and frame interval across the runs. */
export function summaryOf( runs ) {
	const fi = runs.map( ( r ) => r.frameIntervalMs ).filter( ( x ) => x );
	return { p95Ms: summarise( runs.map( ( r ) => r.p95Ms ) ), heapBytes: summarise( runs.map( ( r ) => r.heapBytes ) ), frameIntervalMs: fi.length ? r2( median( fi ) ) : null };
}
