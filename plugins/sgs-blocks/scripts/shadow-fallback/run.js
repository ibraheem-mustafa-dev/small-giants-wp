#!/usr/bin/env node
'use strict';

/**
 * Forced-colours shadow fallback for static stylesheets: census, fix and gate in one script.
 *
 *   node scripts/shadow-fallback/run.js --survey        list every stylesheet shadow without a fallback
 *   node scripts/shadow-fallback/run.js --build         postbuild: add the fallback to build/blocks/**​/*.css in place
 *   node scripts/shadow-fallback/run.js --fix-theme [--apply]   add it to the theme's hand-written stylesheets
 *   node scripts/shadow-fallback/run.js --check         fail if any stylesheet shadow lacks its fallback
 *   node scripts/shadow-fallback/run.js --self-test     assertions and negative controls
 *
 * The rule and its exemptions live in transform.js. PHP-written shadows are covered by
 * sgs_shadow_box_decls() and are checked by scripts/check-shadow-fallback-php.py.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { transformCss, findUncovered } = require( './transform.js' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const BUILD_BLOCKS = path.join( PLUGIN, 'build', 'blocks' );
const THEME = path.resolve( PLUGIN, '..', '..', 'theme', 'sgs-theme' );

function walkCss( dir, keep ) {
	const out = [];
	if ( ! fs.existsSync( dir ) ) {
		return out;
	}
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...walkCss( full, keep ) );
		} else if ( entry.name.endsWith( '.css' ) && keep( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

function themeFiles() {
	const files = walkCss( path.join( THEME, 'assets', 'css' ), () => true );
	const main = path.join( THEME, 'style.css' );
	if ( fs.existsSync( main ) ) {
		files.push( main );
	}
	return files;
}

const BUILT_NAME = /^style(-index)?(-rtl)?\.css$/;
function builtFiles() {
	return walkCss( BUILD_BLOCKS, ( name ) => BUILT_NAME.test( name ) );
}

function report( files ) {
	let total = 0;
	for ( const file of files ) {
		const rows = findUncovered( fs.readFileSync( file, 'utf8' ), file );
		total += rows.length;
		for ( const row of rows ) {
			console.log( `  ${ path.relative( PLUGIN, file ) }:${ row.line }  ${ row.selector.replace( /\s+/g, ' ' ).slice( 0, 90 ) }` );
		}
	}
	return total;
}

function selfTest() {
	let failed = 0;
	const eq = ( actual, expected, label ) => {
		if ( actual !== expected ) {
			failed++;
			console.error( `FAIL ${ label }\n  expected ${ JSON.stringify( expected ) }\n  actual   ${ JSON.stringify( actual ) }` );
		}
	};
	// postcss keeps the source's whitespace; compare structure, not layout.
	const sq = ( css ) => css.replace( /\s+/g, ' ' ).replace( / ?([{};:,]) ?/g, '$1' );
	const fb = ( sel ) => `@media (forced-colors:active){${ sel }:not(:focus-visible){outline:1px solid CanvasText;outline-offset:-1px}}`;

	const plain = transformCss( '.a{box-shadow:0 1px 2px red}', 't.css' );
	eq( sq( plain.css ), `.a{box-shadow:0 1px 2px red}${ fb( '.a' ) }`, 'a resting shadow gets the fallback' );
	eq( transformCss( plain.css, 't.css' ).css, plain.css, 'running twice changes nothing' );
	eq( transformCss( '.a{box-shadow:none}', 't.css' ).added, 0, 'none gets none' );
	eq( transformCss( '.a{box-shadow:inset 0 0 2px red}', 't.css' ).added, 0, 'an inset shadow is not an edge' );
	eq( transformCss( '.a:hover{box-shadow:0 1px 2px red}', 't.css' ).added, 0, 'a hover shadow is decoration' );
	eq( transformCss( '.a:focus-within{box-shadow:0 1px 2px red}', 't.css' ).added, 0, 'a focus shadow is not the resting edge' );
	eq( transformCss( '.a::after{box-shadow:0 1px 2px red}', 't.css' ).added, 0, 'a pseudo-element is not an edge' );
	eq( transformCss( '.a:after{box-shadow:0 1px 2px red}', 't.css' ).added, 0, 'the single-colon pseudo-element form is not an edge either' );
	eq( sq( transformCss( '.a,.b{box-shadow:var(--x)}', 't.css' ).css ).includes( '.a:not(:focus-visible),.b:not(:focus-visible)' ), true, 'a selector list is covered member by member' );
	eq( sq( transformCss( ':is(.a,.b){box-shadow:0 1px red}', 't.css' ).css ).includes( ':is(.a,.b):not(:focus-visible)' ), true, 'a comma inside :is() does not split the list' );
	eq( transformCss( '@media (forced-colors:active){.a{box-shadow:0 1px red}}', 't.css' ).added, 0, 'already inside a forced-colours query' );
	eq( transformCss( '@keyframes k{from{box-shadow:0 1px red}}', 't.css' ).added, 0, 'keyframes are not edges' );
	eq( sq( transformCss( '@media (min-width:600px){.a{box-shadow:0 1px red}}', 't.css' ).css ).includes( '@media (min-width:600px){.a{box-shadow:0 1px red}@media (forced-colors:active)' ), true, 'a fallback stays inside the query it belongs to' );

	// Negative control: the gate has to be able to fail, and a fix has to clear it.
	const bad = '.a{box-shadow:0 1px 2px red}';
	eq( findUncovered( bad, 't.css' ).length, 1, 'negative control: an uncovered shadow is found' );
	eq( findUncovered( transformCss( bad, 't.css' ).css, 't.css' ).length, 0, 'negative control: the fix clears the finding' );
	// Coverage must be per selector: a fallback for .a does not cover .b.
	eq( findUncovered( `${ bad }.b{box-shadow:0 1px red}${ fb( '.a' ) }`, 't.css' ).length, 1, 'negative control: a fallback for one selector does not cover another' );

	if ( failed ) {
		console.error( `shadow-fallback self-test: ${ failed } failed` );
		process.exit( 1 );
	}
	console.log( 'shadow-fallback self-test: all passed' );
}

function main() {
	const mode = process.argv[ 2 ];
	if ( '--self-test' === mode ) {
		return selfTest();
	}
	if ( '--build' === mode ) {
		const files = builtFiles();
		if ( 0 === files.length ) {
			console.error( `[shadow-fallback] no built stylesheets under ${ BUILD_BLOCKS }: NOT RUN` );
			process.exit( 1 );
		}
		let added = 0;
		for ( const file of files ) {
			const css = fs.readFileSync( file, 'utf8' );
			const result = transformCss( css, file );
			if ( result.css !== css ) {
				fs.writeFileSync( file, result.css, 'utf8' );
			}
			added += result.added;
		}
		console.log( `[shadow-fallback] ${ files.length } built stylesheets, ${ added } fallbacks added` );
		return;
	}
	if ( '--fix-theme' === mode ) {
		const apply = process.argv.includes( '--apply' );
		for ( const file of themeFiles() ) {
			const css = fs.readFileSync( file, 'utf8' );
			const result = transformCss( css, file );
			if ( result.added ) {
				console.log( `${ apply ? 'wrote' : 'would add' } ${ result.added } in ${ path.relative( PLUGIN, file ) }` );
				if ( apply ) {
					fs.writeFileSync( file, result.css, 'utf8' );
				}
			}
		}
		return;
	}
	if ( '--survey' === mode || '--check' === mode ) {
		const files = [ ...themeFiles(), ...builtFiles() ];
		const total = report( files );
		console.log( `[shadow-fallback] ${ files.length } stylesheets checked, ${ total } shadow rules without a forced-colours fallback` );
		if ( '--check' === mode && ( total > 0 || 0 === builtFiles().length ) ) {
			if ( 0 === builtFiles().length ) {
				console.error( '[shadow-fallback] NOT RUN against build output: build/blocks has no stylesheets' );
			}
			process.exit( 1 );
		}
		return;
	}
	console.error( 'usage: run.js --survey | --build | --fix-theme [--apply] | --check | --self-test' );
	process.exit( 2 );
}

main();
