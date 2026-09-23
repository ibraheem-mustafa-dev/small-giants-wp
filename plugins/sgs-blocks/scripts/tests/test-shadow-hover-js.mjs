#!/usr/bin/env node
/**
 * The JS hover resolver against the SAME table the PHP resolver is tested against
 * (tests/shared/shadow-hover-cases.json, written by tests/php/run-shadow-hover-shared-cases-standalone.php).
 *
 *   node scripts/tests/test-shadow-hover-js.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { shadowHoverValue, liftShape, isSlug } from '../../src/utils/shadow-hover.js';
import { composeShadow } from '../../src/utils/shadow-layers.js';

const here = dirname( fileURLToPath( import.meta.url ) );
const table = JSON.parse( readFileSync( join( here, '..', '..', 'tests', 'shared', 'shadow-hover-cases.json' ), 'utf8' ) );

function failures( resolver, report ) {
	let failed = 0;
	for ( const row of table ) {
		const actual = resolver( row.shape, row.colour, row.map );
		if ( actual !== row.expected ) {
			failed++;
			if ( report ) {
				console.error( `FAIL ${ row.name }\n  expected: ${ row.expected }\n  actual:   ${ actual }` );
			}
		}
	}
	return failed;
}

let failed = failures( shadowHoverValue, true );

// Negative control: the same comparison must catch a resolver with no map lookup and no lift.
const caught = failures( ( shape, colour ) => composeShadow( shape, colour ), false );
if ( caught < 5 ) {
	failed++;
	console.error( `FAIL negative control: a resolver with no map lookup and no lift was caught by only ${ caught } cases` );
}

// Structure the table cannot express.
const eq = ( actual, expected, label ) => {
	if ( JSON.stringify( actual ) !== JSON.stringify( expected ) ) {
		failed++;
		console.error( `FAIL ${ label }\n  expected: ${ JSON.stringify( expected ) }\n  actual:   ${ JSON.stringify( actual ) }` );
	}
};
eq( isSlug( 'floating' ), true, 'isSlug recognises a bare preset slug' );
eq( isSlug( 'none' ), false, 'isSlug excludes none' );
eq( isSlug( 'inset' ), false, 'isSlug excludes inset' );
eq( liftShape( '0 2px inset 4px' ), null, 'liftShape rejects inset in the middle, same as parseLayer' );
eq( liftShape( '0px 4px 12px 0px' ), '0px 5px 15px 0px', 'liftShape multiplies y and blur by 1.25 and rounds to a whole pixel' );

console.log( `JS shadow hover: ${ table.length } shared cases checked, ${ failed } failures (negative control caught ${ caught })` );
process.exit( failed > 0 ? 1 : 0 );
