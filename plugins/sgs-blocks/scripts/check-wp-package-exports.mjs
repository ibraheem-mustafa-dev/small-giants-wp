#!/usr/bin/env node
/**
 * check-wp-package-exports.mjs: every named import from a @wordpress/* package in src/ is a name that package exports.
 *
 * The build maps @wordpress/* imports to WordPress's own script globals (wp.dom, wp.blockEditor, ...), and webpack does
 * not check that the name exists there. An import of a name the package does not export builds green and is
 * `undefined` at runtime: `import { stripHTML } from '@wordpress/dom'` (the package exports `__unstableStripHTML`)
 * threw "stripHTML is not a function" in the editor on every page holding a block that called it.
 *
 * The installed package's own exports are the reference (node_modules/@wordpress/<name>, the version the build uses).
 * An import is skipped, and counted as unverified, when the package cannot be loaded in Node.
 *
 *   node plugins/sgs-blocks/scripts/check-wp-package-exports.mjs --check      # exit 1 on a missing export
 *   node plugins/sgs-blocks/scripts/check-wp-package-exports.mjs --survey      # list every finding
 *   node plugins/sgs-blocks/scripts/check-wp-package-exports.mjs --self-test   # fixtures incl. a negative control
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..' );
const SRC = path.join( PLUGIN, 'src' );
const IMPORT = /import\s+(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"](@wordpress\/[\w-]+)['"]/g;

/** [{ pkg, name }] for every named import in `source`, comments removed. */
export function namedImports( source ) {
	const code = source.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /(^|[^:])\/\/[^\n]*/g, '$1' );
	const found = [];
	for ( const match of code.matchAll( IMPORT ) ) {
		for ( const part of match[ 1 ].split( ',' ) ) {
			const name = part.trim().split( /\s+as\s+/ )[ 0 ].trim();
			if ( name ) found.push( { pkg: match[ 2 ], name } );
		}
	}
	return found;
}

/** The names a package's entry file exports, read from its export statements (followed through relative `export *`). */
function textExports( pkg ) {
	try {
		const dir = path.join( PLUGIN, 'node_modules', pkg );
		const manifest = JSON.parse( fs.readFileSync( path.join( dir, 'package.json' ), 'utf8' ) );
		const entry = manifest.module || manifest.main;
		const names = new Set();
		const seen = new Set();
		const read = ( file ) => {
			if ( seen.has( file ) || ! fs.existsSync( file ) ) return;
			seen.add( file );
			const code = fs.readFileSync( file, 'utf8' ).replace( /\/\*[\s\S]*?\*\//g, '' );
			for ( const m of code.matchAll( /export\s*\{([^}]*)\}/g ) ) {
				for ( const part of m[ 1 ].split( ',' ) ) {
					const alias = part.trim().split( /\s+as\s+/ ).pop().trim();
					if ( alias ) names.add( alias );
				}
			}
			for ( const m of code.matchAll( /export\s+(?:const|let|var|function\*?|class|async\s+function)\s+([\w$]+)/g ) ) names.add( m[ 1 ] );
			for ( const m of code.matchAll( /export\s*\*\s*from\s*["'](\.[^"']+)["']/g ) ) {
				const target = path.resolve( path.dirname( file ), m[ 1 ] );
				read( fs.existsSync( target ) && fs.statSync( target ).isDirectory() ? path.join( target, 'index.mjs' ) : target );
			}
		};
		read( path.join( dir, entry ) );
		return names.size ? names : null;
	} catch ( error ) {
		return null;
	}
}

const exportsCache = new Map();
async function exportsOf( pkg ) {
	if ( exportsCache.has( pkg ) ) return exportsCache.get( pkg );
	let names = null;
	try {
		const dir = path.join( PLUGIN, 'node_modules', pkg );
		const manifest = JSON.parse( fs.readFileSync( path.join( dir, 'package.json' ), 'utf8' ) );
		const entry = manifest.module || manifest.exports?.[ '.' ]?.import || manifest.exports?.[ '.' ]?.default || manifest.main;
		const target = typeof entry === 'string' ? entry : entry?.default;
		names = new Set( Object.keys( await import( pathToFileURL( path.join( dir, target ) ).href ) ) );
	} catch ( error ) {
		names = textExports( pkg );
	}
	exportsCache.set( pkg, names );
	return names;
}

