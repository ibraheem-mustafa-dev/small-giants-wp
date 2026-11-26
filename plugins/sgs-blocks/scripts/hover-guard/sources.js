'use strict';

/**
 * The stylesheets the hover-on-touch contract covers (Spec 38A FR-38A-17), in one place for run-transform.js and
 * check.js:
 *   - built: every block's front-end stylesheet in `build/blocks/*​/` (written by the build, transformed at postbuild);
 *   - hand-written: stylesheets served straight from the repo (the plugin's `assets/css/`, the theme's `assets/css/`
 *     and `style.css`), which carry the contract in their source.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const REPO_ROOT = path.resolve( PLUGIN_ROOT, '..', '..' );
const FRONT_END_STYLESHEETS = [ 'style-index.css', 'style-index-rtl.css', 'style.css', 'style-rtl.css' ];

/** Every block front-end stylesheet under a built blocks directory. */
function builtStylesheets( baseDir ) {
	const found = [];
	if ( ! fs.existsSync( baseDir ) ) {
		return found;
	}
	for ( const entry of fs.readdirSync( baseDir, { withFileTypes: true } ) ) {
		const full = path.join( baseDir, entry.name );
		if ( entry.isDirectory() ) {
			const candidates = FRONT_END_STYLESHEETS.map( ( name ) => path.join( full, name ) ).filter( ( f ) => fs.existsSync( f ) );
			found.push( ...candidates );
			found.push( ...builtStylesheets( full ).filter( ( f ) => ! candidates.includes( f ) ) );
		}
	}
	return found;
}

/** The hand-written stylesheets the site serves from source. */
function handWrittenStylesheets( repoRoot = REPO_ROOT ) {
	const dirs = [ path.join( repoRoot, 'plugins', 'sgs-blocks', 'assets', 'css' ), path.join( repoRoot, 'theme', 'sgs-theme', 'assets', 'css' ) ];
	const files = [];
	for ( const dir of dirs ) {
		if ( fs.existsSync( dir ) ) {
			files.push( ...fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.css' ) && ! f.endsWith( '.min.css' ) ).map( ( f ) => path.join( dir, f ) ) );
		}
	}
	const themeStyle = path.join( repoRoot, 'theme', 'sgs-theme', 'style.css' );
	if ( fs.existsSync( themeStyle ) ) {
		files.push( themeStyle );
	}
	return files;
}

module.exports = { builtStylesheets, handWrittenStylesheets, PLUGIN_ROOT, REPO_ROOT };
