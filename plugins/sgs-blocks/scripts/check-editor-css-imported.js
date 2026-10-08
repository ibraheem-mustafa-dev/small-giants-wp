#!/usr/bin/env node
/**
 * check-editor-css-imported.js
 *
 * Fails when a block ships `src/blocks/<block>/editor.css` but no JavaScript
 * file in that block imports it. The build bundles a stylesheet only if an
 * entry imports it, so an unimported `editor.css` is dead: every rule in it
 * (a canvas-only sample, a hidden ToolsPanel title, a notice margin) is
 * missing from the built `index.css`, and the editor shows the block without
 * them. The gap is invisible to a build, a lint and a front-end check; only the
 * editor canvas shows it.
 *
 * A block counts as importing its stylesheet when any `.js` file under its
 * directory has a top-level `import` or a `require()` whose specifier resolves
 * to that block's `editor.css`. A comment that mentions the file does not count.
 *
 * Usage:
 *   node scripts/check-editor-css-imported.js --check       exit 1 on any unimported editor.css
 *   node scripts/check-editor-css-imported.js --self-test   fixtures that must fire and must not
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const BLOCKS = path.join( __dirname, '..', 'src', 'blocks' );
const SKIP_DIRS = new Set( [ 'node_modules', 'build', '__tests__', 'test', 'tests' ] );

// A line that starts an import, with or without bindings; or a require() call.
const IMPORT_RE = /^\s*import\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
const REQUIRE_RE = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * The module specifiers a source file imports, comments excluded.
 *
 * @param {string} source JavaScript source.
 * @return {string[]} Specifiers.
 */
function importSpecifiers( source ) {
	const stripped = source.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /^\s*\/\/.*$/gm, '' );
	const out = [];
	for ( const re of [ IMPORT_RE, REQUIRE_RE ] ) {
		re.lastIndex = 0;
		let match = re.exec( stripped );
		while ( match ) {
			out.push( match[ 1 ] );
			match = re.exec( stripped );
		}
	}
	return out;
}

/**
 * Whether any file in a block imports that block's editor.css.
 *
 * @param {string} block Block directory name.
 * @param {Object<string,string>} files Map of path relative to src/blocks (posix) to source.
 * @return {boolean} True when the stylesheet is imported.
 */
function importsEditorCss( block, files ) {
	const target = `${ block }/editor.css`;
	for ( const [ file, source ] of Object.entries( files ) ) {
		if ( ! file.endsWith( '.js' ) ) {
			continue;
		}
		const dir = path.posix.dirname( file );
		for ( const spec of importSpecifiers( source ) ) {
			if ( spec.startsWith( '.' ) && path.posix.normalize( path.posix.join( dir, spec ) ) === target ) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Every .js file under a block directory, keyed by path relative to src/blocks.
 *
 * @param {string} block Block directory name.
 * @return {Object<string,string>} Path to source.
 */
function readBlockJs( block ) {
	const files = {};
	const walk = ( dir ) => {
		for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const full = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				if ( ! SKIP_DIRS.has( entry.name ) ) {
					walk( full );
				}
			} else if ( entry.name.endsWith( '.js' ) ) {
				files[ path.relative( BLOCKS, full ).split( path.sep ).join( '/' ) ] = fs.readFileSync( full, 'utf8' );
			}
		}
	};
	walk( path.join( BLOCKS, block ) );
	return files;
}

function runCheck() {
	const blocks = fs.readdirSync( BLOCKS, { withFileTypes: true } )
		.filter( ( e ) => e.isDirectory() && fs.existsSync( path.join( BLOCKS, e.name, 'editor.css' ) ) )
		.map( ( e ) => e.name );
	const missing = blocks.filter( ( block ) => ! importsEditorCss( block, readBlockJs( block ) ) );
	for ( const block of missing ) {
		console.log( `  ${ block }: src/blocks/${ block }/editor.css is not imported by any file in the block, so its rules never reach the editor. Add \`import './editor.css';\` to ${ block }/index.js.` );
	}
	if ( missing.length ) {
		console.log( `[check-editor-css-imported] FAIL: ${ missing.length } of ${ blocks.length } editor.css file(s) are never imported.` );
		return 1;
	}
	console.log( `[check-editor-css-imported] OK: all ${ blocks.length } editor.css files are imported.` );
	return 0;
}

const FIXTURES = [
	{ name: 'imported from index.js', block: 'a', files: { 'a/index.js': "import './style.css';\nimport './editor.css';\n" }, want: true },
	{ name: 'double-quoted import', block: 'a', files: { 'a/index.js': 'import "./editor.css";' }, want: true },
	{ name: 'imported from a nested component', block: 'a', files: { 'a/index.js': '', 'a/components/Panel.js': "import '../editor.css';" }, want: true },
	{ name: 'require() form', block: 'a', files: { 'a/index.js': "require( './editor.css' );" }, want: true },
	{ name: 'never imported', block: 'a', files: { 'a/index.js': "import './style.css';\n" }, want: false },
	{ name: 'mentioned only in a line comment', block: 'a', files: { 'a/index.js': "// import './editor.css';\n" }, want: false },
	{ name: 'mentioned only in a block comment', block: 'a', files: { 'a/index.js': "/*\nimport './editor.css';\n*/\n" }, want: false },
	{ name: "another block's editor.css", block: 'a', files: { 'a/index.js': "import '../b/editor.css';" }, want: false },
	{ name: 'a different stylesheet named editor-extra.css', block: 'a', files: { 'a/index.js': "import './editor-extra.css';" }, want: false },
	{ name: 'a non-relative package specifier', block: 'a', files: { 'a/index.js': "import 'editor.css';" }, want: false },
];

function runSelfTest() {
	let failed = 0;
	for ( const fx of FIXTURES ) {
		const got = importsEditorCss( fx.block, fx.files );
		const ok = got === fx.want;
		failed += ok ? 0 : 1;
		console.log( `  ${ ok ? 'PASS' : 'FAIL' }  ${ fx.name }${ ok ? '' : ` (got ${ got })` }` );
	}
	console.log( `${ FIXTURES.length - failed }/${ FIXTURES.length } checks passed` );
	return failed ? 1 : 0;
}

if ( require.main === module ) {
	const args = process.argv.slice( 2 );
	process.exit( args.includes( '--self-test' ) ? runSelfTest() : runCheck() );
}

module.exports = { importsEditorCss, importSpecifiers };
