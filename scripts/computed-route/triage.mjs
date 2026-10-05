#!/usr/bin/env node
// Triage command (Spec 47, Session B1): a candidate class (W, F, T, U) with its evidence for every distinct open issue
// of a surface's Solve report (lib/triage.mjs).
//   node scripts/computed-route/triage.mjs --client <slug> --surface <s> [--report <solve-report.json>] [--out <file>]
// Reads sites/<client>/build/surfaces.json, every surface tree it names (refs from an embedding page resolve there),
// the report (default: the surface's newest) and the final walker report beside it (the highest round-N/report.json),
// the framework DB read-only, calibration files, the extension roster, block sources and every PHP file under the
// plugin's includes/ (the helpers a render.php reaches, lib/triage-source.mjs). Writes only the triage file
// (default <build>/qa/triage/<surface>.json) and prints one summary line.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { BLOCKS_DIR } from './lib/resolve.mjs';
import { readTree, walk as walkTree, refOf } from './lib/tree.mjs';
import { detectReferences } from './lib/references.mjs';
import { latestReport } from './lib/sweep.mjs';
import { triage } from './lib/triage.mjs';
import { helperIndex } from './lib/triage-source.mjs';
import { calibrationFor } from './solve.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const ROSTER = path.join( BLOCKS_DIR, 'extensions', 'extension-roster.json' );
const PLUGIN = path.resolve( BLOCKS_DIR, '..', '..' );

// Every PHP file under a folder, as { file (relative to the plugin, forward slashes), text }.
export function phpFiles( dir ) {
	const out = [];
	for ( const e of fs.existsSync( dir ) ? fs.readdirSync( dir, { withFileTypes: true } ) : [] ) {
		const f = path.join( dir, e.name );
		if ( e.isDirectory() ) {
			out.push( ...phpFiles( f ) );
		} else if ( e.name.endsWith( '.php' ) ) {
			out.push( { file: path.relative( PLUGIN, f ).split( path.sep ).join( '/' ), text: fs.readFileSync( f, 'utf8' ) } );
		}
	}
	return out;
}
const COLS = 'attr_name, attr_type, css_property, css_element, css_state, css_tier, tier_shape, source, role';

// The final walker report of a Solve run: the highest-numbered round-N/report.json beside the solve report.
export function finalWalk( reportFile ) {
	const dir = path.dirname( reportFile );
	const rounds = fs.readdirSync( dir ).map( ( d ) => /^round-(\d+)$/.exec( d ) ).filter( ( m ) => m && fs.existsSync( path.join( dir, m[ 0 ], 'report.json' ) ) ).sort( ( a, b ) => Number( b[ 1 ] ) - Number( a[ 1 ] ) );
	return rounds.length ? path.join( dir, rounds[ 0 ][ 0 ], 'report.json' ) : null;
}

// Every ref of every surface tree: its node and its ancestors' refs (nearest last).
export function treeIndex( buildDir, manifest ) {
	const nodes = new Map();
	const ancestors = new Map();
	for ( const s of Object.values( manifest ) ) {
		const f = s.tree && path.join( buildDir, s.tree );
		if ( ! f || ! fs.existsSync( f ) ) {
			continue;
		}
		const parentOf = new Map();
		walkTree( readTree( f ), ( n, i, parent ) => {
			parentOf.set( n, parent );
			const ref = refOf( n );
			if ( ! ref || nodes.has( ref ) ) {
				return;
			}
			nodes.set( ref, n );
			const chain = [];
			for ( let p = parent; p; p = parentOf.get( p ) ) {
				refOf( p ) && chain.unshift( refOf( p ) );
			}
			ancestors.set( ref, chain );
		} );
	}
	return { nodes, ancestors };
}

// block.json supports per block name.
function supportsIndex() {
	const out = {};
	for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
		const f = path.join( BLOCKS_DIR, dir, 'block.json' );
		if ( fs.existsSync( f ) ) {
			const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
			out[ j.name ] = j.supports || {};
		}
	}
	return out;
}

