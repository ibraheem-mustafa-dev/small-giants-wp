'use strict';

/**
 * The stylesheets the hover-on-touch contract covers (Spec 38A FR-38A-17), in one place for run-transform.js and
 * check.js:
 *   - built: every block's front-end stylesheet in `build/blocks/*​/` (written by the build, transformed at postbuild);
 *   - hand-written: stylesheets served straight from the repo (every stylesheet under the plugin's and the theme's `assets/`,
 *     and the theme's `style.css`), which carry the contract in their source.
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

/** Folders under an `assets/` directory that hold no hand-written front-end stylesheet. */
const SKIPPED_DIRS = new Set( [ 'node_modules', 'vendor', 'build', 'dist', 'admin' ] );

/** Every hand-written `.css` under a directory, at any depth (minified files and the folders above skipped). */
function stylesheetsUnder( dir ) {
	const found = [];
	if ( ! fs.existsSync( dir ) ) {
		return found;
	}
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ).sort( ( a, b ) => a.name.localeCompare( b.name ) ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( ! SKIPPED_DIRS.has( entry.name ) ) {
				found.push( ...stylesheetsUnder( full ) );
			}
		} else if ( entry.name.endsWith( '.css' ) && ! entry.name.endsWith( '.min.css' ) ) {
			found.push( full );
		}
	}
	return found;
}

/**
 * The hand-written stylesheets the site serves from source: every `.css` under the plugin's and the theme's `assets/`
 * (`assets/css`, `assets/toast`, `assets/floating-ui` and any folder added later), and the theme's `style.css`. The
 * `assets/admin` stylesheets load in wp-admin only, where touch-input.js does not run.
 */
function handWrittenStylesheets( repoRoot = REPO_ROOT ) {
	const files = [ ...stylesheetsUnder( path.join( repoRoot, 'plugins', 'sgs-blocks', 'assets' ) ), ...stylesheetsUnder( path.join( repoRoot, 'theme', 'sgs-theme', 'assets' ) ) ];
	const themeStyle = path.join( repoRoot, 'theme', 'sgs-theme', 'style.css' );
	if ( fs.existsSync( themeStyle ) ) {
		files.push( themeStyle );
	}
	return files;
}

module.exports = { builtStylesheets, handWrittenStylesheets, PLUGIN_ROOT, REPO_ROOT };
