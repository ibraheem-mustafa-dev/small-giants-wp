// The whole-site sweep (FR-47-3): every surface's latest Solve report as one row per distinct open issue. An issue is
// solve-report.mjs::wholePage's: a style, hover or box difference on one element and property, whatever the width or
// state, from the surface's own blocks and the rows that carry no block. A row two surfaces share (one hand config
// walked by both: a block-less row keyed by its pair name, which only means the same element within one config)
// counts once on the site, under the first surface; the later surfaces are named in its `alsoIn`.
import fs from 'fs';
import path from 'path';
// The kinds, classes, order and issue key are shared with lib/triage.mjs so the two counts agree by construction.
import { SOLVE_CLASSES as CLASSES, UNMAPPED, CONTENT, isContentRow, isIssue, issueKey } from './issue-classes.mjs';

const one = ( list ) => ( 1 === list.length ? list[ 0 ] : list );
const emptyCounts = () => Object.fromEntries( [ ...CLASSES, UNMAPPED, CONTENT ].map( ( c ) => [ c, 0 ] ) );

// The newest solve-report.json of a surface under `<solveDir>/<surface>/<timestamp dir>/`, or null.
export function latestReport( solveDir, surface ) {
	const dir = path.join( solveDir, surface );
	if ( ! fs.existsSync( dir ) ) {
		return null;
	}
	const runs = fs.readdirSync( dir ).filter( ( d ) => fs.existsSync( path.join( dir, d, 'solve-report.json' ) ) ).sort();
	return runs.length ? path.join( dir, runs[ runs.length - 1 ], 'solve-report.json' ) : null;
}

// One row per distinct open issue of a report (with its issue key), plus the count of its non-visual (`other`) rows.
export function issueRows( report, surface, reportPath ) {
	const prefix = `cr-ref-${ surface }-`;
	const mine = ( x ) => ! x.ref || ( x.ref.startsWith( prefix ) && /^\d+$/.test( x.ref.slice( prefix.length ) ) );
	const found = new Map();
	for ( const cls of [ ...CLASSES, UNMAPPED, CONTENT ] ) {
		for ( const x of report.classes?.[ [ UNMAPPED, CONTENT ].includes( cls ) ? 'other' : cls ] || [] ) {
			// UNMAPPED takes visual rows only and CONTENT content rows only; a Solve class takes either.
			if ( ! isIssue( x ) || ! mine( x ) || ( UNMAPPED === cls && isContentRow( x ) ) || ( CONTENT === cls && ! isContentRow( x ) ) ) {
				continue;
			}
			const k = issueKey( x );
			if ( ! found.has( k ) ) {
				found.set( k, { key: k, cls, rows: [] } );
			}
			found.get( k ).rows.push( x );
		}
	}
	const rows = [ ...found.values() ].map( ( { key, cls, rows: group } ) => {
		const states = [ ...new Set( group.map( ( x ) => x.state ) ) ];
		return {
			key,
			row: {
				surface,
				ref: group[ 0 ].ref ?? null,
				// A block-less row (a hand pair measuring no block) is named by its pair.
				pair: group[ 0 ].ref ? null : group[ 0 ].pair ?? null,
				path: group[ 0 ].path ?? null,
				block: group.find( ( x ) => x.block )?.block ?? null,
				property: group[ 0 ].key,
				widths: [ ...new Set( group.map( ( x ) => x.width ) ) ].sort( ( a, b ) => a - b ),
				state: one( states ),
				kind: group[ 0 ].kind,
				class: cls,
				reason: group.find( ( x ) => x.reason )?.reason ?? null,
				// What the row reads: each distinct draft and live pair over its widths and states (at most 6), so a verdict can
				// quote the difference it relies on.
				values: [ ...new Map( group.map( ( x ) => [ JSON.stringify( [ x.draft, x.live ] ), { draft: x.draft ?? null, live: x.live ?? null } ] ) ).values() ].slice( 0, 6 ),
				report: reportPath,
			},
		};
	} );
	return { rows, otherRows: ( report.classes?.other || [] ).filter( ( x ) => ! isIssue( x ) ).length };
}

// entries: [ { surface, reportPath, report, config? } ] in surfaces.json order (config: the surface's hand walker config,
// so block-less rows from different configs never merge); unmeasured: surfaces with no report.
export function aggregate( entries, unmeasured = [], date = null ) {
	const surfaces = {};
	const site = new Map();
	for ( const { surface, reportPath, report, config = surface } of entries ) {
		const { rows, otherRows } = issueRows( report, surface, reportPath );
		const byClass = emptyCounts();
		for ( const { key: issue, row } of rows ) {
			byClass[ row.class ]++;
			const key = row.ref ? issue : `${ config }|${ issue }`;
			if ( site.has( key ) ) {
				( site.get( key ).alsoIn ||= [] ).push( surface );
			} else {
				site.set( key, row );
			}
		}
		surfaces[ surface ] = { report: reportPath, issues: rows.length, byClass, otherRows, wholePageAfter: report.wholePage?.after ?? null };
	}
	const all = [ ...site.values() ];
	const byClass = emptyCounts();
	all.forEach( ( r ) => byClass[ r.class ]++ );
	return { date, surfaces, unmeasured, total: all.length, byClass, rows: all };
}
