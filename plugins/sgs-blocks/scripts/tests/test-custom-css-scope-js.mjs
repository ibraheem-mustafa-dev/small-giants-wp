#!/usr/bin/env node
/**
 * The editor's custom-CSS scoper against the SAME table the PHP scoper is tested against
 * (tests/shared/custom-css-scope-cases.json; PHP: tests/php/run-custom-css-scope-cases-standalone.php).
 *
 *   node scripts/tests/test-custom-css-scope-js.mjs
 *
 * A negative control proves the comparison fails for a scoper that only swaps `&selector`.
 */
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
if ( failed ) {
	console.error( `custom-css scope (JS): ${ failed } failure(s) of ${ table.cases.length }` );
	process.exit( 1 );
}
console.log( `custom-css scope (JS): ${ table.cases.length } cases pass; negative control caught ${ caught }` );
