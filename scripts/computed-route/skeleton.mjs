#!/usr/bin/env node
// Skeleton writer (Spec 47 §3.4): turns a Claude Design draft's own elements into an SGS block skeleton with exact draft
// links, plus a review table. Output folder: sites/<client>/build/skeleton/. The draft url is
// sites/<client>/build/surfaces.json[surface].draftUrl.
//   node scripts/computed-route/skeleton.mjs inventory --client <slug> --surface <name> --root <selector>
//   node scripts/computed-route/skeleton.mjs propose   --client <slug> --surface <name> [--site-name <text>]
//   node scripts/computed-route/skeleton.mjs review    --client <slug> --surface <name>
//   node scripts/computed-route/skeleton.mjs finalise  --client <slug> --surface <name> [--apply <picks.json>]
//   node scripts/computed-route/skeleton.mjs decide    --client <slug> --surface <name> --key <key> (--block <slug> [--attrs <json>] | --remove) [--reason <text>]
//   node scripts/computed-route/skeleton.mjs decide    --client <slug> --surface <name> --site-name <text>
// Files: <surface>.inventory.json, <surface>.skeleton.json, <surface>.proposal.json, <surface>.review.html,
// <surface>.finalise-request.json, <surface>.picks.json, decisions.json. Reads the framework database read-only; never
// builds a page, calls a model or writes outside the skeleton folder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from './lib/db.mjs';
import { readInventory } from './lib/skeleton-inventory.mjs';
import { loadFacts, decisionsProblems, REPO } from './lib/skeleton-facts.mjs';
import { proposeSkeleton } from './lib/skeleton-propose.mjs';
import { reviewHtml } from './lib/skeleton-review.mjs';
import { skeletonDir, readDecisions, readPicks, recordDecision, recordSiteName, finaliseRequest, applyPicks } from './lib/skeleton-finalise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FINALISER_PROMPT = 'scripts/computed-route/prompts/skeleton-finaliser.md';

// The files of one surface's skeleton run, and its draft url.
export function skeletonPaths( { client, surface, repo = REPO } ) {
	const dir = skeletonDir( repo, client );
	const surfaces = JSON.parse( fs.readFileSync( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), 'utf8' ) );
	if ( ! surfaces[ surface ] ) {
		throw new Error( `no surface "${ surface }" in sites/${ client }/build/surfaces.json` );
	}
	const f = ( ext ) => path.join( dir, `${ surface }.${ ext }` );
	return { dir, draftUrl: surfaces[ surface ].draftUrl || null, inventory: f( 'inventory.json' ), skeleton: f( 'skeleton.json' ), proposal: f( 'proposal.json' ), review: f( 'review.html' ), request: f( 'finalise-request.json' ), picks: f( 'picks.json' ), decisions: path.join( dir, 'decisions.json' ), shots: path.join( dir, 'shots' ) };
}

// The calibration cache's element keys for a block (slot targets), or none when it was never calibrated.
const calKeysOf = ( slug ) => {
	const f = path.join( HERE, 'cache', `${ slug.replace( /^sgs\//, '' ) }.json` );
	return fs.existsSync( f ) ? Object.keys( JSON.parse( fs.readFileSync( f, 'utf8' ) ).elements || {} ) : [];
};

const write = ( file, text ) => {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, text );
};
const json = ( file, value ) => write( file, `${ JSON.stringify( value, null, '\t' ) }\n` );

// Runs propose from the files on disk and writes <surface>.skeleton.json and <surface>.proposal.json. Returns the result.
export function proposeSurface( { client, surface, repo = REPO, siteName = null, db = openDb() } ) {
	const p = skeletonPaths( { client, surface, repo } );
	const inventory = JSON.parse( fs.readFileSync( p.inventory, 'utf8' ) );
	const clientDecisions = readDecisions( p.decisions );
	const facts = loadFacts( { db, client, repo, siteName: siteName || clientDecisions.siteName || null } );
	const bad = decisionsProblems( facts );
	if ( bad.length ) {
		throw new Error( `the decisions data is not sound:\n- ${ bad.join( '\n- ' ) }` );
	}
	const r = proposeSkeleton( { inventory, facts, surface, clientDecisions, picks: readPicks( p.picks ), calKeys: calKeysOf, db } );
	json( p.skeleton, r.skeleton );
	json( p.proposal, r.proposal );
	return { ...r, paths: p, facts, inventory, clientDecisions };
}

