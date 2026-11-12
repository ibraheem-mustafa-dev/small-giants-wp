#!/usr/bin/env node
'use strict';

/**
 * CLI: run transform.js over every block's front-end stylesheets in `build/blocks/*​/` (or an
 * explicit directory passed as argv[2]) and write the result back in
 * place.
 *
 * Intended postbuild wiring (added to package.json BY BEAN, not by this
 * script — see the report):
 *
 *   node scripts/hover-guard/run-transform.js && node scripts/hover-guard/check.js
 *
 * placed immediately after the existing
 *   node scripts/copy-built-styles.js
 * line in the `postbuild` script, so it runs on compiled output that has
 * already been copied into `build/blocks/*​/style.css`.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { transformCss } = require( './transform.js' );

const FRONT_END_STYLESHEETS = [ 'style-index.css', 'style-index-rtl.css', 'style.css', 'style-rtl.css' ];

function findStyleCssFiles( baseDir ) {
	const found = [];
	if ( ! fs.existsSync( baseDir ) ) {
		return found;
	}
	for ( const entry of fs.readdirSync( baseDir, { withFileTypes: true } ) ) {
		const full = path.join( baseDir, entry.name );
		if ( entry.isDirectory() ) {
			// Every front-end stylesheet a block ships: block.json names `style-index.css` (webpack's output), and
			// copy-built-styles.js also writes a `style.css` copy, each with an rtl twin. The transform is idempotent.
			const candidates = FRONT_END_STYLESHEETS.map( ( name ) => path.join( full, name ) ).filter( ( f ) => fs.existsSync( f ) );
			found.push( ...candidates );
			// also recurse one extra level in case of a nested blocks/ shape
			found.push( ...findStyleCssFiles( full ).filter( ( f ) => ! candidates.includes( f ) ) );
		}
	}
	return found;
}

function main() {
	const targetArg = process.argv[ 2 ];
	const baseDir = targetArg
		? path.resolve( targetArg )
		: path.resolve( __dirname, '..', '..', 'build', 'blocks' );

	if ( ! fs.existsSync( baseDir ) ) {
		console.error( `[hover-guard] target directory does not exist: ${ baseDir }` );
		console.error( '[hover-guard] NOT RUN — nothing to transform.' );
		process.exit( 1 );
	}

	const files = findStyleCssFiles( baseDir );
	if ( 0 === files.length ) {
		console.error( `[hover-guard] no style.css files found under ${ baseDir }` );
		console.error( '[hover-guard] NOT RUN — nothing to transform.' );
		process.exit( 1 );
	}

	let totalGuarded = 0;
	let totalSkipped = 0;
	let totalFindings = 0;
	const filesWithFindings = [];

	for ( const file of files ) {
		const css = fs.readFileSync( file, 'utf8' );
		const result = transformCss( css, file );

		if ( result.css !== css ) {
			fs.writeFileSync( file, result.css, 'utf8' );
		}

		totalGuarded += result.guardedCount;
		totalSkipped += result.skippedAlreadyGuarded;

		if ( result.findings.length > 0 ) {
			totalFindings += result.findings.length;
			filesWithFindings.push( { file, findings: result.findings } );
		}

		console.log(
			`[hover-guard] ${ path.relative( baseDir, file ) }: guarded ${ result.guardedCount }, already-guarded ${ result.skippedAlreadyGuarded }, findings ${ result.findings.length }`
		);
	}

	console.log( `[hover-guard] TOTAL: guarded ${ totalGuarded }, already-guarded ${ totalSkipped }, findings ${ totalFindings }` );

	if ( totalFindings > 0 ) {
		console.error( '[hover-guard] Some :hover rules could not be classified — run check.js for details and fix them by hand.' );
		for ( const { file, findings } of filesWithFindings ) {
			for ( const f of findings ) {
				console.error( `  ${ file }:${ f.line } [${ f.kind }] ${ f.selector }` );
			}
		}
		process.exit( 1 );
	}

	process.exit( 0 );
}

if ( require.main === module ) {
	main();
}

module.exports = { findStyleCssFiles };
