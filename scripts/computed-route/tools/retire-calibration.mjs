#!/usr/bin/env node
// The detector for retiring calibration (the browser that measured every block on a site, with its cache bookkeeping): the
// setting record (DB table `setting_placements`) and the site look (plugins/sgs-blocks/scripts/site-look) now supply what it
// measured, offline. Every file the retirement removes is listed in REMOVED; a path is retired when it no longer exists AND no
// live file imports or names it.
//   node scripts/computed-route/tools/retire-calibration.mjs --survey      each listed path: gone or present, and who still names it
//   node scripts/computed-route/tools/retire-calibration.mjs --check       exit 1 while a listed path exists or a live file names one
//   node scripts/computed-route/tools/retire-calibration.mjs --self-test   plants a fake file and a fake import in a temp folder and shows --check catches both
// There is no --fix: each removal is a hand edit (a caller is rewritten, not just deleted). Live files are everything under
// scripts/, plugins/, theme/ and tools/ plus package.json and gates.json, except .claude/, reports, archive, backups, caches,
// node_modules, build output and markdown (the docs pass follows the code); this file and its test name every path on purpose.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const ROUTE = 'scripts/computed-route';
const lib = ( n ) => `${ ROUTE }/lib/${ n }.mjs`;

// Part A removes everything not marked `part: 'B'`; part B retargets the readers that still use the fixtures file.
export const REMOVED = [
	{ path: `${ ROUTE }/calibrate.mjs`, part: 'A' },
	{ path: `${ ROUTE }/stage0.mjs`, part: 'A' },
	{ path: `${ ROUTE }/provision-calibration-refs.mjs`, part: 'A' },
	{ path: `${ ROUTE }/tools/calibration-coverage.mjs`, part: 'A' },
	{ path: `${ ROUTE }/tools/fixture-completeness.mjs`, part: 'A' },
	{ path: `${ ROUTE }/data/calibration-baseline.schema.json`, part: 'A' },
	...[ 'stage0', 'provision-refs', 'calibration-coverage', 'calibrate-block', 'calibrate-pages', 'calibrate-basket', 'calibrate-wishlist', 'calibrate-order', 'calibrate-incremental', 'calibrate-container', 'calibrate-timing', 'calibration-lock', 'calibrate-chunk', 'calibrate-probe', 'calibrate-open', 'calibrate-read', 'provision-product' ].map( ( n ) => ( { path: lib( n ), part: 'A' } ) ),
	{ path: `${ ROUTE }/calibration-fixtures.json`, part: 'B' },
	{ path: `${ ROUTE }/fixture-refs.mjs`, part: 'B' },
	{ path: lib( 'fixture-refs' ), part: 'B' },
	{ path: 'plugins/sgs-blocks/scripts/lib/route_cache_dir.py', part: 'A' },
];

