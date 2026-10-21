// The skeleton standing rules measured against the client's approved review outcomes (Spec 48 FR-48-6):
//   node scripts/computed-route/check-approved.mjs <client> [--no-built]
// Proposes every surface again offline (lib/skeleton-rerun.mjs, from the inventories the last intake saved, with the
// motion inventory's loop records and no finaliser picks) and compares each row Bean approved in
// sites/<client>/build/intake/approved-decisions.json (category3, every batch) with what the rules propose: the block,
// the action family (remove, absorbed and unwrap are one family: the element is not built), and his link rulings ("not
// linked": no link on the element; "link source <x>": that link source). An approval names a template element, so it is
// checked against every copy of it (lib/approved-check.mjs) and each copy that disagrees is listed. A row a client-built
// post settles is counted apart; a row whose approved outcome is a block setting rather than a block is listed apart.
// --no-built proposes even the surfaces the client built, to measure the rules alone. Exit 0 when nothing mismatches,
// 1 otherwise, 2 on usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rerunSkeletons, loopingKeys } from './lib/skeleton-rerun.mjs';
import { openDb } from './lib/db.mjs';
import { assertCurrent } from './lib/freshness.mjs';
import { checkApproval } from './lib/approved-check.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const [ client, ...flags ] = process.argv.slice( 2 );
if ( ! client || ! /^[a-z0-9-]+$/.test( client ) ) {
	process.stderr.write( 'usage: node scripts/computed-route/check-approved.mjs <client> [--no-built]\n' );
	process.exit( 2 );
}
const dir = path.join( REPO, 'sites', client, 'build', 'intake' );
const intake = JSON.parse( fs.readFileSync( path.join( dir, 'intake.json' ), 'utf8' ) );
assertCurrent( intake, path.join( REPO, 'sites', client, 'handoff' ), { label: `sites/${ client }/build/intake/intake.json` } );
const approved = JSON.parse( fs.readFileSync( path.join( dir, 'approved-decisions.json' ), 'utf8' ) );
const db = openDb();
const run = rerunSkeletons( { client, db, repo: REPO, skeletons: intake.skeletons, motion: loopingKeys( intake.inventory?.animations ), useBuilt: ! flags.includes( '--no-built' ) } );
db.close();

const rows = {};
const fingerprints = {};
for ( const [ slug, s ] of Object.entries( run.surfaces ) ) {
	s.rows.forEach( ( r ) => ( rows[ `skeleton:${ slug }:${ r.key }` ] = { ...r, surface: slug, built: s.built } ) );
	fingerprints[ slug ] = s.fingerprints;
}
const out = { match: 0, mismatch: [], builtSettled: 0, settings: 0, noRow: [], refused: [], realigned: [], unverified: 0 };
for ( const [ batch, list ] of Object.entries( approved.category3 || {} ) ) {
	for ( const a of list ) {
		const res = checkApproval( a, { rows, fingerprints } );
		if ( res.refused ) {
			out.refused.push( `${ batch } ${ a.rowId }: ${ res.refused }` );
			continue;
		}
		'realigned' === res.how && out.realigned.push( `${ batch } ${ a.rowId } -> ${ res.to }` );
		'unchecked' === res.how && out.unverified++;
		if ( res.noRow ) {
			out.noRow.push( `${ batch } ${ a.rowId }` );
		} else if ( res.settled ) {
			out.builtSettled++;
		} else if ( res.setting ) {
			out.settings++;
		} else if ( res.match ) {
			out.match++;
		} else {
			res.mismatches.forEach( ( l ) => out.mismatch.push( `${ batch } ${ l }` ) );
		}
	}
}
console.log( `${ client }: ${ out.match } match, ${ out.mismatch.length } mismatch, ${ out.builtSettled } settled by built posts, ${ out.settings } approved as settings, ${ out.noRow.length } with no row; inventories missing: ${ run.missing.join( ', ' ) || 'none' }` );
out.mismatch.forEach( ( l ) => console.log( `  MISMATCH ${ l }` ) );
out.refused.forEach( ( l ) => console.log( `  REFUSED ${ l }` ) );
out.realigned.forEach( ( l ) => console.log( `  REALIGNED ${ l }` ) );
out.unverified && console.error( `${ out.unverified } approvals carry no fingerprint: a renumbered export cannot be detected for them` );
process.exitCode = out.mismatch.length || out.refused.length ? 1 : 0;
