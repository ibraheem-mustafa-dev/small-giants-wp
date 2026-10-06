// The whole-site sweep (FR-47-3): every surface's latest Solve report as one row per distinct open issue. An issue is
// solve-report.mjs::wholePage's: a style, hover or box difference on one element and property, whatever the width or
// state, from the surface's own blocks and the rows that carry no block. A row two surfaces share (one hand config
// walked by both: a block-less row keyed by its pair name, which only means the same element within one config)
// counts once on the site, under the first surface; the later surfaces are named in its `alsoIn`.
import fs from 'fs';
import path from 'path';
// The kinds, classes, order and issue key are shared with lib/triage.mjs so the two counts agree by construction.
import { SOLVE_CLASSES as CLASSES, UNMAPPED, CONTENT, isContentRow, isIssue, issueKey, normalisedIssueKey } from './issue-classes.mjs';

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

// Where a surface's report stands against its runs: { file, stale }. `file` is what latestReport returns. `stale` is null
// for a current report, else { reason, report, newestRun }: 'incomplete-run' when the surface's newest run directory holds
// no solve-report.json (a Solve that failed part-way, so `file` is an older run's report), or 'predates-sweep' when the
// report was written before `sweepStart` (epoch ms; omitted, this check is skipped).
export function reportStatus( solveDir, surface, sweepStart = null ) {
	const file = latestReport( solveDir, surface );
	const dir = path.join( solveDir, surface );
	const runs = fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( d ) => fs.statSync( path.join( dir, d ) ).isDirectory() ).sort() : [];
	const newestRun = runs.length ? runs[ runs.length - 1 ] : null;
	if ( ! file ) {
		return { file, stale: null };
	}
	if ( newestRun && ! fs.existsSync( path.join( dir, newestRun, 'solve-report.json' ) ) ) {
		return { file, stale: { reason: 'incomplete-run', report: file, newestRun } };
	}
	if ( null !== sweepStart && fs.statSync( file ).mtimeMs < sweepStart ) {
		return { file, stale: { reason: 'predates-sweep', report: file, newestRun } };
	}
	return { file, stale: null };
}

// The measurement-quality caveats in a walker's per-side result(s). `source` is one `{ states }` result or a map of them
// (the walker's draft cache: `<cache key> -> { states }`). Each state's `findings` (kind reveal-unfired and any other the
// walker emits) and `unsettled` become one caveat each: a statement about the instrument, never an issue row.
export function walkerCaveats( source ) {
	const sides = source?.states ? [ [ source.width ?? null, source ] ] : Object.values( source || {} ).map( ( v ) => [ v?.width ?? null, v ] );
	const out = [];
	for ( const [ width, side ] of sides ) {
		for ( const [ state, st ] of Object.entries( side?.states || {} ) ) {
			for ( const f of st?.findings || [] ) {
				out.push( { kind: f.kind, state, width, detail: f } );
			}
			if ( st?.unsettled ) {
				out.push( { kind: 'unsettled', state, width, detail: st.unsettled } );
			}
		}
	}
	return out;
}

// The caveats of a surface's run, read from the walker's draft caches (`draft-cache-*.json`) beside its solve-report.json.
// The cache is the only place the walker persists `states`; a width's cache entry carries the width in its key.
export function readWalkerCaveats( reportPath ) {
	const dir = path.dirname( reportPath );
	const out = [];
	for ( const f of fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( n ) => /^draft-cache-.*\.json$/.test( n ) ).sort() : [] ) {
		let cache;
		try {
			cache = JSON.parse( fs.readFileSync( path.join( dir, f ), 'utf8' ) );
		} catch {
			continue;
		}
		for ( const [ k, side ] of Object.entries( cache ) ) {
			let width = null;
			try {
				width = JSON.parse( k ).width ?? null;
			} catch { /* a key that is not JSON carries no width */ }
			out.push( ...walkerCaveats( { states: side?.states, width } ) );
		}
	}
	return out;
}

// The difference between two sweeps' rows, compared on the normalised key so a positional selector appearing or
// vanishing in an emitted path is not read as a close plus an open. Occurrences are counted per key, so rows that
// differ only by position stay distinct findings. `prev` and `next` are aggregate() results or their `rows` arrays.
export function sweepDelta( prev, next ) {
	const count = ( rows ) => {
		const m = new Map();
		for ( const r of Array.isArray( rows ) ? rows : rows.rows ) {
			const k = normalisedIssueKey( { ref: r.ref, pair: r.pair, path: r.path, kind: r.kind, key: r.property } );
			m.set( k, ( m.get( k ) || 0 ) + 1 );
		}
		return m;
	};
	const a = count( prev );
	const b = count( next );
	let closed = 0;
	let opened = 0;
	let kept = 0;
	for ( const k of new Set( [ ...a.keys(), ...b.keys() ] ) ) {
		const x = a.get( k ) || 0;
		const y = b.get( k ) || 0;
		kept += Math.min( x, y );
		closed += Math.max( 0, x - y );
		opened += Math.max( 0, y - x );
	}
	return { closed, opened, kept };
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

// entries: [ { surface, reportPath, report, config?, stale?, caveats? } ] in surfaces.json order (config: the surface's hand walker config,
// so block-less rows from different configs never merge; stale: reportStatus's `stale`; caveats: walkerCaveats' list);
// unmeasured: surfaces with no report. A stale surface is named under `stale` and a caveated one under `caveated`, each
// with its own detail; neither changes any count.
export function aggregate( entries, unmeasured = [], date = null ) {
	const surfaces = {};
	const staleSurfaces = {};
	const caveated = {};
	const site = new Map();
	for ( const { surface, reportPath, report, config = surface, stale = null, caveats = [] } of entries ) {
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
		if ( stale ) {
			staleSurfaces[ surface ] = stale;
		}
		if ( caveats.length ) {
			caveated[ surface ] = caveats;
		}
	}
	const all = [ ...site.values() ];
	const byClass = emptyCounts();
	all.forEach( ( r ) => byClass[ r.class ]++ );
	return { date, surfaces, unmeasured, stale: staleSurfaces, caveated, total: all.length, byClass, rows: all };
}
