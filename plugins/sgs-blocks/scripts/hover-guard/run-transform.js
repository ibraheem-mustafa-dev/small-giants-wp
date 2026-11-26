#!/usr/bin/env node
'use strict';

/**
 * Apply the hover-on-touch contract (transform.js) to stylesheets in place.
 *
 *   node scripts/hover-guard/run-transform.js            postbuild: every block stylesheet in build/blocks/
 *   node scripts/hover-guard/run-transform.js <dir>      the same for another built blocks directory
 *   node scripts/hover-guard/run-transform.js --sources  the hand-written stylesheets (sources.js), in the repo
 *
 * Idempotent. Exits 1 when the target is missing or a selector cannot be parsed.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { transformCss } = require( './transform.js' );
const { builtStylesheets, handWrittenStylesheets, PLUGIN_ROOT } = require( './sources.js' );

function main() {
	const arg = process.argv[ 2 ];
	let files;
	if ( '--sources' === arg ) {
		files = handWrittenStylesheets();
	} else {
		const baseDir = arg ? path.resolve( arg ) : path.join( PLUGIN_ROOT, 'build', 'blocks' );
		if ( ! fs.existsSync( baseDir ) ) {
			console.error( `[hover-guard] NOT RUN: ${ baseDir } does not exist` );
			process.exit( 1 );
		}
		files = builtStylesheets( baseDir );
	}
	if ( 0 === files.length ) {
		console.error( '[hover-guard] NOT RUN: no stylesheets found' );
		process.exit( 1 );
	}

	let mouse = 0; // hover members newly guarded
	let touch = 0;
	let changed = 0;
	const findings = [];
	for ( const file of files ) {
		const css = fs.readFileSync( file, 'utf8' );
		const result = transformCss( css, file );
		if ( result.css !== css ) {
			fs.writeFileSync( file, result.css, 'utf8' );
			changed++;
		}
		mouse += result.guardedCount;
		touch += result.touchCount;
		findings.push( ...result.findings.map( ( f ) => ( { file, ...f } ) ) );
	}
	console.log( `[hover-guard] ${ files.length } stylesheets, ${ changed } changed: ${ mouse } hover members newly guarded, ${ touch } touch halves added.` );
	for ( const f of findings ) {
		console.error( `  ${ f.file }:${ f.line } [${ f.kind }] ${ f.selector }` );
	}
	process.exit( findings.length ? 1 : 0 );
}

if ( require.main === module ) {
	main();
}

module.exports = { findStyleCssFiles: builtStylesheets };