export async function main( argv ) {
	const cmd = argv[ 0 ];
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	if ( ! [ 'inventory', 'propose', 'review', 'finalise', 'decide' ].includes( cmd ) || ! client || ! surface ) {
		throw new Error( 'usage: skeleton.mjs <inventory|propose|review|finalise|decide> --client <slug> --surface <name> [options] (see the header of skeleton.mjs)' );
	}
	const p = skeletonPaths( { client, surface } );
	const log = ( m ) => console.log( m );
	if ( 'inventory' === cmd ) {
		const root = flag( '--root' );
		if ( ! root || ! p.draftUrl ) {
			throw new Error( '--root <selector> is required, and the surface needs a draftUrl in surfaces.json' );
		}
		const inv = await readInventory( { url: p.draftUrl, root, shotsDir: p.shots, log } );
		json( p.inventory, inv );
		log( `inventory ${ surface }: ${ inv.elements.length } elements, ${ Object.keys( inv.elements.reduce( ( a, e ) => Object.assign( a, e.screenshots ), {} ) ).length ? 'screenshots in' : 'no screenshots in' } ${ p.shots }, ${ inv.checks.duplicateKeys } duplicate keys` );
	} else if ( 'propose' === cmd ) {
		const r = proposeSurface( { client, surface, siteName: flag( '--site-name' ) } );
		const c = r.proposal.counts;
		log( `propose ${ surface }: ${ c.skeletonNodes } skeleton nodes (${ c.expandedNodes } with Fill's generated icons), ${ c.low } low confidence, ${ c.removed } removed or absorbed, ${ c.unresolved } unresolved, ${ r.problems.length } problems` );
		r.problems.forEach( ( x ) => log( ` - ${ x }` ) );
		process.exitCode = r.problems.length ? 1 : 0;
	} else if ( 'review' === cmd ) {
		const proposal = JSON.parse( fs.readFileSync( p.proposal, 'utf8' ) );
		const inventory = JSON.parse( fs.readFileSync( p.inventory, 'utf8' ) );
		write( p.review, reviewHtml( { inventory, proposal, surface, clientDecisions: readDecisions( p.decisions ), picks: readPicks( p.picks ) } ) );
		log( `review ${ surface }: ${ p.review }` );
	} else if ( 'finalise' === cmd ) {
		const proposal = JSON.parse( fs.readFileSync( p.proposal, 'utf8' ) );
		const inventory = JSON.parse( fs.readFileSync( p.inventory, 'utf8' ) );
		if ( flag( '--apply' ) ) {
			const db = openDb();
			const facts = loadFacts( { db, client } );
			const known = ( s ) => !! facts.composition[ s ] || facts.q( 'SELECT 1 FROM blocks WHERE slug = ?', s ).length > 0;
			const merged = applyPicks( { picks: JSON.parse( fs.readFileSync( path.resolve( flag( '--apply' ) ), 'utf8' ) ), request: JSON.parse( fs.readFileSync( p.request, 'utf8' ) ), knownBlock: known, file: p.picks } );
			const r = proposeSurface( { client, surface, db } );
			log( `finalise ${ surface }: ${ Object.keys( merged ).length } picks merged; skeleton rewritten (${ r.proposal.counts.low } still low confidence, ${ r.problems.length } problems)` );
		} else {
			const req = finaliseRequest( { inventory, proposal, surface, promptFile: FINALISER_PROMPT } );
			json( p.request, req );
			log( `finalise ${ surface }: ${ req.rows.length } low-confidence rows written to ${ p.request }; run ${ FINALISER_PROMPT } over it as a subagent, then finalise --apply <picks.json>` );
		}
	} else if ( flag( '--site-name' ) ) {
		recordSiteName( { file: p.decisions, siteName: flag( '--site-name' ) } );
		log( `site name recorded in ${ p.decisions }` );
	} else {
		const inventory = JSON.parse( fs.readFileSync( p.inventory, 'utf8' ) );
		const key = flag( '--key' );
		const element = inventory.elements.find( ( e ) => e.key === key );
		if ( ! element ) {
			throw new Error( `no inventory element with key "${ key }"` );
		}
		const block = flag( '--block' );
		if ( block ) {
			const facts = loadFacts( { db: openDb(), client } );
			if ( ! facts.composition[ block ] && ! facts.q( 'SELECT 1 FROM blocks WHERE slug = ?', block ).length ) {
				throw new Error( `${ block } is not in the framework database` );
			}
		}
		recordDecision( { file: p.decisions, surface, element, choice: argv.includes( '--remove' ) ? { remove: true } : { block, attributes: flag( '--attrs' ) ? JSON.parse( flag( '--attrs' ) ) : undefined }, reason: flag( '--reason' ) } );
		log( `decided ${ key }: ${ argv.includes( '--remove' ) ? 'remove' : block }. Run propose and review again.` );
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).catch( ( e ) => {
		console.error( e.message );
		process.exit( 2 );
	} );
}
