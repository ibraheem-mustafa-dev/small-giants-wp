#!/usr/bin/env node
/**
 * The JS shadow composer against the SAME table the PHP composer is tested against
 * (tests/shared/shadow-compose-cases.json, written by tests/php/run-shadow-shared-cases-standalone.php).
 *
 *   node scripts/tests/test-shadow-layers-js.mjs
 *
 * A case marked `phpOnly` is one the JS twin deliberately does not reproduce.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { composeShadow, splitTop, parseLayer } from '../../src/utils/shadow-layers.js';
import { css as atomCss, attrKeys } from '../../src/components/media/atoms/shadow.js';

const here = dirname( fileURLToPath( import.meta.url ) );
const table = JSON.parse( readFileSync( join( here, '..', '..', 'tests', 'shared', 'shadow-compose-cases.json' ), 'utf8' ) );

function failures( composer, report ) {
	let failed = 0;
	for ( const row of table.filter( ( r ) => ! r.phpOnly ) ) {
		const actual = composer( row.shape, row.colour );
		if ( actual !== row.expected ) {
			failed++;
			if ( report ) {
				console.error( `FAIL ${ row.name }\n  expected: ${ row.expected }\n  actual:   ${ actual }` );
			}
		}
	}
	return failed;
}

let failed = failures( composeShadow, true );
const compared = table.filter( ( r ) => ! r.phpOnly ).length;

// Negative control: the same comparison must catch a composer that ignores the colour.
const caught = failures( ( shape ) => composeShadow( shape, null ), false );
if ( caught < 5 ) {
	failed++;
	console.error( `FAIL negative control: a composer that ignores colour was caught by only ${ caught } cases` );
}

// Structure the table cannot express.
const eq = ( actual, expected, label ) => {
	if ( JSON.stringify( actual ) !== JSON.stringify( expected ) ) {
		failed++;
		console.error( `FAIL ${ label }\n  expected: ${ JSON.stringify( expected ) }\n  actual:   ${ JSON.stringify( actual ) }` );
	}
};
eq( splitTop( 'a, rgb(0, 0, 0), b', ',' ), [ 'a', 'rgb(0, 0, 0)', 'b' ], 'a comma inside parentheses does not split' );
eq( splitTop( ', b', ',' ), [ '', 'b' ], 'comma splits keep empty entries' );
eq( splitTop( '  a   b ', ' ' ), [ 'a', 'b' ], 'whitespace splits drop empty entries' );
eq( parseLayer( 'inset 0 2px 4px' ).inset, true, 'parseLayer reads inset' );
eq( parseLayer( '0 2px inset 4px' ), null, 'parseLayer rejects inset in the middle' );

// The media atom rides the same composer: its custom properties carry the composed value.
const keys = attrKeys( '', 'sgs/media' );
const atomOut = atomCss( {
	attributes: { [ keys.base ]: '0 4px 12px 0', [ keys.colour ]: '#000000', [ keys.hoverColour ]: '#FF0000' },
	prefix: '',
	blockSlug: 'sgs/media',
} );
eq( atomOut, [ '--sgs-media-box-shadow:0px 4px 12px 0px #000000', '--sgs-media-box-shadow-hover:0px 4px 12px 0px #FF0000' ], 'atom css() composes resting and hover' );
eq( atomCss( { attributes: {}, prefix: '', blockSlug: 'sgs/media' } ), [], 'atom css() is empty with no shape' );

console.log( `JS shadow composer: ${ compared } shared cases checked, ${ failed } failures (negative control caught ${ caught })` );
process.exit( failed > 0 ? 1 : 0 );