// The names a live file can use without an import: a module's bare name (`calibrate-basket`), a command's path from the
// repo or its folder, and the Python helper's module name. A command at the route's root shares its stem with a kept module
// (`calibrate.mjs`, `stage0.mjs`, `fixture-refs.mjs` also exist under lib/), so its bare name counts only when nothing precedes it.
const stem = ( p ) => path.basename( p ).replace( /\.[a-z]+$/, '' );
const esc = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
const ROOT_COMMANDS = [ 'calibrate.mjs', 'stage0.mjs', 'fixture-refs.mjs', 'provision-calibration-refs.mjs', 'calibration-fixtures.json' ];
const NAME_PATTERNS = [
	...REMOVED.filter( ( r ) => r.path.startsWith( `${ ROUTE }/lib/` ) && ! ROOT_COMMANDS.includes( path.basename( r.path ) ) ).map( ( r ) => ( { path: r.path, re: new RegExp( `(?<![\\w-])${ esc( stem( r.path ) ) }(?![\\w-])` ) } ) ),
	...REMOVED.filter( ( r ) => r.path.startsWith( `${ ROUTE }/lib/` ) && ROOT_COMMANDS.includes( path.basename( r.path ) ) ).map( ( r ) => ( { path: r.path, re: new RegExp( `lib/${ esc( path.basename( r.path ) ) }` ) } ) ),
	...REMOVED.filter( ( r ) => ! r.path.startsWith( `${ ROUTE }/lib/` ) ).map( ( r ) => {
		const tail = r.path.replace( `${ ROUTE }/`, '' );
		const root = ROOT_COMMANDS.includes( tail );
		return { path: r.path, re: new RegExp( `(?:${ esc( root ? r.path.replace( 'scripts/', '' ) : tail ) }${ root ? `|(?<![\w./-])${ esc( tail ) }` : '' })(?![\w-])` ) };
	} ),
	{ path: 'plugins/sgs-blocks/scripts/lib/route_cache_dir.py', re: /route_cache_dir/ },
];
const SPECIFIER = /['"`]((?:\.{1,2}\/)[\w./-]+)['"`]/g;

const SKIP_DIRS = new Set( [ 'node_modules', '.git', 'build', 'vendor', 'cache', 'reports', 'archive', 'backups', 'qa', '__pycache__', '.claude' ] );
const LIVE_EXT = new Set( [ '.mjs', '.js', '.cjs', '.py', '.json', '.php', '.sh' ] );
const THIS_FILES = new Set( [ `${ ROUTE }/tools/retire-calibration.mjs`, `${ ROUTE }/tests/retire-calibration.test.mjs` ] );

function* liveFiles( root, rel ) {
	const abs = path.join( root, rel );
	for ( const e of fs.readdirSync( abs, { withFileTypes: true } ) ) {
		const r = `${ rel }/${ e.name }`.replace( /^\//, '' );
		if ( e.isDirectory() ) {
			if ( ! SKIP_DIRS.has( e.name ) ) {
				yield* liveFiles( root, r );
			}
		} else if ( LIVE_EXT.has( path.extname( e.name ) ) && ! THIS_FILES.has( r ) && fs.statSync( path.join( root, r ) ).size < 2e6 ) {
			yield r;
		}
	}
}

// { present: the listed paths that still exist, refs: [ { file, line, path, text } ] one per live line naming a listed path }.
export function scan( root = REPO ) {
	const present = REMOVED.filter( ( r ) => fs.existsSync( path.join( root, r.path ) ) );
	const listed = new Map( REMOVED.map( ( r ) => [ r.path, r ] ) );
	const refs = [];
	const top = [ 'scripts', 'plugins', 'theme', 'tools' ].filter( ( d ) => fs.existsSync( path.join( root, d ) ) );
	const files = [ ...top.flatMap( ( d ) => [ ...liveFiles( root, d ) ] ), ...[ 'package.json', 'gates.json' ].filter( ( f ) => fs.existsSync( path.join( root, f ) ) ) ];
	for ( const file of files ) {
		const lines = fs.readFileSync( path.join( root, file ), 'utf8' ).split( '\n' );
		lines.forEach( ( text, i ) => {
			const hits = new Set();
			for ( const m of text.matchAll( SPECIFIER ) ) {
				const to = path.posix.normalize( path.posix.join( path.posix.dirname( file ), m[ 1 ] ) );
				[ to, `${ to }.mjs` ].filter( ( c ) => listed.has( c ) ).forEach( ( c ) => hits.add( c ) );
			}
			NAME_PATTERNS.filter( ( p ) => p.re.test( text ) && p.path !== file ).forEach( ( p ) => hits.add( p.path ) );
			hits.forEach( ( p ) => refs.push( { file, line: i + 1, path: p, text: text.trim().slice( 0, 140 ) } ) );
		} );
	}
	return { present, refs };
}

function report( { present, refs }, verbose ) {
	const lines = [];
	for ( const r of REMOVED ) {
		const here = refs.filter( ( x ) => x.path === r.path );
		lines.push( `${ present.includes( r ) ? 'PRESENT' : 'gone   ' } [${ r.part }] ${ r.path }${ here.length ? `  named by ${ new Set( here.map( ( x ) => x.file ) ).size } file(s)` : '' }` );
		if ( verbose ) {
			here.forEach( ( x ) => lines.push( `           ${ x.file }:${ x.line}  ${ x.text }` ) );
		}
	}
	return lines;
}

// Plants a listed file and a live file importing it (and one naming a kept module, which must not count) in a temp folder.
export function selfTest() {
	const base = fs.existsSync( 'E:/sgs-tmp' ) ? 'E:/sgs-tmp' : os.tmpdir();
	const root = fs.mkdtempSync( path.join( base, 'retire-calibration-' ) );
	const put = ( rel, text ) => {
		fs.mkdirSync( path.dirname( path.join( root, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( root, rel ), text );
	};
	try {
		put( `${ ROUTE }/lib/calibrate.mjs`, '// kept: the pure functions\nexport const x = 1;\n' );
		put( `${ ROUTE }/lib/calibrate-markers.mjs`, "import { x } from './calibrate.mjs';\n" );
		put( `${ ROUTE }/fill.mjs`, "import { x } from './lib/calibrate.mjs';\n" );
		const clean = scan( root );
		const cleanOk = 0 === clean.present.length && 0 === clean.refs.length;
		put( `${ ROUTE }/lib/calibrate-basket.mjs`, 'export const fake = 1;\n' );
		put( `${ ROUTE }/lib/user.mjs`, "import { fake } from './calibrate-basket.mjs';\n" );
		put( `${ ROUTE }/tests/user.test.mjs`, "import { fake } from '../calibrate.mjs';\n" );
		const dirty = scan( root );
		const catchesFile = dirty.present.some( ( r ) => r.path === lib( 'calibrate-basket' ) );
		const catchesImport = dirty.refs.some( ( x ) => x.file === `${ ROUTE }/lib/user.mjs` && x.path === lib( 'calibrate-basket' ) );
		const catchesRootCommand = dirty.refs.some( ( x ) => x.file === `${ ROUTE }/tests/user.test.mjs` && x.path === `${ ROUTE }/calibrate.mjs` );
		return { cleanOk, catchesFile, catchesImport, catchesRootCommand, ok: cleanOk && catchesFile && catchesImport && catchesRootCommand };
	} finally {
		fs.rmSync( root, { recursive: true, force: true } );
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const mode = process.argv[ 2 ];
	if ( '--self-test' === mode ) {
		const r = selfTest();
		console.log( JSON.stringify( r ) );
		process.exit( r.ok ? 0 : 1 );
	} else if ( '--survey' === mode || '--check' === mode ) {
		const result = scan();
		report( result, '--survey' === mode ).forEach( ( l ) => console.log( l ) );
		const open = result.present.length + new Set( result.refs.map( ( x ) => `${ x.file }|${ x.path }` ) ).size;
		console.log( `${ result.present.length } of ${ REMOVED.length } listed paths still exist; ${ result.refs.length } live line(s) name one.` );
		if ( '--check' === mode ) {
			result.refs.forEach( ( x ) => console.log( `NAMED ${ x.file }:${ x.line } -> ${ x.path }` ) );
			process.exit( open ? 1 : 0 );
		}
	} else {
		console.error( 'usage: retire-calibration.mjs --survey | --check | --self-test' );
		process.exit( 2 );
	}
}
