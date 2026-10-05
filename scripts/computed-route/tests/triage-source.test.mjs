// Triage's source pass reads the helpers a block's render.php reaches (lib/triage-source.mjs): CSS a shared helper
// emits under includes/ is cited where it lives, two hops deep, through functions, classes and required files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { helperIndex, callsIn, helperSources, sourcePass } from '../lib/triage-source.mjs';

const RENDER = `<?php
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
echo Grid_Wrapper::render( $attributes, $content );`;
const FILES = [
	{ file: 'includes/class-grid-wrapper.php', text: "<?php\nclass Grid_Wrapper {\n\tpublic static function render( $a ) {\n\t\t$decls[] = 'gap:' . sgs_gap_value( $a['gap'] );\n\t}\n}" },
	{ file: 'includes/helpers-grid.php', text: "<?php\nfunction sgs_gap_value( $v ) {\n\treturn sgs_css_length( $v );\n}\nfunction sgs_unrelated() {\n\treturn 'a gap in the prose';\n}" },
	{ file: 'includes/helpers-css.php', text: "<?php\nfunction sgs_css_length( $v ) {\n\treturn $v . 'px';\n}" },
	{ file: 'includes/render-helpers.php', text: "<?php\n// shared helpers, nothing about spacing" },
];
const issue = { rows: [ { key: 'row-gap', ref: 'cr-ref-a-1', path: '' } ] };
const ctx = ( helpers ) => ( { nodeFor: () => ( { name: 'sgs/grid' } ), readSource: ( slug, file ) => ( 'render.php' === file ? RENDER : null ), helpers } );

test( 'calls: sgs_ functions, classes used statically or constructed, and required includes files', () => {
	const c = callsIn( "<?php new \\SGS\\Blocks\\Thing(); Other::go(); sgs_a( 1 ); require_once X . '/includes/b.php';" );
	assert.deepEqual( c, { functions: [ 'sgs_a' ], classes: [ 'Thing', 'Other' ], requires: [ 'includes/b.php' ] } );
} );

test( 'MUST FAIL TO MISS A HELPER: a gap a class in includes/ emits is cited by file::symbol, with the setting it reads', () => {
	const out = sourcePass( issue, [ 'gap' ], ctx( helperIndex( FILES ) ) );
	const wrapper = out.helpers.find( ( h ) => 'includes/class-grid-wrapper.php::Grid_Wrapper' === h.cite );
	assert.ok( wrapper, JSON.stringify( out.helpers ) );
	assert.deepEqual( wrapper.mentions, [ 'gap' ] );
	assert.match( wrapper.declares[ 0 ], /'gap:' \. sgs_gap_value/ );
	assert.deepEqual( sourcePass( issue, [ 'gap' ], ctx( undefined ) ).helpers, [], 'without the helper index nothing is traced' );
} );

test( 'two hops deep; a word in prose or a helper that neither reads the setting nor emits the property is not cited', () => {
	const reached = helperSources( [ RENDER ], helperIndex( FILES ) ).map( ( h ) => `${ h.file }::${ h.symbol }` );
	assert.deepEqual( reached, [ 'includes/class-grid-wrapper.php::Grid_Wrapper', 'includes/render-helpers.php::includes/render-helpers.php', 'includes/helpers-grid.php::sgs_gap_value' ] );
	assert.deepEqual( helperSources( [ RENDER ], helperIndex( FILES ), 3 ).map( ( h ) => h.symbol ).at( -1 ), 'sgs_css_length', 'a third hop only when asked' );
	const cites = sourcePass( issue, [ 'gap' ], ctx( helperIndex( FILES ) ) ).helpers.map( ( h ) => h.cite );
	assert.deepEqual( cites, [ 'includes/class-grid-wrapper.php::Grid_Wrapper' ] );
} );
