#!/usr/bin/env node
// Brings a Claude Design export made before MANIFEST.json existed (one carrying MANIFEST.md) to the Spec 48A format
// without changing a byte the export produced.
//   node scripts/computed-route/handoff-repackage.mjs <handoff folder> --project "<name>" --entry <draft> [--entry <draft> ...] --generated YYYY-MM-DD [--dry-run]
// 1. Proof: every file the old MANIFEST.md lists and the folder still holds must match its listed size and SHA-256, and
//    support.js must match the runtime hash MANIFEST.md states. Any mismatch stops the run before a write.
// 2. Repackage: removes MANIFEST.md and handoff-schema/trace/, copies each master handoff-schema file the folder lacks,
//    and writes MANIFEST.json (lib/handoff.mjs::buildManifest). Nothing else is removed, so any other stray file still
//    fails the check.
// 3. Runs the handoff check (lib/handoff.mjs::checkHandoff) and prints its result.
// Exit 0: repackaged and the check passes. Exit 1: the proof failed or the check fails. Exit 2: usage error.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildManifest, checkHandoff, readKnown, sha256, walkFolder, KNOWN_RUNTIMES, MASTER_SCHEMAS } from './lib/handoff.mjs';

const USAGE = 'usage: node scripts/computed-route/handoff-repackage.mjs <handoff folder> --project "<name>" --entry <draft> [--entry <draft> ...] --generated YYYY-MM-DD [--dry-run]';
const LEGACY_FILES = [ 'MANIFEST.md' ];
const LEGACY_DIRS = [ 'handoff-schema/trace' ];

// The command line as { folder, project, entries, generated, dryRun }, or { error }.
export function parseArgs( argv ) {
	const o = { folder: null, project: null, entries: [], generated: null, dryRun: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( [ '--project', '--entry', '--generated' ].includes( a ) ) {
			if ( undefined === argv[ i + 1 ] ) {
				return { error: `${ a } needs a value` };
			}
			const v = argv[ ++i ];
			if ( '--entry' === a ) {
				o.entries.push( v );
			} else {
				o[ a.slice( 2 ) ] = v;
			}
		} else if ( '--dry-run' === a ) {
			o.dryRun = true;
		} else if ( a.startsWith( '--' ) ) {
			return { error: `unknown option ${ a }` };
		} else if ( o.folder ) {
			return { error: `a second folder ${ a }` };
		} else {
			o.folder = a;
		}
	}
	if ( ! o.folder ) {
		return { error: 'no handoff folder given' };
	}
	if ( ! o.project || ! o.entries.length || ! o.generated ) {
		return { error: '--project, at least one --entry and --generated are required' };
	}
	if ( ! /^\d{4}-\d{2}-\d{2}$/.test( o.generated ) ) {
		return { error: `--generated ${ o.generated } is not YYYY-MM-DD` };
	}
	return o;
}

// The file rows of an old MANIFEST.md table ({ path, bytes, sha256 }) and the runtime hash its prose states, if any.
// Paths may be wrapped in backticks; rows without a 64-hex hash (headers, separators) are skipped.
export function readOldManifest( text ) {
	const rows = [];
	for ( const line of text.split( /\r?\n/ ) ) {
		const m = line.match( /^\|\s*`?([^|`]+?)`?\s*\|\s*(\d+)\s*\|\s*`?([0-9a-f]{64})`?\s*\|/ );
		if ( m ) {
			rows.push( { path: m[ 1 ], bytes: Number( m[ 2 ] ), sha256: m[ 3 ] } );
		}
	}
	const rt = text.match( /support\.js SHA-256[^`\n]*`([0-9a-f]{64})`/ );
	return { rows, runtime: rt ? rt[ 1 ] : null };
}

