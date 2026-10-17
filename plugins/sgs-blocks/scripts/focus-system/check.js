'use strict';

/**
 * The ratchet for check-focus-system.js (plan §3, "Gate"): a ratcheted-ceiling gate whose
 * ceiling is the content-keyed baseline file. --check fails on a target finding the baseline
 * does not hold, on a baseline entry no longer reproduced (the baseline must shrink), on a stale
 * allow or registry entry, on `unrecognised`, and on any corpus-control failure. --strict ignores
 * the baseline. With no baseline file the gate is binary.
 *
 * @package SGS\Blocks
 */

/** @returns {Object<string, {count:number, category:string, group:string}>} */
function tally( findings ) {
	const out = {};
	for ( const f of findings ) {
		if ( ! out[ f.key ] ) {
			out[ f.key ] = { count: 0, category: f.category, group: f.group };
		}
		out[ f.key ].count++;
	}
	return out;
}

function baselineFromCensus( census ) {
	return { findings: tally( census.findings.filter( ( f ) => 'unrecognised' !== f.category ) ) };
}

/**
 * @param {Object} census
 * @param {Object|null} baseline  parsed baseline file, or null (binary)
 * @param {{ strict?: boolean, group?: string, width?: string[] }} opts
 * @returns {{ failures: string[], fresh: string[], stale: string[] }}
 */
function runCheck( census, baseline, opts ) {
	const o = opts || {};
	const inGroup = ( g ) => ! o.group || g === o.group;
	const current = tally( census.findings.filter( ( f ) => inGroup( f.group ) ) );
	const base = o.strict || ! baseline ? {} : baseline.findings || {};
	const fresh = [];
	const stale = [];
	for ( const [ key, cur ] of Object.entries( current ) ) {
		const allowed = base[ key ] ? base[ key ].count : 0;
		if ( 'unrecognised' === cur.category || cur.count > allowed ) {
			fresh.push( `${ key }  (now ${ cur.count }, baseline ${ allowed })` );
		}
	}
	if ( ! o.strict && baseline ) {
		for ( const [ key, b ] of Object.entries( base ) ) {
			if ( ! inGroup( b.group ) ) {
				continue;
			}
			const now = current[ key ] ? current[ key ].count : 0;
			if ( now < b.count ) {
				stale.push( `${ key }  (baseline ${ b.count }, now ${ now }): run --prune-baseline` );
			}
		}
	}
	const failures = [
		...fresh.map( ( f ) => `new focus finding: ${ f }` ),
		...stale.map( ( s ) => `stale baseline entry: ${ s }` ),
		...census.staleAllow.map( ( a ) => `stale allow entry (matches no rule): ${ a }` ),
		...census.staleRegistry.map( ( r ) => `stale emitter-registry entry: ${ r }` ),
		...census.control.failures.map( ( c ) => `corpus control: ${ c }` ),
		...( o.width || [] ).map( ( w ) => `corpus width: ${ w }` ),
	];
	return { failures, fresh, stale };
}

/** Lower every baseline entry to the live count; never add or raise one. */
function pruneBaseline( census, baseline ) {
	const current = tally( census.findings );
	const next = {};
	let removed = 0;
	for ( const [ key, b ] of Object.entries( baseline.findings || {} ) ) {
		const now = current[ key ] ? current[ key ].count : 0;
		const keep = Math.min( now, b.count );
		removed += b.count - keep;
		if ( keep > 0 ) {
			next[ key ] = { ...b, count: keep };
		}
	}
	return { baseline: { ...baseline, findings: next }, removed };
}

module.exports = { tally, baselineFromCensus, runCheck, pruneBaseline };
