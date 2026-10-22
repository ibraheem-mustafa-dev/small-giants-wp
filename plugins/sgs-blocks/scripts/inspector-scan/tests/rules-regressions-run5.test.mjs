import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const INSPECTOR_DIR = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const { SourceCache } = require( path.join( INSPECTOR_DIR, 'core/sources.js' ) );
const { blockSourceCtx } = require( path.join( INSPECTOR_DIR, 'core/block-files.js' ) );

function makeBlocksDir( files ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'rules-run5-' ) );
	fs.mkdirSync( path.join( root, 'b' ) );
	for ( const [ name, text ] of Object.entries( files ) ) {
		fs.writeFileSync( path.join( root, 'b', name ), text );
	}
	return root;
}

function ctxFor( blocksDir ) {
	const cache = new SourceCache();
	return {
		cache,
		blocksDir,
		ast: ( f ) => cache.parse( f ),
		text: ( f ) => cache.text( f ),
		stripped: ( f ) => cache.strippedText( f ),
		json: ( f ) => cache.json( f ),
		...blockSourceCtx( blocksDir, cache ),
	};
}

function loadRule( file ) {
	return require( path.join( INSPECTOR_DIR, 'rules', file ) );
}

function runRule( file, files ) {
	const blocksDir = makeBlocksDir( files );
	return loadRule( file ).run( ctxFor( blocksDir ), { tail: 'b', slug: 'sgs/b' } );
}

// ---- 35-pinned-panel-position ----

const R35 = '35-pinned-panel-position.js';
const panelEdit = ( jsx ) => ( { 'edit.js': `export default function Edit() { return ( ${ jsx } ); }\n` } );

test( '35 (bug 3): an arrow function before title= does not hide the panel', () => {
	const findings = runRule( R35, panelEdit( '<PanelBody onToggle={ () => x } title="Advanced"><p /></PanelBody>' ) );
	assert.equal( findings.length, 1 );
} );

test( '35 (bug 4): a ToolsPanel takes its heading from label', () => {
	const findings = runRule( R35, panelEdit( "<ToolsPanel label={ __( 'Advanced', 'sgs-blocks' ) }><p /></ToolsPanel>" ) );
	assert.equal( findings.length, 1 );
} );

test( '35 (bug 17): the finding does not claim a styles-group panel is in the default Settings group', () => {
	const findings = runRule(
		R35,
		panelEdit( '<InspectorControls group="styles"><PanelBody title="Advanced"><p /></PanelBody></InspectorControls>' )
	);
	assert.equal( findings.length, 1 );
	assert.ok( ! /default Settings group/.test( findings[ 0 ].detail ), findings[ 0 ].detail );
} );

// ---- 36-box-control-presets-missing ----

for ( const value of [ 'null', '0', '1', "''" ] ) {
	test( `36 (bug 5): presets={${ value }} is not a truthy presets prop`, () => {
		const findings = runRule(
			'36-box-control-presets-missing.js',
			panelEdit( `<ResponsiveBoxControl presets={${ value }} />` )
		);
		assert.equal( findings.length, 1 );
	} );
}

test( '36 (bug 5): presets={true} and a non-empty array stay accepted', () => {
	const findings = runRule(
		'36-box-control-presets-missing.js',
		panelEdit( "<div><ResponsiveBoxControl presets={true} /><ResponsiveBoxControl presets={ [ 'XS' ] } /></div>" )
	);
	assert.equal( findings.length, 0 );
} );

// ---- 30-raw-box-control ----

const R30 = '30-raw-box-control.js';
const boxBlockJson = JSON.stringify( {
	name: 'sgs/b',
	attributes: { pad: { type: 'object' }, padTablet: { type: 'object' }, padMobile: { type: 'object' } },
} );
const boxEdit = ( lead ) =>
	`${ lead }export default function Edit() { return <BoxControl values={ pad } onChange={ ( n ) => setAttributes( { pad: n } ) } />; }\n`;

