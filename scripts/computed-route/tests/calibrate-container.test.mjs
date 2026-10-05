// Proves calibration classifies a block whose tiers follow its container's width from the block's render source, not
// only from its built stylesheet (FR-47-2). Blocks such as site-footer-row emit their @container rules at render time, so
// the built style-index.css holds none; before this, every such block read as a one-width hardcode (40 oneWidth rows).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { hasRuntimeContainerQueries, isContainerQueryBlock, stripPhpComments } from '../lib/calibrate-container.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const srcRender = ( short ) => fs.readFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', short, 'render.php' ), 'utf8' );

test( 'MUST FAIL (oneWidth false positive): a render that passes container_queries => true is a container-query block', () => {
	const src = `<?php\nSGS_Container_Wrapper::render( $attributes, $content, array(\n\t'container_queries' => true,\n\t'kind' => 'content',\n) );`;
	assert.equal( hasRuntimeContainerQueries( src ), true );
	assert.equal( hasRuntimeContainerQueries( `<?php echo wrap( $x, array( 'container' => true ) );` ), true );
	assert.equal( hasRuntimeContainerQueries( `<?php echo wrap( $x, array( "container_queries" => true ) );` ), true );
} );

test( 'MUST FAIL TO MATCH: a flag set false, set from a variable, or only named in a comment is not a container-query block', () => {
	assert.equal( hasRuntimeContainerQueries( `<?php wrap( array( 'container' => false ) );` ), false );
	assert.equal( hasRuntimeContainerQueries( `<?php wrap( array( 'container' => $in_drawer ) );` ), false );
	assert.equal( hasRuntimeContainerQueries( `<?php\n// Do NOT pass \`container_queries => true\` here.\n/* 'container' => true */\nwrap( array() );` ), false );
	assert.equal( hasRuntimeContainerQueries( '' ), false );
} );

test( 'a comment stripper keeps string contents (a URL with // is not a comment)', () => {
	assert.match( stripPhpComments( `$u = 'https://x.test/a'; // note\n$v = 1;` ), /https:\/\/x\.test\/a/ );
	assert.doesNotMatch( stripPhpComments( `$u = 1; // note` ), /note/ );
} );

test( 'the real render sources: the five blocks the harness misread are container-query blocks, multi-button is not', () => {
	for ( const b of [ 'site-footer-row', 'site-header-row', 'gallery', 'mega-aside' ] ) {
		assert.equal( hasRuntimeContainerQueries( srcRender( b ) ), true, `${ b } passes container_queries or container => true` );
	}
	// multi-button's render.php says "Do NOT pass container_queries => true" in a comment; its tiers use page @media.
	assert.equal( hasRuntimeContainerQueries( srcRender( 'multi-button' ) ), false );
} );

test( 'MUST FAIL (calibrateBlock set containerQuery from the built css alone): the render source also decides it', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-cq-' ) );
	const put = ( short, css, php ) => {
		fs.mkdirSync( path.join( dir, 'build/blocks', short ), { recursive: true } );
		css && fs.writeFileSync( path.join( dir, 'build/blocks', short, 'style-index.css' ), css );
		php && fs.writeFileSync( path.join( dir, 'build/blocks', short, 'render.php' ), php );
	};
	put( 'css-only', '.a{}@container (min-width:600px){.a{gap:1px}}', null );
	put( 'php-only', '.a{}', `<?php array( 'container_queries' => true );` );
	put( 'neither', '.a{}', `<?php echo 1;` );
	put( 'no-files', null, null );
	const is = ( s ) => isContainerQueryBlock( s, path.join( dir, 'build/blocks' ) );
	assert.deepEqual( [ 'css-only', 'php-only', 'neither', 'no-files' ].map( is ), [ true, true, false, false ] );
	fs.rmSync( dir, { recursive: true, force: true } );
} );
