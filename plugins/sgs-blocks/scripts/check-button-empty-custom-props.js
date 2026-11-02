#!/usr/bin/env node
'use strict';

/**
 * check-button-empty-custom-props.js: the built button stylesheet keeps its empty custom-property declarations.
 *
 * `src/blocks/button/style.css` drops a preset's hover lift, scale or rotate by declaring the matching variable EMPTY
 * (`--sgs-btn-lift-hover: ;`) on `.sgs-button--link`, on `.sgs-button[data-sgs-mh-move]` (and its scale and rotate
 * siblings) and on `.sgs-button--hover-still`. An empty value is valid CSS and makes the hover `transform` compose to
 * `none`; a minifier that treats an empty declaration as dead and removes it would make every one of those buttons lift
 * by the preset again. This asserts, on the build output, that each of the three variables is still declared empty in at
 * least two rules (the link style, and the marker and opt-out rules).
 *
 * Usage (from plugins/sgs-blocks), after a build: node scripts/check-button-empty-custom-props.js --check
 *                                                 node scripts/check-button-empty-custom-props.js --self-test
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const VARIABLES = [ 'lift', 'scale', 'rotate' ];
const MIN_RULES = 2;
const FILES = [ 'style-index.css', 'style.css' ].map( ( name ) => path.join( __dirname, '..', 'build', 'blocks', 'button', name ) );

/**
 * @param {string} css Built stylesheet text.
 * @return {string[]} One message per variable declared empty in fewer than MIN_RULES rules.
 */
function problems( css ) {
	return VARIABLES.flatMap( ( name ) => {
		const empty = css.match( new RegExp( `--sgs-btn-${ name }-hover:\\s*(?=[;}])`, 'g' ) ) || [];
		return empty.length >= MIN_RULES
			? []
			: [ `--sgs-btn-${ name }-hover is declared empty in ${ empty.length } rule(s), expected at least ${ MIN_RULES }` ];
	} );
}

function selfTest() {
	const kept = '.sgs-button--link{--sgs-btn-lift-hover: ;--sgs-btn-scale-hover: ;--sgs-btn-rotate-hover: }.sgs-button[data-sgs-mh-move]{--sgs-btn-lift-hover:;}.sgs-button[data-sgs-mh-scale]{--sgs-btn-scale-hover:}.sgs-button[data-sgs-mh-rotate]{--sgs-btn-rotate-hover: ;}';
	const stripped = kept.replace( /--sgs-btn-lift-hover:\s*;?/g, '' );
	const results = [
		[ 'a stylesheet that keeps every empty declaration passes', problems( kept ).length === 0 ],
		[ 'a minifier that drops the lift declarations is caught', problems( stripped ).some( ( m ) => m.includes( 'lift' ) ) ],
		[ 'an empty stylesheet fails for all three variables', problems( '' ).length === 3 ],
	];
	results.forEach( ( [ label, ok ] ) => console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ label }` ) );
	return results.every( ( [ , ok ] ) => ok ) ? 0 : 1;
}

function check() {
	let status = 0;
	for ( const file of FILES ) {
		if ( ! fs.existsSync( file ) ) {
			console.error( `[check-button-empty-custom-props] missing build output: ${ path.relative( process.cwd(), file ) } (run after a build)` );
			status = 1;
			continue;
		}
		const found = problems( fs.readFileSync( file, 'utf8' ) );
		found.forEach( ( m ) => console.error( `[check-button-empty-custom-props] ${ path.basename( file ) }: ${ m }` ) );
		status = found.length ? 1 : status;
	}
	if ( 0 === status ) {
		console.log( '[check-button-empty-custom-props] the built button CSS keeps its empty hover custom properties' );
	}
	return status;
}

process.exit( process.argv.includes( '--self-test' ) ? selfTest() : check() );
