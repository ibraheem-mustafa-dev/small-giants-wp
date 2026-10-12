/**
 * Console output for the editor typing harness: the run summary and the comparison against a baseline file.
 */
import { TOLERANCE } from './config.mjs';

const MIB = 1048576;

/** Prints the median, min, max and spread of p95 latency and GC'd heap across the runs. */
export function printSummary( summary, { runs, page, out } ) {
	console.log( `\nSUMMARY over ${ runs } runs (page ${ page }):` );
	console.log( `  p95 latency : median ${ summary.p95Ms.median } ms  min ${ summary.p95Ms.min }  max ${ summary.p95Ms.max }  spread ${ ( summary.p95Ms.spread * 100 ).toFixed( 1 ) }%` );
	console.log( `  heap (GC'd) : median ${ ( summary.heapBytes.median / MIB ).toFixed( 2 ) } MiB  min ${ ( summary.heapBytes.min / MIB ).toFixed( 2 ) }  max ${ ( summary.heapBytes.max / MIB ).toFixed( 2 ) }  spread ${ ( summary.heapBytes.spread * 100 ).toFixed( 1 ) }%` );
	console.log( `  written to ${ out }` );
}

/** Prints this run's medians against a baseline's and returns true when p95 or heap is over TOLERANCE. */
export function compareToBaseline( summary, baseline, label ) {
	const bp = baseline.summary.p95Ms.median, bh = baseline.summary.heapBytes.median;
	const dp = summary.p95Ms.median / bp - 1, dh = summary.heapBytes.median / bh - 1;
	console.log( `\n${ label }` );
	console.log( `  p95 latency : now ${ summary.p95Ms.median } ms   baseline ${ bp } ms   change ${ ( dp * 100 ).toFixed( 1 ) }%   ${ dp > TOLERANCE ? '*** OVER 10% ***' : 'ok' }` );
	console.log( `  heap (GC'd) : now ${ ( summary.heapBytes.median / MIB ).toFixed( 2 ) } MiB   baseline ${ ( bh / MIB ).toFixed( 2 ) } MiB   change ${ ( dh * 100 ).toFixed( 1 ) }%   ${ dh > TOLERANCE ? '*** OVER 10% ***' : 'ok' }` );
	return dp > TOLERANCE || dh > TOLERANCE;
}
