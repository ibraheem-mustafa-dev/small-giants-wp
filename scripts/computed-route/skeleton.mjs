#!/usr/bin/env node
// Skeleton writer (Spec 48 §3.4): turns a Claude Design draft's own elements into an SGS block skeleton with exact draft
// links, plus a review table. Output folder: sites/<client>/build/skeleton/. The draft url is
// sites/<client>/build/surfaces.json[surface].draftUrl.
//   node scripts/computed-route/skeleton.mjs inventory --client <slug> --surface <name> --root <selector>
//   node scripts/computed-route/skeleton.mjs propose   --client <slug> --surface <name> [--site-name <text>]
//     (the surfaces.json entry names its intake skeleton in `intakeSurface`: the proposal takes that skeleton's kind, name and
//     built post, the intake motion inventory's loops, and the client decisions saved under that slug)
//   node scripts/computed-route/skeleton.mjs review   --client <slug> --surface <name>
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
import { serveDraft } from './lib/draft.mjs';
import { readInventory } from './lib/skeleton-inventory.mjs';
import { loadFacts, decisionsProblems, REPO } from './lib/skeleton-facts.mjs';
import { proposeSkeleton } from './lib/skeleton-propose.mjs';
import { loopingKeys } from './lib/skeleton-rerun.mjs';
import { isServedInventory, servedDecisions, servedMotion } from './lib/key-space.mjs';
import { reviewHtml } from './lib/skeleton-review.mjs';
import { calKeysFor, calSettingsFor, statesOfRecord, thresholdsOf } from './lib/skeleton-context.mjs';
import { assertCurrent } from './lib/freshness.mjs';
import { carriedIds } from './lib/skeleton-carried.mjs';
import { skeletonDir, readDecisions, readPicks, recordDecision, recordSiteName, finaliseRequest, applyPicks } from './lib/skeleton-finalise.mjs';

const FINALISER_PROMPT = 'scripts/computed-route/prompts/skeleton-finaliser.md';

// The files of one surface's skeleton run, and its draft url.
export function skeletonPaths( { client, surface, repo = REPO } ) {
	const dir = skeletonDir( repo, client );
	const surfaces = JSON.parse( fs.readFileSync( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), 'utf8' ) );
	if ( ! surfaces[ surface ] ) {
		throw new Error( `no surface "${ surface }" in sites/${ client }/build/surfaces.json` );
	}
	const f = ( ext ) => path.join( dir, `${ surface }.${ ext }` );
	return { dir, draftUrl: surfaces[ surface ].draftUrl || null, draftDir: surfaces[ surface ].draftDir ? path.resolve( repo, surfaces[ surface ].draftDir ) : null, draftIndex: surfaces[ surface ].draftIndex || null, inventory: f( 'inventory.json' ), skeleton: f( 'skeleton.json' ), proposal: f( 'proposal.json' ), review: f( 'review.html' ), request: f( 'finalise-request.json' ), picks: f( 'picks.json' ), decisions: path.join( dir, 'decisions.json' ), shots: path.join( dir, 'shots' ) };
}

const write = ( file, text ) => {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, text );
};
const json = ( file, value ) => write( file, `${ JSON.stringify( value, null, '\t' ) }\n` );

const readSurface = ( repo, client, surface ) => JSON.parse( fs.readFileSync( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), 'utf8' ) )[ surface ] || {};
const readJson = ( file, fallback ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : fallback );

