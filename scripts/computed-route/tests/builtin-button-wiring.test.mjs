// Where the built-in button steps are wired in (the button kit's route half): part-look hovers the declared buttons' parts, adjusts its
// build for them and names the flow opener from the draft's code; the product group locates the opener by that shop part; the site
// build sets the flow's opener words after the product flow links in each of its three runs. The behaviour of each step is proved in
// tests/fill-builtin-button.test.mjs, tests/part-look-controls.test.mjs, tests/part-look-hover.test.mjs and
// tests/site-build-flow-opener-label.test.mjs; these checks fail when a step is unplugged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const text = ( rel ) => fs.readFileSync( path.join( ROUTE, rel ), 'utf8' );

test( 'part-look reads a built-in button\'s hover, adjusts the build for it and names the opener from the draft\'s code', () => {
	const run = text( 'lib/part-look-run.mjs' );
	assert.match( run, /hover\.length && await readHover\( \{ page, found, parts: hover, log \} \)/ );
	const look = text( 'part-look.mjs' );
	assert.match( look, /hover: builtin\.map\( \( b \) => b\.part \)/ );
	assert.match( look, /applyBuiltinButtons\( \{ block: loc\.block, build, rows: blockRowsOf, names, db, reads, presets: buttonPresets, snapshot, buttons: builtin \} \)/ );
	assert.match( look, /Object\.assign\( shopParts, openerShopParts\( controls \) \)/ );
} );

test( 'the site build sets the flow\'s opener words after the product flow links, in all three runs', () => {
	const build = text( 'site-build.mjs' );
	assert.equal( ( build.match( /runOpenerLabels\(/g ) || [] ).length, 3, 'the --flow-links run, the dry run and the apply run' );
	assert.match( build, /runFlowLinks\( \{ rows, runPhp, apply \} \) \|\| runOpenerLabels\(/ );
	assert.match( build, /runFlowLinks\( \{ rows, runPhp, apply: false, pending: true \} \) \|\| runOpenerLabels\( .*pending: true \} \)/ );
	assert.match( build, /runFlowLinks\( \{ rows, runPhp, apply: true \} \) \|\| runOpenerLabels\( .*apply: true \} \)/ );
} );

test( 'the product group locates the flow opener by the shop part the draft\'s code names, not by words', () => {
	const group = JSON.parse( text( 'data/part-locators.json' ) ).groups.buybox.parts;
	assert.deepEqual( group[ 'flow-opener' ], { from: 'page', match: { shopPart: 'buybox-flow-opener' } } );
	assert.deepEqual( group[ 'add-to-cart' ], { from: 'page', match: { shopPart: 'buybox-add-to-basket' } } );
} );