// Proves the folder still holds what the old MANIFEST.md recorded. Returns { problems, notes }; any problem means the
// folder changed after export (or cannot be proven unchanged) and must be re-exported instead.
export function proveUnchanged( root ) {
	const problems = [];
	const notes = [];
	const md = path.join( root, 'MANIFEST.md' );
	if ( fs.existsSync( path.join( root, 'MANIFEST.json' ) ) ) {
		problems.push( 'MANIFEST.json already exists: this export is already in the current format' );
		return { problems, notes };
	}
	if ( ! fs.existsSync( md ) ) {
		problems.push( 'MANIFEST.md is missing: nothing proves the folder matches the export, so re-export it' );
		return { problems, notes };
	}
	const { rows, runtime } = readOldManifest( fs.readFileSync( md, 'utf8' ) );
	if ( ! rows.length ) {
		problems.push( 'MANIFEST.md lists no file with a size and SHA-256, so the folder cannot be proven unchanged' );
		return { problems, notes };
	}
	const listed = new Set( rows.map( ( r ) => r.path ) );
	for ( const r of rows ) {
		const abs = path.join( root, r.path );
		if ( ! fs.existsSync( abs ) ) {
			notes.push( `${ r.path }: listed in MANIFEST.md, not in the folder` );
			continue;
		}
		const buf = fs.readFileSync( abs );
		if ( buf.length !== r.bytes || sha256( buf ) !== r.sha256 ) {
			problems.push( `${ r.path }: changed since export (MANIFEST.md ${ r.bytes } bytes ${ r.sha256 }, folder ${ buf.length } bytes ${ sha256( buf ) })` );
		}
	}
	const support = path.join( root, 'support.js' );
	if ( runtime && fs.existsSync( support ) && sha256( fs.readFileSync( support ) ) !== runtime ) {
		problems.push( `support.js: differs from the runtime hash MANIFEST.md states (${ runtime })` );
	}
	for ( const f of walkFolder( root ).files ) {
		if ( 'MANIFEST.md' !== f && ! listed.has( f ) ) {
			notes.push( `${ f }: in the folder, not listed in MANIFEST.md` );
		}
	}
	return { problems, notes };
}

// Repackages `root` in place after proveUnchanged passes. Returns { problems, notes, actions }; with dryRun the actions
// are listed and nothing is written.
export function repackage( root, { project, entries, generated, dryRun = false, schemas = MASTER_SCHEMAS } ) {
	const { problems, notes } = proveUnchanged( root );
	const actions = [];
	if ( problems.length ) {
		return { problems, notes, actions };
	}
	for ( const f of LEGACY_FILES ) {
		if ( fs.existsSync( path.join( root, f ) ) ) {
			actions.push( `remove ${ f }` );
			dryRun || fs.rmSync( path.join( root, f ) );
		}
	}
	for ( const d of LEGACY_DIRS ) {
		if ( fs.existsSync( path.join( root, d ) ) ) {
			actions.push( `remove ${ d }/` );
			dryRun || fs.rmSync( path.join( root, d ), { recursive: true } );
		}
	}
	for ( const f of fs.readdirSync( schemas ).sort() ) {
		const dest = path.join( root, 'handoff-schema', f );
		if ( ! fs.existsSync( dest ) ) {
			actions.push( `copy handoff-schema/${ f } from the master set` );
			if ( ! dryRun ) {
				fs.mkdirSync( path.dirname( dest ), { recursive: true } );
				fs.copyFileSync( path.join( schemas, f ), dest );
			}
		}
	}
	actions.push( `write MANIFEST.json (project "${ project }", entry drafts ${ entries.join( ', ' ) }, generated ${ generated })` );
	if ( ! dryRun ) {
		const manifest = buildManifest( root, { project, entryDrafts: entries, generated } );
		fs.writeFileSync( path.join( root, 'MANIFEST.json' ), `${ JSON.stringify( manifest, null, 2 ) }\n` );
	}
	return { problems, notes, actions };
}

export function main( argv, log = console.log ) {
	const o = parseArgs( argv );
	if ( o.error || ! fs.existsSync( o.folder ) || ! fs.statSync( o.folder ).isDirectory() ) {
		log( o.error || `${ o.folder } is not a directory` );
		log( USAGE );
		return 2;
	}
	const r = repackage( o.folder, o );
	r.notes.forEach( ( n ) => log( `NOTE ${ n }` ) );
	if ( r.problems.length ) {
		r.problems.forEach( ( p ) => log( `STOP ${ p }` ) );
		log( `${ o.folder }: not repackaged; re-export it from Claude Design` );
		return 1;
	}
	r.actions.forEach( ( a ) => log( `${ o.dryRun ? 'would ' : '' }${ a }` ) );
	if ( o.dryRun ) {
		return 0;
	}
	const c = checkHandoff( o.folder, { known: readKnown( KNOWN_RUNTIMES ) } );
	c.errors.forEach( ( e ) => log( `FAIL ${ e }` ) );
	c.warnings.forEach( ( w ) => log( `WARN ${ w }` ) );
	log( `${ o.folder }: repackaged; handoff check ${ c.errors.length ? 'FAIL' : 'pass' } (${ c.errors.length } failures, ${ c.warnings.length } warnings)` );
	return c.errors.length ? 1 : 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
