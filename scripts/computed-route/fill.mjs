#!/usr/bin/env node
// Fill (FR-47-4): from a skeleton tree (which blocks, nested how, with the draft's words, each node naming the draft
// element it copies) to a tree resolved root-down in one pass, before anything is built.
//   node scripts/computed-route/fill.mjs --client <slug> --surface <name> --skeleton <file>
//        (--draft-url <url> | --draft-dir <folder> [--draft-index <file>]) --live-url <url>
//        [--out <dir>] [--open <regex>] [--cache <dir>] [--no-sweep] [--headed] [--allow-external] [--mirror <url> <file>]...
//   node scripts/computed-route/fill.mjs --serve <folder> [--draft-index <file>]    serve a draft folder until Ctrl-C
// Reads sites/<client>/build/surfaces.json (the surface's walker states), sites/<client>/theme-snapshot.json and the
// divergence ledger; writes only into --out: filled.tree.json, fill-report.md, fill-report.json, unmapped.json,
// handover.json, breakpoints.json, the generated walker config and, when the draft's focus, press or link-state looks
// live in the theme, theme-snapshot.patch.json (the keys to merge into the client's theme-snapshot.json: Fill never
// edits it). It never builds a page and never writes the surface's own tree file. Beside the tree it writes <surface>.origin.json (cr-ref to tpl key and fingerprint) when the
// skeleton names its draft elements by tpl finder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb, statesVocabulary } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { readTree, addRefs, refOf, walk } from './lib/tree.mjs';
import { lintSkeleton } from './lint.mjs';
import { load as loadLedger } from './lib/ledger.mjs';
import { serveDraft } from './lib/draft.mjs';
import { skeletonNodes, skeletonProblems, cleanTree, expandSiteInfoRows, originMap } from './lib/fill-skeleton.mjs';
import { readDraft } from './lib/fill-read.mjs';
import { fillTree } from './lib/fill-resolve.mjs';
import { fillStates } from './lib/fill-state.mjs';
import { sampleMotion } from './lib/fill-entrance.mjs';
import { confirmRecords, defectIndex } from './lib/fill-confirm.mjs';
import { motionWrites } from './lib/fill-motion.mjs';
import { motionDb } from './lib/motion-db.mjs';
import { loadMotionSchema } from './lib/motion-schema.mjs';
import { sweepSteps } from './lib/fill-values.mjs';
import { walkerConfigs } from './lib/fill-config.mjs';
import { fillReport, unmappedList } from './lib/fill-report.mjs';
import { calibrationFor } from './solve.mjs';
import { stateMap } from './lib/state-map.mjs';
import { readMediaMap } from './lib/fill-media.mjs';
import { assertCurrent } from './lib/freshness.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

// The calibration loader for one site: the route's own cache (solve.mjs::calibrationFor), or the cache files in `dir` (a
// run against another checkout's measured cache). Default paint comes from `site`'s own file only.
export function calibrationLoader( site, dir = null ) {
	return ( block ) => calibrationFor( block, site, dir ? path.resolve( dir ) : undefined );
}

// `--mirror <url> <file>` (repeatable) as { url: absolute file path }.
export function parseMirrors( argv ) {
	const out = {};
	argv.forEach( ( a, i ) => {
		if ( '--mirror' === a ) {
			if ( ! argv[ i + 1 ] || ! argv[ i + 2 ] ) {
				throw new Error( '--mirror takes a url and a file' );
			}
			out[ argv[ i + 1 ] ] = path.resolve( argv[ i + 2 ] );
		}
	} );
	return out;
}

const stamp = () => new Date().toISOString().replace( /[:.]/g, '-' ).slice( 0, 19 );

// The re-derived animation inventory (Spec 48 FR-48-25) from the client's intake: { records, rootComponent }, where
// rootComponent is the served index draft's component (else the inventory's first, entry, draft); no records when
// intake has not run.
function animationInventory( buildDir, draftIndex, log ) {
	const file = path.join( buildDir, 'intake', 'intake.json' );
	if ( ! fs.existsSync( file ) ) {
		log( `no ${ path.relative( REPO, file ) }: motion is not written` );
		return { records: [], rootComponent: null, draftDefects: [] };
	}
	const intake = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	assertCurrent( intake, path.join( buildDir, '..', 'handoff' ), { label: path.relative( REPO, file ) } );
	const inv = intake.inventory?.animations || {};
	const drafts = inv.drafts || [];
	const entry = drafts.find( ( d ) => draftIndex && d.file === path.basename( draftIndex ) ) || drafts[ 0 ];
	return { records: inv.records || [], rootComponent: entry?.dc ?? null, draftDefects: intake.draftDefects || [] };
}

