// The coverage map as a register of solved gaps: worked examples for a new gap (--like), the gaps a draft's review
// reports (--drafts) and the one-off test backfill (--backfill-tests).
import fs from 'fs';
import path from 'path';
import { REPO } from './capabilities.mjs';
import { statusOf } from './clone-coverage.mjs';

const prefixOf = ( id ) => id.split( ':' )[ 0 ];

// Covered entries that solve a gap the way `id` does: the same write reference, or, when `id` has no write reference,
// the same id prefix before the first colon. Returns [ { id, entry } ], or null when `id` has no entry.
export function likeEntries( coverage, id ) {
	const entries = coverage.entries || {};
	const base = entries[ id ];
	if ( ! base ) {
		return null;
	}
	const same = base.write ? ( e ) => e.write === base.write : ( _e, k ) => prefixOf( k ) === prefixOf( id );
	return Object.entries( entries ).filter( ( [ k, e ] ) => k !== id && 'covered' === statusOf( e ) && same( e, k ) ).map( ( [ k, e ] ) => ( { id: k, entry: e } ) );
}

// The capability ids a review.md names in `missing:coverage:<id>` cells.
export function reviewCoverageIds( markdown ) {
	return [ ...String( markdown ).matchAll( /`missing:coverage:([^`]+)`/g ) ].map( ( m ) => m[ 1 ] );
}

// The review file of every draft under sites/*/build/intake/review.md, as { draft, markdown }.
export function readReviews( root = REPO ) {
	const sitesDir = path.join( root, 'sites' );
	if ( ! fs.existsSync( sitesDir ) ) {
		return [];
	}
	return fs.readdirSync( sitesDir ).map( ( draft ) => ( { draft, file: path.join( sitesDir, draft, 'build', 'intake', 'review.md' ) } ) )
		.filter( ( r ) => fs.existsSync( r.file ) ).map( ( r ) => ( { draft: r.draft, markdown: fs.readFileSync( r.file, 'utf8' ) } ) );
}

// The ids still a gap, grouped by wave: { byWave: { wave: { id: [ draft, ... ] } }, ids, drafts: { draft: count } }.
export function draftGaps( coverage, reviews ) {
	const entries = coverage.entries || {};
	const byWave = {};
	const drafts = {};
	for ( const { draft, markdown } of reviews ) {
		for ( const id of new Set( reviewCoverageIds( markdown ) ) ) {
			if ( 'gap' !== statusOf( entries[ id ] ) ) {
				continue;
			}
			const wave = entries[ id ]?.wave || 'none';
			byWave[ wave ] ||= {};
			byWave[ wave ][ id ] = [ ...( byWave[ wave ][ id ] || [] ), draft ].sort();
			drafts[ draft ] = ( drafts[ draft ] || 0 ) + 1;
		}
	}
	const ids = Object.values( byWave ).reduce( ( n, w ) => n + Object.keys( w ).length, 0 );
	return { byWave, ids, drafts };
}

// For each covered entry with no test, the test file its note names when that file exists; the rest are returned as
// the baseline. Returns { coverage, backfilled, baseline }.
export function backfillTests( coverage, root = REPO ) {
	const entries = {};
	const baseline = [];
	let backfilled = 0;
	for ( const [ id, e ] of Object.entries( coverage.entries || {} ) ) {
		entries[ id ] = e;
		if ( 'covered' !== statusOf( e ) || e.test ) {
			continue;
		}
		const m = String( e.note || '' ).match( /(?:scripts\/computed-route\/)?tests\/[\w.-]+\.test\.mjs/ );
		const rel = m ? ( m[ 0 ].startsWith( 'scripts/' ) ? m[ 0 ] : `scripts/computed-route/${ m[ 0 ] }` ) : null;
		if ( rel && fs.existsSync( path.join( root, rel ) ) ) {
			entries[ id ] = { ...e, test: rel };
			backfilled++;
		} else {
			baseline.push( id );
		}
	}
	return { coverage: { ...coverage, entries }, backfilled, baseline: baseline.sort() };
}