export function runTriage( { client, surface, report: reportArg = null, out = null } ) {
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const manifest = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) );
	const s = manifest[ surface ];
	if ( ! s ) {
		throw new Error( `no surface "${ surface }" in surfaces.json` );
	}
	const found = reportArg || latestReport( path.join( buildDir, 'qa', 'solve' ), surface );
	if ( ! found || ! fs.existsSync( found ) ) {
		throw new Error( `no solve report for "${ surface }"${ reportArg ? ` at ${ reportArg }` : ' (run solve.mjs on it first)' }` );
	}
	const reportFile = path.resolve( found );
	const walkFile = finalWalk( reportFile );
	if ( ! walkFile ) {
		throw new Error( `no round-N/report.json beside ${ reportFile }` );
	}
	const report = JSON.parse( fs.readFileSync( reportFile, 'utf8' ) );
	const walkReport = JSON.parse( fs.readFileSync( walkFile, 'utf8' ) );
	const { nodes, ancestors } = treeIndex( buildDir, manifest );
	const db = openDb();
	const rowsOf = new Map();
	const supports = supportsIndex();
	const ctx = {
		db,
		snapshot: loadSnapshot( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) ),
		stateMap: s.states || {},
		nodeFor: ( ref ) => nodes.get( ref ) || null,
		ancestorsOf: ( ref ) => ancestors.get( ref ) || [],
		// Every SGS-owned row of the block, css_property NULL rows included (lib/db.mjs::attrsFor leaves those out).
		attrRows: ( block ) => {
			rowsOf.has( block ) || rowsOf.set( block, db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' )` ).all( block ).map( ( r ) => ( { ...r } ) ) );
			return rowsOf.get( block );
		},
		roster: JSON.parse( fs.readFileSync( ROSTER, 'utf8' ) ).extensions || [],
		supportsFor: ( block ) => supports[ block ] || {},
		calFor: calibrationFor,
		refs: detectReferences(),
		helpers: helperIndex( [ ...phpFiles( path.join( PLUGIN, 'includes' ) ), ...phpFiles( BLOCKS_DIR ).filter( ( f ) => ! f.file.endsWith( '/render.php' ) ) ] ),
		blockPhp: ( slug ) => phpFiles( path.join( BLOCKS_DIR, slug ) ).filter( ( f ) => ! f.file.endsWith( '/render.php' ) ).map( ( f ) => f.text ),
		readSource: ( slug, file ) => {
			const f = path.join( BLOCKS_DIR, slug, file );
			return fs.existsSync( f ) ? fs.readFileSync( f, 'utf8' ) : null;
		},
	};
	const result = triage( report, walkReport, surface, ctx );
	db.close();
	const rel = ( f ) => path.relative( REPO, f ).split( path.sep ).join( '/' );
	const file = path.resolve( out || path.join( buildDir, 'qa', 'triage', `${ surface }.json` ) );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( { surface, report: rel( reportFile ), walk: rel( walkFile ), date: new Date().toISOString().slice( 0, 10 ), counts: result.counts, verdicts: result.verdicts }, null, 1 ) );
	return { ...result, file };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	if ( ! client || ! surface ) {
		console.error( 'usage: node triage.mjs --client <slug> --surface <s> [--report <solve-report.json>] [--out <file>]' );
		process.exit( 2 );
	}
	let result;
	try {
		result = runTriage( { client, surface, report: flag( '--report' ), out: flag( '--out' ) } );
	} catch ( e ) {
		console.error( `[FAIL] triage ${ surface }: ${ e.message }` );
		process.exit( 1 );
	}
	const { verdicts, counts, file } = result;
	console.log( `triage ${ surface }: ${ verdicts.length } issues: W ${ counts.W }, F ${ counts.F }, T ${ counts.T }, U ${ counts.U } (box rows nothing explains); ${ file }` );
}