// Runs Fill and writes its outputs. o: { client, surface, skeleton (a file), draftUrl | draftDir (+ draftIndex), liveUrl,
// out, open, cache, sweep (default true), headless (default true), external, mirror ({ url: local file } answered
// from disk), repo, log }. Returns the report object.
export async function fillSurface( o ) {
	const repo = o.repo || REPO;
	const log = o.log || ( () => {} );
	for ( const k of [ 'client', 'surface', 'skeleton', 'liveUrl' ] ) {
		if ( ! o[ k ] ) {
			throw new Error( `--${ k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) } is required` );
		}
	}
	if ( ! o.draftUrl === ! o.draftDir ) {
		throw new Error( 'name the draft with exactly one of --draft-url and --draft-dir' );
	}
	const buildDir = path.join( repo, 'sites', o.client, 'build' );
	const surfaces = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) );
	const entry = surfaces[ o.surface ];
	if ( ! entry ) {
		throw new Error( `no surface "${ o.surface }" in sites/${ o.client }/build/surfaces.json` );
	}
	if ( ! entry.site ) {
		throw new Error( `surface "${ o.surface }" names no site in sites/${ o.client }/build/surfaces.json, so there is no default paint to read` );
	}
	const db = openDb();
	const snapshotFile = path.join( repo, 'sites', o.client, 'theme-snapshot.json' );
	const snapshot = loadSnapshot( snapshotFile );
	const rawSnapshot = JSON.parse( fs.readFileSync( snapshotFile, 'utf8' ) );
	const authored = readTree( o.skeleton );
	const problems = [ ...skeletonProblems( authored ), ...lintSkeleton( authored, db, path.basename( o.skeleton ) ) ];
	if ( problems.length ) {
		throw new Error( `the skeleton is not valid (R-47-10):\n- ${ problems.join( '\n- ' ) }` );
	}
	const skeleton = expandSiteInfoRows( authored );
	const outDir = path.resolve( o.out || path.join( buildDir, 'qa', 'fill', o.surface, stamp() ) );
	fs.mkdirSync( outDir, { recursive: true } );
	const tree = cleanTree( skeleton );
	addRefs( tree, o.surface );
	const nodes = skeletonNodes( skeleton );
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	// The skeleton writer's identity: every node that names its draft element by a tpl finder, kept beside the tree (the
	// built tree itself is unchanged). Written only when the skeleton has any, so a hand-authored skeleton leaves no file.
	const origin = originMap( nodes, flat.map( ( n ) => refOf( n ) ) );
	if ( Object.keys( origin ).length ) {
		fs.writeFileSync( path.join( buildDir, `${ o.surface }.origin.json` ), `${ JSON.stringify( origin, null, 2 ) }\n` );
	}
	const served = o.draftDir ? await serveDraft( o.draftDir, { index: o.draftIndex || null } ) : null;
	const url = served ? served.url : o.draftUrl;
	try {
		// The state vocabulary (FR-48-81): a DB seeded before the states table reads no state looks, and says so.
		const vocab = statesVocabulary( db );
		if ( vocab.missing ) {
			log( vocab.missing );
		}
		// FR-48-13: the surface's sc-if rows from its generated state map, so the reader also enters the draft's own logic
		// states (lib/fill-logic-state.mjs); none when intake has not run.
		const intakeFile = path.join( buildDir, 'intake', 'intake.json' );
		const logicRows = fs.existsSync( intakeFile ) && vocab.rows.length ? stateMap( { surfaces, surface: o.surface, intake: JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ), vocab: vocab.rows } ).scIf : [];
		const reads = await readDraft( { url, nodes, open: o.open || null, headless: o.headless ?? true, sweep: o.sweep ?? true, external: !! o.external, mirror: o.mirror || {}, states: vocab.rows, logicRows, log } );
		const calFor = calibrationLoader( entry.site, o.cache );
		const ledgerFile = path.join( buildDir, 'qa', 'divergences.json' );
		const result = fillTree( {
			tree, nodes, reads, db, calFor, origin: reads.origin,
			// FR-48-39: the uploaded images of the surface's site (a null map when media-upload has not run).
			media: { map: readMediaMap( path.join( buildDir, 'media-map.json' ) ), site: entry.site },
			snapshot, rawSnapshot,
			fixtures: JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) ),
			ledger: loadLedger( ledgerFile ),
			ledgerStates: Object.entries( entry.states || {} ).filter( ( [ , v ] ) => null === v ).map( ( [ k ] ) => k ),
		} );
		// FR-48-81: each target's state looks, through the settings that hold their states.
		const states = fillStates( { tree, nodes, reads, calFor, db, snapshot } );
		result.writes.push( ...states.writes );
		result.unmapped.push( ...states.unmapped );
		const patchFile = states.patchEntries.length ? 'theme-snapshot.patch.json' : null;
		result.notes.push( ...states.held.map( ( h ) => `${ h.node } (${ h.slot }) ${ h.prop } ${ h.state }: ${ h.reason }` ) );
		// Motion (Spec 48 FR-48-78): the draft's motion records from intake's re-derived inventory, written as each
		// node's sgsMotion, with every target's entrance and endless animations sampled at 375, 768 and 1440 as the render
		// check (and the source of the values the code computes at run time).
		const jobs = nodes.flatMap( ( n ) => n.targets.map( ( t ) => ( { id: t.id, finder: t.finder } ) ) );
		const { entrances: sampled, loops } = await sampleMotion( { url, jobs, open: o.open || null, headless: o.headless ?? true, external: !! o.external, mirror: o.mirror || {} } );
		const entrances = nodes.filter( ( x ) => x.targets.length ).map( ( n ) => ( { node: refOf( flat[ n.index ] ), block: n.name, measured: sampled[ n.targets[ 0 ].id ]?.[ 1440 ] ?? null } ) );
		const intakeParts = animationInventory( buildDir, o.draftIndex, log );
		const motion = motionWrites( { nodes, flat, refOf, records: intakeParts.records, rootComponent: intakeParts.rootComponent, sampled, loops, mdb: motionDb( db ), schema: loadMotionSchema(), rawSnapshot } );
		result.writes.push( ...motion.writes );
		result.unmapped.push( ...motion.unmapped );
		result.notes.push( ...motion.notes.map( ( x ) => `${ x.node } ${ x.block }${ x.slot ? ` (${ x.slot })` : '' }: ${ x.text }` ) );
		// FR-48-8: every written style value against what the draft's code declares, at each read width.
		// A state write is judged by the state check (lib/state-check.mjs), never against the resting read.
		result.confirm = confirmRecords( { writes: result.writes.filter( ( w ) => 'motion' !== w.how && ! w.state ), nodes, reads, defects: defectIndex( intakeParts.draftDefects ), rootComponent: intakeParts.rootComponent } );
		const steps = sweepSteps( reads.sweep, ( id ) => ( { node: refOf( flat[ Number( id.split( ':' )[ 0 ] ) ] ), slot: id.slice( id.indexOf( ':' ) + 1 ) } ) );
		const report = fillReport( { client: o.client, surface: o.surface, draft: o.draftDir ? `${ o.draftDir } (served locally)` : url, nodes: nodes.length, targets: nodes.reduce( ( t, n ) => t + n.targets.length, 0 ), ...result, steps, entrances, snapshotPatch: { file: patchFile, entries: states.patchEntries }, sweepSkipped: false === o.sweep } );
		const divergences = fs.existsSync( ledgerFile ) ? path.relative( outDir, ledgerFile ).split( path.sep ).join( '/' ) : null;
		const cfg = walkerConfigs( { surface: o.surface, nodes, tree, draftUrl: url, liveUrl: o.liveUrl, open: o.open || null, divergences, state: Object.keys( entry.states || {} )[ 0 ] || 'opening' } );
		const put = ( name, text ) => fs.writeFileSync( path.join( outDir, name ), text );
		put( 'filled.tree.json', `${ JSON.stringify( tree, null, 2 ) }\n` );
		put( 'fill-report.md', report.markdown );
		put( 'fill-report.json', JSON.stringify( report.json, null, 1 ) );
		if ( patchFile ) {
			put( patchFile, `${ JSON.stringify( states.patch, null, 2 ) }
` );
		}
		put( 'unmapped.json', JSON.stringify( unmappedList( result.unmapped ), null, 1 ) );
		put( 'handover.json', JSON.stringify( result.handover, null, 1 ) );
		put( 'breakpoints.json', JSON.stringify( steps, null, 1 ) );
		put( cfg.baseFile, cfg.baseText );
		put( cfg.fullFile, cfg.fullText );
		return { ...report.json, outDir, tree };
	} finally {
		await served?.close();
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	try {
		if ( flag( '--serve' ) ) {
			const s = await serveDraft( flag( '--serve' ), { index: flag( '--draft-index' ) } );
			console.log( `serving ${ flag( '--serve' ) } at ${ s.url } (Ctrl-C to stop)` );
			process.on( 'SIGINT', () => s.close().then( () => process.exit( 0 ) ) );
		} else {
			const r = await fillSurface( {
				client: flag( '--client' ), surface: flag( '--surface' ), skeleton: flag( '--skeleton' ), draftUrl: flag( '--draft-url' ), draftDir: flag( '--draft-dir' ), draftIndex: flag( '--draft-index' ),
				liveUrl: flag( '--live-url' ), out: flag( '--out' ), open: flag( '--open' ), cache: flag( '--cache' ), sweep: ! argv.includes( '--no-sweep' ), headless: ! argv.includes( '--headed' ), external: argv.includes( '--allow-external' ), mirror: parseMirrors( argv ),
				log: ( m ) => console.log( m ),
			} );
			console.log( `fill ${ r.surface }: ${ r.counts.writes } settings written, ${ r.counts.unmapped } UNMAPPED, ${ r.counts.handover } handover, ${ r.counts.fluid } fluid, ${ r.counts.breakpointSteps } breakpoint steps. Report: ${ path.join( r.outDir, 'fill-report.md' ) }` );
		}
	} catch ( e ) {
		console.error( e.message );
		process.exit( 2 );
	}
}
