// The skeleton rules measured against the client's approved review outcomes (Spec 48 FR-48-6):
//   node scripts/computed-route/check-approved.mjs <client> [--no-built]
// Proposes every surface again offline (lib/skeleton-rerun.mjs, from the inventories the last intake saved, with the
// motion inventory's loop records and no finaliser picks) and compares each row Bean approved in
// sites/<client>/build/intake/approved-decisions.json (category3, every batch) with what the rules propose: the block,
// the action family (remove, absorbed and unwrap are one family: the element is not built), and his link rulings ("not
// linked": no link on the element; "link source <x>": that link source). A row a client-built post settles is counted
// apart; a row whose approved outcome is a block setting rather than a block is listed apart. --no-built proposes even
// the surfaces the client built, to measure the rules alone. Exit 0 when nothing mismatches, 1 otherwise, 2 on usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rerunSkeletons, loopingKeys } from './lib/skeleton-rerun.mjs';
import { openDb } from './lib/db.mjs';
import { assertCurrent } from './lib/freshness.mjs';
import { resolveApproval } from './lib/approved-identity.mjs';

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

const NOT_BUILT = [ 'remove', 'absorbed', 'unwrap' ];
const wanted = ( text ) => {
	const t = String( text || '' );
	if ( /^(remove|absorbed)/i.test( t ) ) {
		return { kind: 'removed' };
	}
	const block = /sgs\/[a-z0-9-]+/.exec( t )?.[ 0 ];
	// "link source 'back to top'" is the source `top`; "link source directions = …" is `directions`.
	const phrase = /link source (?:'|")?([a-z][a-z ]*?)(?:'|"|\s=|\s\(|,|\)|$)/i.exec( t )?.[ 1 ]?.toLowerCase().trim() || null;
	const source = { 'back to top': 'top' }[ phrase ] || phrase;
	return block ? { kind: 'block', block, notLinked: /\bnot linked\b/i.test( t ), source } : { kind: 'setting' };
};
const rows = {};
const fingerprints = {};
for ( const [ slug, s ] of Object.entries( run.surfaces ) ) {
	s.rows.forEach( ( r ) => ( rows[ `skeleton:${ slug }:${ r.key }` ] = { ...r, surface: slug, built: s.built } ) );
	fingerprints[ slug ] = s.fingerprints;
}
const linkOf = ( a = {} ) => a.sgsBlockLink || a.sgsBlockLinkSource || a.url || a.linkSource || null;
const out = { match: 0, mismatch: [], builtSettled: 0, settings: 0, noRow: [], refused: [], realigned: [], unverified: 0 };
for ( const [ batch, list ] of Object.entries( approved.category3 || {} ) ) {
	for ( const a of list ) {
		const found = resolveApproval( a, { rows, fingerprints } );
		if ( found.refused ) {
			out.refused.push( `${ batch } ${ a.rowId }: ${ found.refused }` );
			continue;
		}
		'realigned' === found.how && out.realigned.push( `${ batch } ${ a.rowId } -> ${ found.to }` );
		'unchecked' === found.how && out.unverified++;
		const r = found.row;
		const want = wanted( a.approvedBlock );
		if ( ! r ) {
			out.noRow.push( `${ batch } ${ a.rowId }` );
			continue;
		}
		if ( r.built && 'clientBuiltSurface' === r.rule ) {
			out.builtSettled++;
			continue;
		}
		if ( 'setting' === want.kind ) {
			out.settings++;
			continue;
		}
		const intoBlock = 'absorbed' === r.action && r.into ? rows[ `skeleton:${ r.surface }:${ r.into }` ]?.block : null;
		const got = NOT_BUILT.includes( r.action ) ? 'removed' : r.block;
		let ok = 'removed' === want.kind ? 'removed' === got : got === want.block || intoBlock === want.block;
		let why = '';
		if ( ok && 'block' === want.kind && want.notLinked && linkOf( r.attributes ) ) {
			ok = false;
			why = ` (approved "not linked", proposed link ${ linkOf( r.attributes ) })`;
		}
		if ( ok && 'block' === want.kind && want.source && ! [ r.attributes?.linkSource, r.attributes?.sgsBlockLinkSource ].includes( want.source ) ) {
			ok = false;
			why = ` (approved link source ${ want.source })`;
		}
		if ( ok ) {
			out.match++;
		} else {
			out.mismatch.push( `${ batch } ${ a.rowId.split( ':' ).slice( 1 ).join( ':' ) } <${ r.tag }> want ${ 'removed' === want.kind ? 'removed' : want.block } got ${ got } [${ r.rule || 'score' }]${ why }` );
		}
	}
}
console.log( `${ client }: ${ out.match } match, ${ out.mismatch.length } mismatch, ${ out.builtSettled } settled by built posts, ${ out.settings } approved as settings, ${ out.noRow.length } with no row; inventories missing: ${ run.missing.join( ', ' ) || 'none' }` );
out.mismatch.forEach( ( l ) => console.log( `  MISMATCH ${ l }` ) );
out.refused.forEach( ( l ) => console.log( `  REFUSED ${ l }` ) );
out.realigned.forEach( ( l ) => console.log( `  REALIGNED ${ l }` ) );
out.unverified && console.error( `${ out.unverified } approvals carry no fingerprint: a renumbered export cannot be detected for them` );
process.exitCode = out.mismatch.length || out.refused.length ? 1 : 0;