// The intake context of a surface, as lib/skeleton-rerun.mjs::rerunSkeletons passes it: the intake skeleton the manifest
// entry names in `intakeSurface` (its slug, id, kind, name and root component), the client's built post for it and the
// intake motion inventory's looping templates. Throws when the entry has no usable link.
export function intakeContext( { client, surface, repo = REPO } ) {
	const slug = readSurface( repo, client, surface ).intakeSurface;
	if ( ! slug ) {
		throw new Error( `sites/${ client }/build/surfaces.json "${ surface }" has no intakeSurface: the slug of its intake.json skeletons entry (node scripts/computed-route/manifest.mjs ${ client } --site <site> --only ${ surface } --apply sets it)` );
	}
	const intake = readJson( path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' ), null );
	intake && assertCurrent( intake, path.join( repo, 'sites', client, 'handoff' ), { label: `sites/${ client }/build/intake/intake.json` } );
	const entry = intake?.skeletons?.[ slug ];
	if ( ! entry ) {
		throw new Error( `"${ surface }" names intakeSurface "${ slug }", which is not in sites/${ client }/build/intake/intake.json skeletons` );
	}
	const built = readJson( path.join( skeletonDir( repo, client ), 'built-surfaces.json' ), {} ).surfaces || {};
	// The handoff record of the same id carries the states (with the sc-if templates each shows); the draft's width thresholds are intake's.
	const states = statesOfRecord( { repo, client, id: entry.id } );
	const thresholds = thresholdsOf( intake.breakpoints );
	return { slug, kind: entry.kind, name: entry.name, built: built[ entry.id ] || built[ slug ] || null, rootComponent: entry.inventory?.checks?.rootName || null, motion: loopingKeys( intake.inventory?.animations ), states, thresholds };
}

// The intake context and the saved client decisions of a surface as propose and review read them: decisions under the intake
// slug, and for a served inventory their root-host keys in the served space.
export function surfaceDecisions( { client, surface, repo = REPO, inventory, file } ) {
	const ctx = intakeContext( { client, surface, repo } );
	const saved = readDecisions( file );
	const served = isServedInventory( inventory );
	const clientDecisions = served ? { ...saved, surfaces: { ...saved.surfaces, [ ctx.slug ]: servedDecisions( saved.surfaces?.[ ctx.slug ], ctx.rootComponent ) } } : saved;
	return { ctx, saved, served, clientDecisions };
}

// The review table's html for a surface, from the files on disk.
export function reviewSurface( { client, surface, repo = REPO } ) {
	const p = skeletonPaths( { client, surface, repo } );
	const proposal = JSON.parse( fs.readFileSync( p.proposal, 'utf8' ) );
	const inventory = JSON.parse( fs.readFileSync( p.inventory, 'utf8' ) );
	const { ctx, clientDecisions } = surfaceDecisions( { client, surface, repo, inventory, file: p.decisions } );
	return reviewHtml( { inventory, proposal, surface: ctx.slug, clientDecisions, picks: readPicks( p.picks ) } );
}

// Runs propose from the files on disk and writes <surface>.skeleton.json and <surface>.proposal.json. Returns the result.
// A served inventory (`Root/…` keys) is proposed with the decisions and motion keys written in intake's space rewritten
// to its root (lib/key-space.mjs).
export function proposeSurface( { client, surface, repo = REPO, siteName = null, db = openDb(), propose = proposeSkeleton } ) {
	const p = skeletonPaths( { client, surface, repo } );
	const inventory = JSON.parse( fs.readFileSync( p.inventory, 'utf8' ) );
	const { ctx, saved, served, clientDecisions } = surfaceDecisions( { client, surface, repo, inventory, file: p.decisions } );
	const facts = loadFacts( { db, client, repo, siteName: siteName || saved.siteName || null } );
	const bad = decisionsProblems( facts );
	if ( bad.length ) {
		throw new Error( `the decisions data is not sound:\n- ${ bad.join( '\n- ' ) }` );
	}
	const r = propose( { inventory, facts, surface: ctx.slug, surfaceKind: ctx.kind, surfaceName: ctx.name, built: ctx.built, carried: carriedIds( { repo, client, site: readSurface( repo, client, surface ).site, rootComponent: served ? ctx.rootComponent : null } ), motion: served ? servedMotion( ctx.motion, ctx.rootComponent ) : ctx.motion, clientDecisions, picks: readPicks( p.picks ), calKeys: calKeysFor( readSurface( repo, client, surface ).site ), calSettings: calSettingsFor( readSurface( repo, client, surface ).site ), states: ctx.states, thresholds: ctx.thresholds, db } );
	json( p.skeleton, r.skeleton );
	json( p.proposal, r.proposal );
	return { ...r, paths: p, facts, inventory, clientDecisions };
}

export async function main( argv, { read = readInventory, repo = REPO } = {} ) {
	const cmd = argv[ 0 ];
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	if ( ! [ 'inventory', 'propose', 'review', 'finalise', 'decide' ].includes( cmd ) || ! client || ! surface ) {
		throw new Error( 'usage: skeleton.mjs <inventory|propose|review|finalise|decide> --client <slug> --surface <name> [options] (see the header of skeleton.mjs)' );
	}
	const p = skeletonPaths( { client, surface, repo } );
	const log = ( m ) => console.log( m );
	if ( 'inventory' === cmd ) {
		const root = flag( '--root' );
		if ( ! root || ! ( p.draftUrl || p.draftDir ) ) {
			throw new Error( '--root <selector> is required, and the surface needs a draftUrl or a draftDir in surfaces.json' );
		}
		// A hand-set draftUrl wins; otherwise the handoff folder is served as Fill serves it, and closed afterwards.
		const served = p.draftUrl ? null : await serveDraft( p.draftDir, { index: p.draftIndex } );
		let inv;
		try {
			inv = await read( { url: served ? served.url : p.draftUrl, root, shotsDir: p.shots, log } );
		} finally {
			served && await served.close();
		}
		json( p.inventory, inv );
		log( `inventory ${ surface }: ${ inv.elements.length } elements, ${ Object.keys( inv.elements.reduce( ( a, e ) => Object.assign( a, e.screenshots ), {} ) ).length ? 'screenshots in' : 'no screenshots in' } ${ p.shots }, ${ inv.checks.duplicateKeys } duplicate keys` );
	} else if ( 'propose' === cmd ) {
		const r = proposeSurface( { client, surface, siteName: flag( '--site-name' ) } );
		const c = r.proposal.counts;
		log( `propose ${ surface }: ${ c.skeletonNodes } skeleton nodes (${ c.expandedNodes } with Fill's generated icons), ${ c.low } low confidence, ${ c.removed } removed or absorbed, ${ c.unresolved } unresolved, ${ r.problems.length } problems` );
		r.problems.forEach( ( x ) => log( ` - ${ x }` ) );
		process.exitCode = r.problems.length ? 1 : 0;
	} else if ( 'review' === cmd ) {
		write( p.review, reviewSurface( { client, surface, repo } ) );
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
		recordDecision( { file: p.decisions, surface: intakeContext( { client, surface, repo } ).slug, element, choice: argv.includes( '--remove' ) ? { remove: true } : { block, attributes: flag( '--attrs' ) ? JSON.parse( flag( '--attrs' ) ) : undefined }, reason: flag( '--reason' ) } );
		log( `decided ${ key }: ${ argv.includes( '--remove' ) ? 'remove' : block }. Run propose and review again.` );
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).catch( ( e ) => {
		console.error( e.message );
		process.exit( 2 );
	} );
}
