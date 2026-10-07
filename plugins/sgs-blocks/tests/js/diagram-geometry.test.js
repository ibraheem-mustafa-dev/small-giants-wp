/**
 * Measured diagram geometry: the JS twin reproduces every shared fixture.
 *
 * The four Eye Care cases' expected paths equal the draft's own SVG
 * (guides 204→244, 96→52, 524→576, 70→196 and 138→196; 12-unit ticks), so
 * a pass here means the canvas draws the draft's lines. The PHP twin reads the
 * same file (tests/php/diagram-geometry.php).
 *
 * Run with: node tests/js/diagram-geometry.test.js
 */

const fs = require( 'fs' );
const path = require( 'path' );

const { dimensionPaths } = require( '../../src/blocks/measured-diagram/geometry.js' );

const cases = JSON.parse(
	fs.readFileSync(
		path.join( __dirname, '..', 'fixtures', 'diagram-geometry-fixtures.json' ),
		'utf8'
	)
);

let failed = 0;
for ( const c of cases ) {
	const actual = JSON.stringify( dimensionPaths( c.dim, c.width, c.height ) );
	const expected = JSON.stringify( c.expected );
	if ( actual !== expected ) {
		failed++;
		process.stdout.write( `FAIL ${ c.name }\n  expected ${ expected }\n  actual   ${ actual }\n` );
	}
}

// Negative control: a moved start point must change the output, or the test proves nothing.
const moved = dimensionPaths( { ...cases[ 0 ].dim, startX: 10 }, cases[ 0 ].width, cases[ 0 ].height );
if ( JSON.stringify( moved ) === JSON.stringify( cases[ 0 ].expected ) ) {
	failed++;
	process.stdout.write( 'FAIL negative control: a moved start point produced the same paths\n' );
}

process.stdout.write( `diagram-geometry (js): ${ cases.length - failed } of ${ cases.length } fixtures match\n` );
process.exit( failed ? 1 : 0 );