function* sourceFiles( dir ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) yield* sourceFiles( full );
		else if ( /\.(js|jsx|mjs)$/.test( entry.name ) ) yield full;
	}
}

async function survey() {
	const findings = [];
	const unverified = new Set();
	let checked = 0;
	for ( const file of sourceFiles( SRC ) ) {
		for ( const { pkg, name } of namedImports( fs.readFileSync( file, 'utf8' ) ) ) {
			const names = await exportsOf( pkg );
			if ( ! names ) {
				unverified.add( pkg );
				continue;
			}
			checked++;
			if ( ! names.has( name ) ) findings.push( { file: path.relative( PLUGIN, file ).split( path.sep ).join( '/' ), pkg, name } );
		}
	}
	return { findings, unverified: [ ...unverified ].sort(), checked };
}

async function selfTest() {
	let failed = 0;
	const expect = ( ok, label ) => {
		console.log( `  ${ ok ? 'ok  ' : 'FAIL' } ${ label }` );
		failed += ok ? 0 : 1;
	};
	const got = namedImports( "import { a, b as c } from '@wordpress/dom';\n// import { gone } from '@wordpress/dom';\nimport x, { d } from '@wordpress/data';" );
	expect( JSON.stringify( got.map( ( g ) => g.name ) ) === '["a","b","d"]', 'parses plain, aliased and default-plus-named imports and skips comments' );
	const dom = await exportsOf( '@wordpress/dom' );
	expect( Boolean( dom ) && dom.has( '__unstableStripHTML' ), 'positive control: @wordpress/dom exports __unstableStripHTML' );
	expect( Boolean( dom ) && ! dom.has( 'stripHTML' ), 'negative control: @wordpress/dom does not export stripHTML (the name that crashed the editor)' );
	return failed ? 1 : 0;
}

/** Map of package -> names imported from it anywhere in src/, for the editor gate to check against the live wp.* globals. */
export function importedNamesByPackage() {
	const byPackage = new Map();
	for ( const file of sourceFiles( SRC ) ) {
		for ( const { pkg, name } of namedImports( fs.readFileSync( file, 'utf8' ) ) ) {
			if ( ! byPackage.has( pkg ) ) byPackage.set( pkg, new Set() );
			byPackage.get( pkg ).add( name );
		}
	}
	return byPackage;
}

/** Script modules: loaded by view scripts through an import map, never a wp.* global, so the editor cannot check them. */
const SCRIPT_MODULE_ONLY = new Set( [ '@wordpress/interactivity', '@wordpress/interactivity-router' ] );

/** Packages WordPress provides at runtime (no copy in node_modules), the only reference for them is the live editor. */
export function runtimeOnlyPackages( byPackage ) {
	return [ ...byPackage.keys() ].filter( ( pkg ) => ! SCRIPT_MODULE_ONLY.has( pkg ) && ! fs.existsSync( path.join( PLUGIN, 'node_modules', pkg, 'package.json' ) ) );
}

const isMain = process.argv[ 1 ] && pathToFileURL( path.resolve( process.argv[ 1 ] ) ).href === import.meta.url;
const mode = isMain ? process.argv[ 2 ] : null;
if ( ! isMain ) {
	// imported by check-editor-loads.mjs
} else if ( mode === '--self-test' ) {
	process.exit( await selfTest() );
} else if ( mode === '--check' || mode === '--survey' ) {
	const { findings, unverified, checked } = await survey();
	console.log( `${ checked } named @wordpress import(s) checked; ${ findings.length } not exported by the installed package; ${ unverified.length } package(s) not loadable in Node (${ unverified.join( ', ' ) || 'none' })` );
	for ( const f of findings ) console.log( `  ${ f.file }: { ${ f.name } } from ${ f.pkg }` );
	process.exit( mode === '--check' && findings.length ? 1 : 0 );
} else {
	console.error( 'Usage: check-wp-package-exports.mjs --check | --survey | --self-test' );
	process.exit( 2 );
}