test( '30 (bug 16): the baseline key survives a line added above the control', () => {
	const before = runRule( R30, { 'block.json': boxBlockJson, 'edit.js': boxEdit( '' ) } );
	const after = runRule( R30, { 'block.json': boxBlockJson, 'edit.js': boxEdit( '// a new line\n// and another\n' ) } );
	assert.equal( before.length, 1 );
	assert.equal( after.length, 1 );
	// The two runs use different temp dirs, so compare only the key parts after the file segment.
	const tail = ( f ) => f.key.split( '|' ).slice( 3 ).join( '|' );
	assert.equal( tail( after[ 0 ] ), tail( before[ 0 ] ) );
} );

// ---- 33-ineffective-typography-selector ----

const R33 = '33-ineffective-typography-selector.js';
const typoJson = ( selector ) =>
	JSON.stringify( {
		name: 'sgs/b',
		supports: { typography: { fontSize: true } },
		selectors: { root: '.wp-block-sgs-b', typography: selector },
		attributes: {},
	} );
const plainEdit = { 'edit.js': 'export default function Edit() { return <div />; }\n' };

test( '33 (bug 7): a hyphenated longer class is not an emission of the token', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__title' ),
		...plainEdit,
		'render.php': "<?php\n$c[] = 'sgs-x__title-wrap';\n",
	} );
	assert.equal( findings.length, 1 );
	assert.equal( findings[ 0 ].key.split( '|' ).pop(), 'sgs-x__title' );
} );

test( '33 (bug 7): the exact class on a class attribute still counts as emitted', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__title' ),
		...plainEdit,
		'render.php': '<?php\necho \'<h2 class="sgs-x__title">\';\n',
	} );
	assert.equal( findings.length, 0 );
} );

test( '33 (bug 8): a :not() argument is not the selector token', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__foo:not(.sgs-x__bar)' ),
		...plainEdit,
		'render.php': '<?php\necho \'<h2 class="sgs-x__foo">\';\n',
	} );
	assert.equal( findings.length, 0 );
} );

test( '33 (bug 8): every part of a selector list is checked, not just the last', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__foo, .sgs-x__bar' ),
		...plainEdit,
		'render.php': '<?php\necho \'<h2 class="sgs-x__foo">\';\n',
	} );
	assert.equal( findings.length, 0 );
} );

test( '33 (bug 9): an escaped quote does not hide a trailing // comment', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__title' ),
		...plainEdit,
		'render.php': "<?php\n$s = 'it\\'s'; // .sgs-x__title\n",
	} );
	assert.equal( findings.length, 1 );
} );

test( '33 (bug 9): a # line comment is stripped', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__title' ),
		...plainEdit,
		'render.php': '<?php\n$s = 1; # uses .sgs-x__title\n',
	} );
	assert.equal( findings.length, 1 );
} );

test( '33 (bug 10): a template child with several classes is still child-owned', () => {
	const findings = runRule( R33, {
		'block.json': typoJson( '.sgs-x__title' ),
		'edit.js':
			"const TEMPLATE = [ [ 'sgs/heading', { className: 'sgs-x__title extra' } ] ];\n" +
			'export default function Edit() { return <InnerBlocks template={ TEMPLATE } />; }\n',
		'render.php': '<?php\necho "<div>";\n',
	} );
	assert.equal( findings.length, 1 );
	assert.ok( findings[ 0 ].key.includes( 'child-owned-selector' ), findings[ 0 ].key );
} );

// ---- 38-media-attr-parity ----

test( "38 (bug 6): a second run with a different blocks directory is not served the first run's result", () => {
	const rule = loadRule( '38-media-attr-parity.js' );
	const withAtoms = ( atoms ) =>
		JSON.stringify( {
			name: 'sgs/b',
			supports: { sgs: { mediaElements: [ { prefix: '', context: 'element', atoms } ] } },
			attributes: {},
		} );
	const first = makeBlocksDir( { 'block.json': withAtoms( [ 'object-fit' ] ) } );
	const second = makeBlocksDir( { 'block.json': withAtoms( [ 'no-such-atom-id' ] ) } );
	const block = { tail: 'b', slug: 'sgs/b' };
	assert.equal( rule.run( ctxFor( first ), block ).filter( ( f ) => f.kind === 'unknown-atom-id' ).length, 0 );
	assert.equal( rule.run( ctxFor( second ), block ).filter( ( f ) => f.kind === 'unknown-atom-id' ).length, 1 );
} );
