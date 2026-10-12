#!/usr/bin/env node
/**
 * The editor's custom-CSS scoper against the SAME table the PHP scoper is tested against
 * (tests/shared/custom-css-scope-cases.json; PHP: tests/php/run-custom-css-scope-cases-standalone.php).
 *
 *   node scripts/tests/test-custom-css-scope-js.mjs
 *
 * A negative control proves the comparison fails for a scoper that only swaps `&selector`. The PHP twin's runner is
 * run too (the gate runner starts only python and node), so this one gate fails when either side disagrees with the
 * table; a missing `php` fails it rather than skipping.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scopeCustomCss } from '../../src/utils/custom-css-scope.js';

const here = dirname( fileURLToPath( import.meta.url ) );
const table = JSON.parse( readFileSync( join( here, '..', '..', 'tests', 'shared', 'custom-css-scope-cases.json' ), 'utf8' ) );

function failures( scoper, report ) {
	let failed = 0;
	for ( const row of table.cases ) {
		const got = scoper( row.css, table.scope );
		if ( got.css !== row.out || JSON.stringify( got.refused ) !== JSON.stringify( row.refused ) ) {
			failed++;
			if ( report ) {
				console.error( `FAIL ${ row.name }\n  expected: ${ row.out } ${ JSON.stringify( row.refused ) }\n  actual:   ${ got.css } ${ JSON.stringify( got.refused ) }` );
			}
		}
	}
	return failed;
}

let failed = failures( scopeCustomCss, true );
const caught = failures( ( css, scope ) => ( { css: css.split( '&selector' ).join( scope ), refused: [] } ), false );
if ( caught < 10 ) {
	console.error( `FAIL negative control: a string-replace scoper failed only ${ caught } rows` );
	failed++;
}

const php = spawnSync( 'php', [ join( here, '..', '..', 'tests', 'php', 'run-custom-css-scope-cases-standalone.php' ) ], { encoding: 'utf8' } );
if ( php.status !== 0 ) {
	console.error( php.error ? `FAIL the PHP twin could not run: ${ php.error.message }` : `${ php.stdout }${ php.stderr }FAIL the PHP twin` );
	failed++;
} else {
	process.stdout.write( php.stdout );
}

if ( failed ) {
	console.error( `custom-css scope (JS): ${ failed } failure(s) of ${ table.cases.length }` );
	process.exit( 1 );
}
console.log( `custom-css scope (JS): ${ table.cases.length } cases pass; negative control caught ${ caught }` );
