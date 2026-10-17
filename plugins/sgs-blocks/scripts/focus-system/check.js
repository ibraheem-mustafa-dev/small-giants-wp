'use strict';

/**
 * The binary gate for check-focus-system.js (plan §3, "Gate"): --check fails on any finding in a
 * target category, on `unrecognised`, on a stale allow or registry entry, and on any
 * corpus-control failure. There is no baseline and no ceiling; a zero is the only pass.
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

/**
 * @param {Object} census
 * @param {{ group?: string, width?: string[] }} opts
 * @returns {{ failures: string[], fresh: string[] }}
 */
function runCheck( census, opts ) {
	const o = opts || {};
	const inGroup = ( g ) => ! o.group || g === o.group;
	const current = tally( census.findings.filter( ( f ) => inGroup( f.group ) ) );
	const fresh = [];
	for ( const [ key, cur ] of Object.entries( current ) ) {
		fresh.push( `${ key }  (${ cur.count })` );
	}
	const failures = [
		...fresh.map( ( f ) => `new focus finding: ${ f }` ),
		...census.staleAllow.map( ( a ) => `stale allow entry (matches no rule): ${ a }` ),
		...census.staleRegistry.map( ( r ) => `stale emitter-registry entry: ${ r }` ),
		...census.control.failures.map( ( c ) => `corpus control: ${ c }` ),
		...( o.width || [] ).map( ( w ) => `corpus width: ${ w }` ),
	];
	return { failures, fresh };
}

module.exports = { tally, runCheck };
