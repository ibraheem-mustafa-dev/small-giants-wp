// Ranks a site run's open walker rows (PF11). A clone run leaves thousands of open rows per page and a real gap is one row in
// about two thousand, so the run ends by collapsing the rows of one cause into one ranked row and handing the top rows to the
// gate chain, which turns them into sites/<client>/build/qa/gaps.json and the framework backlog.
//
// A cause is one property difference: the same row kind, property and draft and live values on the same element path
// (positional selectors dropped), whatever the width, state or page. Its rank is read from the rows themselves:
//   magnitude  how far the live value is from the draft's (relative for lengths and numbers, 1 for any other difference
//              and for content rows, whose difference is whole);
//   area       ln(1 + the painted box of the element, in px squared, from the walker's own pair box);
//   repeats    1 + ln(rows of the cause) and 1 + ln(pages it shows on): a cause that repeats across widths, elements and
//              pages is a framework gap rather than a one-off.
// score = magnitude * area * repeats. Only rows lib/issue-classes.mjs::isIssue counts are ranked.
//
// The gate chain reads a Solve report and a walker report beside it. A site run has no Solve stage, so the adapter files the
// ranked rows the way Solve files a row it did not resolve (`classes.other`) and writes the walker report as round-1; every
// gate then judges the rows exactly as it does after a Solve.
import fs from 'fs';
import path from 'path';
import { isIssue, normalisePath } from './issue-classes.mjs';

export const TOP_N = 50;

const num = ( v ) => {
	const m = /^\s*(-?\d*\.?\d+)\s*(px|em|rem|%|)\s*$/.exec( String( v ?? '' ) );
	return m ? Number( m[ 1 ] ) : null;
};

// How far a row's live value is from its draft value, 0 to 1.
export function magnitude( row ) {
	const [ d, l ] = [ num( row.draft ), num( row.live ) ];
	return null === d || null === l ? 1 : Math.min( 1, Math.abs( d - l ) / Math.max( Math.abs( d ), Math.abs( l ), 1 ) );
}

// The open issue rows of one walker report, each with its pair's painted area.
export function openIssueRows( report ) {
	const out = [];
	for ( const run of report?.runs || [] ) {
		for ( const [ pair, p ] of Object.entries( run.pairs || {} ) ) {
			const box = p.live?.box || p.draft?.box;
			const area = box?.w && box?.h ? box.w * box.h : 0;
			for ( const d of p.diffs || [] ) {
				if ( ! d.accepted && isIssue( d ) ) {
					out.push( { ...d, pair, state: run.state, width: run.width, area } );
				}
			}
		}
	}
	return out;
}

const causeKey = ( r ) => [ r.kind, r.key, r.draft ?? '', r.live ?? '', normalisePath( r.path ) ].join( '|' );

// pages: { surface: walker report }. Returns { total, ranked }, ranked highest first; each row is the best-scoring member of
// its cause with { surface, causeKey, count, pages, score }, and `members` lists every surface holding the cause.
export function rankRows( pages, { limit = TOP_N } = {} ) {
	const causes = new Map();
	let total = 0;
	for ( const [ surface, report ] of Object.entries( pages ) ) {
		for ( const row of openIssueRows( report ) ) {
			total++;
			const k = causeKey( row );
			const c = causes.get( k ) || { key: k, count: 0, surfaces: new Set(), best: null };
			c.count++;
			c.surfaces.add( surface );
			if ( ! c.best || row.area > c.best.row.area ) {
				c.best = { row, surface };
			}
			causes.set( k, c );
		}
	}
	const scored = [ ...causes.values() ].map( ( c ) => ( {
		...c.best.row, surface: c.best.surface, causeKey: c.key, count: c.count, pages: c.surfaces.size, members: [ ...c.surfaces ].sort(),
		score: Number( ( magnitude( c.best.row ) * Math.log( 1 + c.best.row.area ) * ( 1 + Math.log( c.count ) ) * ( 1 + Math.log( c.surfaces.size ) ) ).toFixed( 4 ) ),
	} ) );
	scored.sort( ( a, b ) => b.score - a.score || a.causeKey.localeCompare( b.causeKey ) );
	return { total, causes: scored.length, ranked: scored.slice( 0, limit ) };
}

// The Solve-shaped report the gate chain reads for one surface: the ranked rows of that surface, filed as unresolved.
export const solveShaped = ( surface, ranked ) => ( {
	surface,
	classes: { hardcode: [], missing: [], unresolved: [], derived: [], other: ranked.filter( ( r ) => r.surface === surface ).map( ( { surface: _s, causeKey, count, pages, members, score, area, ...row } ) => row ) },
} );

// Reads each surface's walker report under parityOut/<surface>/report.json, ranks them, writes
// <runDir>/ranked-top<N>.json and, per surface with ranked rows, <runDir>/gate/<surface>/solve-report.json plus the walker
// report as round-1/report.json. Returns { file, total, causes, ranked, surfaces } (surfaces: those with rows to chain).
export function writeRanking( { runDir, parityOut, surfaces, limit = TOP_N } ) {
	const pages = {};
	for ( const s of surfaces ) {
		const f = path.join( parityOut, s, 'report.json' );
		fs.existsSync( f ) && ( pages[ s ] = JSON.parse( fs.readFileSync( f, 'utf8' ) ) );
	}
	const { total, causes, ranked } = rankRows( pages, { limit } );
	const file = path.join( runDir, `ranked-top${ limit }.json` );
	fs.mkdirSync( runDir, { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( { openRows: total, causes, ranked }, null, 1 ) );
	const chained = [ ...new Set( ranked.map( ( r ) => r.surface ) ) ];
	for ( const s of chained ) {
		const dir = path.join( runDir, 'gate', s );
		fs.mkdirSync( path.join( dir, 'round-1' ), { recursive: true } );
		fs.writeFileSync( path.join( dir, 'solve-report.json' ), JSON.stringify( solveShaped( s, ranked ), null, 1 ) );
		fs.writeFileSync( path.join( dir, 'round-1', 'report.json' ), JSON.stringify( pages[ s ] ) );
	}
	return { file, total, causes, ranked, surfaces: chained };
}
