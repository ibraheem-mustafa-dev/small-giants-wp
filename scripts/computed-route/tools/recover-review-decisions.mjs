// Recovers Bean's skeleton choices from the committed history of a client's intake record into its decisions file.
//   node scripts/computed-route/tools/recover-review-decisions.mjs <client> [--apply] [--repo <root>]
// Until 2026-11-01 --apply-review saved only block:<slug>, remove and finaliser-pick marks, so an accepted proposal lived
// only as a review mark and was lost when the rules later proposed something else. This replays every committed
// version of sites/<client>/build/intake/intake.json through lib/intake-run-finalise.mjs::reviewDecisions (which now
// saves accepts too), oldest first so the newest mark wins, and keeps a decision only when:
//   - the decisions file has no entry for that surface and key (a saved decision is never replaced);
//   - today's record still has that key on the same element, tag and words (a re-export renumbers elements);
//   - today's proposal for the row does not follow a Bean ruling dated after the mark (his later ruling stands).
// Without --apply it prints what it would save. Exit 0 done, 1 failure, 2 usage.

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reviewDecisions } from '../lib/intake-run-finalise.mjs';
import { readDecisions } from '../lib/skeleton-finalise.mjs';

const DEFAULT_REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

// The dates of the Bean rulings a row's reason cites ("(Bean, 2026-10-31)", "Bean 2026-10-13").
export const rulingDates = ( row ) => [ ...JSON.stringify( row?.reason ?? '' ).matchAll( /Bean[^)"]*?(20\d\d-\d\d-\d\d)/g ) ].map( ( m ) => m[ 1 ] );

// The rows of an intake record by surface and key.
const rowsByKey = ( intake ) => {
	const out = new Map();
	for ( const [ surface, s ] of Object.entries( intake.skeletons || {} ) ) {
		for ( const r of s.rows || [] ) {
			for ( const key of r.keys || [ r.key ] ) {
				out.set( `${ surface }\u0000${ key }`, r );
			}
		}
	}
	return out;
};

// The decisions to recover: [ { surface, key, decision } ]. versions: [ { date, intake } ] oldest first; saved: the
// decisions file's `surfaces`; current: today's intake record.
export function recoverDecisions( { versions, saved = {}, current } ) {
	const now = rowsByKey( current );
	const found = new Map();
	for ( const { date, intake } of versions ) {
		const markedOn = new Map( ( intake.review || [] ).filter( ( e ) => e.mark && e.markedOn ).map( ( e ) => [ e.rowId, e.markedOn ] ) );
		for ( const d of reviewDecisions( intake, date ) ) {
			found.set( `${ d.surface }\u0000${ d.element.key }`, { ...d, markedOn: markedOn.get( `skeleton:${ d.surface }:${ d.element.key }` ) ?? date } );
		}
	}
	const out = [];
	for ( const [ id, d ] of found ) {
		if ( saved[ d.surface ]?.[ d.element.key ] ) {
			continue;
		}
		// A re-export renumbers the draft's elements: the mark is kept only where today's record still has that key on the
		// same element (tag and words), so a mark never lands on another element under a reused number.
		const today = now.get( id );
		const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
		if ( ! today || today.tag !== d.element.tag || squash( today.words ) !== squash( d.element.words ) ) {
			continue;
		}
		if ( rulingDates( now.get( id ) ).some( ( r ) => r > d.markedOn ) ) {
			continue;
		}
		const choice = d.choice.remove ? { remove: true } : { block: d.choice.block, ...( d.choice.attributes ? { attributes: d.choice.attributes } : {} ) };
		out.push( { surface: d.surface, key: d.element.key, decision: { ...choice, signature: `${ d.element.tag }|${ String( d.element.words ?? '' ).replace( /\s+/g, ' ' ).trim() }`, reason: `${ d.reason } (recovered from the review history, 2026-11-01)`, ...( d.proposed ? { proposed: d.proposed } : {} ) } } );
	}
	return out;
}

function main( argv ) {
	const client = argv.find( ( a ) => ! a.startsWith( '--' ) && argv[ argv.indexOf( a ) - 1 ] !== '--repo' );
	const repo = argv.includes( '--repo' ) ? path.resolve( argv[ argv.indexOf( '--repo' ) + 1 ] ) : DEFAULT_REPO;
	if ( ! client ) {
		console.error( 'usage: node tools/recover-review-decisions.mjs <client> [--apply] [--repo <root>]' );
		return 2;
	}
	const rel = `sites/${ client }/build/intake/intake.json`;
	const git = ( args ) => execFileSync( 'git', args, { cwd: repo, maxBuffer: 1024 * 1024 * 1024 } ).toString();
	const commits = git( [ 'log', '--reverse', '--format=%h %cs', '--', rel ] ).trim().split( '\n' ).filter( Boolean );
	const versions = commits.flatMap( ( line ) => {
		const [ hash, date ] = line.split( ' ' );
		try {
			return [ { date, intake: JSON.parse( git( [ 'show', `${ hash }:${ rel }` ] ) ) } ];
		} catch {
			return [];
		}
	} );
	const file = path.join( repo, 'sites', client, 'build', 'skeleton', 'decisions.json' );
	const all = readDecisions( file );
	const current = JSON.parse( fs.readFileSync( path.join( repo, rel ), 'utf8' ) );
	const list = recoverDecisions( { versions, saved: all.surfaces || {}, current } );
	const bySurface = {};
	list.forEach( ( d ) => ( bySurface[ d.surface ] = ( bySurface[ d.surface ] || 0 ) + 1 ) );
	console.log( `${ client }: ${ list.length } decisions to recover from ${ versions.length } versions (${ Object.entries( bySurface ).map( ( [ s, n ] ) => `${ s } ${ n }` ).join( ', ' ) })` );
	if ( argv.includes( '--apply' ) && list.length ) {
		all.surfaces ||= {};
		for ( const d of list ) {
			( all.surfaces[ d.surface ] ||= {} )[ d.key ] = d.decision;
		}
		fs.writeFileSync( file, `${ JSON.stringify( all, null, '\t' ) }\n` );
		console.log( `written ${ path.relative( repo, file ) }` );
	}
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
