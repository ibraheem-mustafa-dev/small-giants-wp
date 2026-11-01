#!/usr/bin/env node
// Detector for hard-coded calibration-cache paths (Spec 48 §3.2). Every reader and writer of the route's cache takes its
// folder from lib/cache-dir.mjs::routeCacheDir (Python: plugins/sgs-blocks/scripts/lib/route_cache_dir.py); this lists any
// file that still spells the folder itself.
//   node scripts/computed-route/tools/cache-path-survey.mjs [--survey] [--json] [--check] [--root <repo>] [--self-test]
// --survey (default) prints every hit; --check exits 1 while any remains; --self-test proves each pattern fires on a planted
// hit and stays quiet on the resolver's own calls, a test's temporary cache and a line marked `cache-path-ok: <reason>`.
// Scans *.mjs, *.js and *.py under scripts/ and plugins/ (never node_modules, the cache itself or tests/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const SELF = 'scripts/computed-route/tools/cache-path-survey.mjs';
const SKIP_DIRS = new Set( [ 'node_modules', 'cache', 'tests', '.git', 'build', 'vendor', '__pycache__' ] );
const ROOTS = [ 'scripts', 'plugins' ];

export const PATTERNS = [
	{ name: 'js-base-cache', re: /path\.join\(\s*(?:HERE|ROUTE|REPO|ROOT|__dirname|path\.dirname\(\s*fileURLToPath\(\s*import\.meta\.url\s*\)\s*\))\s*,\s*(?:'\.\.'\s*,\s*)*'cache'\s*\)/ },
	{ name: 'js-route-segments', re: /'scripts'\s*,\s*'computed-route'\s*,\s*'cache'/ },
	{ name: 'string-route-cache', re: /['"`][^'"`\n]*scripts[\/]+computed-route[\/]+cache(?!-dir)[^'"`\n]*['"`]/ },
	{ name: 'py-path-segments', re: /["']scripts["']\s*\/\s*["']computed-route["']\s*\/\s*["']cache["']/ },
	{ name: 'py-path-segments-any-root', re: /["']computed-route["']\s*\/\s*["']cache["']/ },
];

// The hits in one file's text: [ { line, pattern, text } ].
export function hitsIn( text ) {
	const out = [];
	text.split( /\r?\n/ ).forEach( ( line, i ) => {
		if ( /cache-path-ok:/.test( line ) || /^\s*(?:\/\/|#|\*)/.test( line ) ) {
			return;
		}
		const p = PATTERNS.find( ( x ) => x.re.test( line ) );
		p && out.push( { line: i + 1, pattern: p.name, text: line.trim().slice( 0, 200 ) } );
	} );
	return out;
}

function files( root ) {
	const out = [];
	const go = ( dir ) => {
		for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			if ( e.isDirectory() ) {
				SKIP_DIRS.has( e.name ) || go( path.join( dir, e.name ) );
			} else if ( /\.(?:mjs|js|py)$/.test( e.name ) ) {
				out.push( path.join( dir, e.name ) );
			}
		}
	};
	ROOTS.filter( ( r ) => fs.existsSync( path.join( root, r ) ) ).forEach( ( r ) => go( path.join( root, r ) ) );
	return out;
}

export function survey( root = REPO ) {
	const rows = [];
	for ( const f of files( root ) ) {
		const rel = path.relative( root, f ).split( path.sep ).join( '/' );
		if ( rel === SELF ) {
			continue;
		}
		hitsIn( fs.readFileSync( f, 'utf8' ) ).forEach( ( h ) => rows.push( { file: rel, ...h } ) );
	}
	return rows;
}

export function selfTest() {
	const must = [
		[ "const CACHE = path.join( HERE, 'cache' );", 'js-base-cache' ],
		[ "const CACHE = path.join( HERE, '..', 'cache' );", 'js-base-cache' ],
		[ "path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'cache' )", 'js-base-cache' ],
		[ "const c = path.join( REPO, 'scripts', 'computed-route', 'cache' );", 'js-route-segments' ],
		[ "export const D = 'C:/Users/x/small-giants-wp/scripts/computed-route/cache';", 'string-route-cache' ],
		[ 'CACHE = REPO / "scripts" / "computed-route" / "cache"', 'py-path-segments' ],
		[ "cache = ROOT / 'plugins' / 'x' / 'computed-route' / 'cache'", 'py-path-segments-any-root' ],
	];
	const quiet = [
		"const CACHE = routeCacheDir( REPO );",
		"const cache = path.join( work, 'cache' );",
		"const cacheDir = path.join( repo, 'cache' );",
		"// the cache is scripts/computed-route/cache by default",
		"const f = 'scripts/computed-route/cache-dir.local';",
		"const e = 'x/scripts/computed-route/cache'; // cache-path-ok: a label, not a read",
	];
	const problems = [];
	must.forEach( ( [ text, want ] ) => {
		const got = hitsIn( text )[ 0 ]?.pattern;
		got === want || problems.push( `planted hit not caught as ${ want } (got ${ got ?? 'nothing' }): ${ text }` );
	} );
	quiet.forEach( ( text ) => {
		hitsIn( text ).length && problems.push( `false positive: ${ text }` );
	} );
	return problems;
}

function main( argv ) {
	if ( argv.includes( '--self-test' ) ) {
		const problems = selfTest();
		problems.forEach( ( p ) => console.error( p ) );
		console.log( problems.length ? `self-test FAILED (${ problems.length })` : 'self-test ok' );
		return problems.length ? 1 : 0;
	}
	const at = argv.indexOf( '--root' );
	const rows = survey( at >= 0 ? path.resolve( argv[ at + 1 ] ) : REPO );
	if ( argv.includes( '--json' ) ) {
		console.log( JSON.stringify( { count: rows.length, rows }, null, 1 ) );
	} else {
		rows.forEach( ( r ) => console.log( `${ r.file }:${ r.line } [${ r.pattern }] ${ r.text }` ) );
		console.log( `${ rows.length } hard-coded route-cache path(s)` );
	}
	return argv.includes( '--check' ) && rows.length ? 1 : 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
