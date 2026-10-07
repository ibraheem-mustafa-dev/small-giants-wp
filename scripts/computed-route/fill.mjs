#!/usr/bin/env node
// Fill (FR-47-4): from a skeleton tree (which blocks, nested how, with the draft's words, each node naming the draft
// element it copies) to a tree resolved root-down in one pass, before anything is built.
//   node scripts/computed-route/fill.mjs --client <slug> --surface <name> --skeleton <file>
//        (--draft-url <url> | --draft-dir <folder> [--draft-index <file>]) --live-url <url>
//        [--out <dir>] [--open <regex>] [--cache <dir>] [--no-sweep] [--headed] [--allow-external] [--mirror <url> <file>]...
//   node scripts/computed-route/fill.mjs --serve <folder> [--draft-index <file>]    serve a draft folder until Ctrl-C
// Reads sites/<client>/build/surfaces.json (the surface's walker states), sites/<client>/theme-snapshot.json and the
// divergence ledger; writes only into --out: filled.tree.json, fill-report.md, fill-report.json, unmapped.json,
// handover.json, breakpoints.json and the generated walker config. It never builds a page and never writes the
// surface's own tree file.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { readTree, addRefs, refOf, walk } from './lib/tree.mjs';
import { lintSkeleton } from './lint.mjs';
import { load as loadLedger } from './lib/ledger.mjs';
import { serveDraft } from './lib/draft.mjs';
import { skeletonNodes, skeletonProblems, cleanTree } from './lib/fill-skeleton.mjs';
import { readDraft } from './lib/fill-read.mjs';
import { fillTree } from './lib/fill-resolve.mjs';
import { sampleEntrances, shapeEntrance, entranceWrites } from './lib/fill-entrance.mjs';
import { sweepSteps } from './lib/fill-values.mjs';
import { walkerConfigs } from './lib/fill-config.mjs';
import { fillReport, unmappedList } from './lib/fill-report.mjs';
import { calibrationFor, withInnerRootAliases } from './solve.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

// The calibration loader: the route's own cache (solve.mjs::calibrationFor), or the cache files in `dir` (a run against
// another checkout's measured cache).
export function calibrationLoader( dir = null ) {
	if ( ! dir ) {
		return calibrationFor;
	}
	return ( block ) => {
		const f = path.join( path.resolve( dir ), `${ block.replace( /^sgs\//, '' ) }.json` );
		return fs.existsSync( f ) ? withInnerRootAliases( JSON.parse( fs.readFileSync( f, 'utf8' ) ), block ) : null;
	};
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
	const db = openDb();
	const snapshotFile = path.join( repo, 'sites', o.client, 'theme-snapshot.json' );
	const snapshot = loadSnapshot( snapshotFile );
	const rawSnapshot = JSON.parse( fs.readFileSync( snapshotFile, 'utf8' ) );
	const skeleton = readTree( o.skeleton );
	const problems = [ ...skeletonProblems( skeleton ), ...lintSkeleton( skeleton, db, path.basename( o.skeleton ) ) ];
	if ( problems.length ) {
		throw new Error( `the skeleton is not valid (R-47-10):\n- ${ problems.join( '\n- ' ) }` );
	}
	const outDir = path.resolve( o.out || path.join( buildDir, 'qa', 'fill', o.surface, stamp() ) );
	fs.mkdirSync( outDir, { recursive: true } );
	const tree = cleanTree( skeleton );
	addRefs( tree, o.surface );
	const nodes = skeletonNodes( skeleton );
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	const served = o.draftDir ? await serveDraft( o.draftDir, { index: o.draftIndex || null } ) : null;
	const url = served ? served.url : o.draftUrl;
	try {
		const reads = await readDraft( { url, nodes, open: o.open || null, headless: o.headless ?? true, sweep: o.sweep ?? true, external: !! o.external, mirror: o.mirror || {}, log } );
		const calFor = calibrationLoader( o.cache );
		const ledgerFile = path.join( buildDir, 'qa', 'divergences.json' );
		const result = fillTree( {
			tree, nodes, reads, db, calFor, origin: reads.origin,
			snapshot, rawSnapshot,
			ledger: loadLedger( ledgerFile ),
			ledgerStates: Object.entries( entry.states || {} ).filter( ( [ , v ] ) => null === v ).map( ( [ k ] ) => k ),
		} );
		// Entrances: sampled once, at 1440, for every node with a draftRef; written through the resolver.
		const jobs = nodes.filter( ( n ) => n.targets.length ).map( ( n ) => ( { id: n.targets[ 0 ].id, finder: n.targets[ 0 ].finder } ) );
		const raw = await sampleEntrances( { url, jobs, open: o.open || null, headless: o.headless ?? true, external: !! o.external, mirror: o.mirror || {} } );
		const entrances = [];
		for ( const n of nodes.filter( ( x ) => x.targets.length ) ) {
			const measured = shapeEntrance( raw[ n.targets[ 0 ].id ] );
			const ref = refOf( flat[ n.index ] );
			entrances.push( { node: ref, block: n.name, measured } );
			const cal = calFor( n.name );
			if ( measured && cal ) {
				const w = entranceWrites( { entrance: measured, node: flat[ n.index ], ref, block: n.name, calibration: cal, db, snapshot, log: result.snaps } );
				result.writes.push( ...w.writes );
				result.unmapped.push( ...w.unmapped );
			}
		}
		const steps = sweepSteps( reads.sweep, ( id ) => ( { node: refOf( flat[ Number( id.split( ':' )[ 0 ] ) ] ), slot: id.slice( id.indexOf( ':' ) + 1 ) } ) );
		const report = fillReport( { client: o.client, surface: o.surface, draft: o.draftDir ? `${ o.draftDir } (served locally)` : url, nodes: nodes.length, targets: nodes.reduce( ( t, n ) => t + n.targets.length, 0 ), ...result, steps, entrances, sweepSkipped: false === o.sweep } );
		const divergences = fs.existsSync( ledgerFile ) ? path.relative( outDir, ledgerFile ).split( path.sep ).join( '/' ) : null;
		const cfg = walkerConfigs( { surface: o.surface, nodes, tree, draftUrl: url, liveUrl: o.liveUrl, open: o.open || null, divergences, state: Object.keys( entry.states || {} )[ 0 ] || 'opening' } );
		const put = ( name, text ) => fs.writeFileSync( path.join( outDir, name ), text );
		put( 'filled.tree.json', `${ JSON.stringify( tree, null, 2 ) }\n` );
		put( 'fill-report.md', report.markdown );
		put( 'fill-report.json', JSON.stringify( report.json, null, 1 ) );
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
