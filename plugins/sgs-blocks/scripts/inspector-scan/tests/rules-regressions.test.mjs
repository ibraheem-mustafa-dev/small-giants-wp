import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const INSPECTOR_DIR = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const { SourceCache } = require( path.join( INSPECTOR_DIR, 'core/sources.js' ) );

function makeBlocksDir( files ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'rules-regressions-' ) );
	fs.mkdirSync( path.join( root, 'b' ) );
	for ( const [ name, text ] of Object.entries( files ) ) {
		fs.writeFileSync( path.join( root, 'b', name ), text );
	}
	return root;
}

function ctxFor( blocksDir ) {
	const cache = new SourceCache();
	return { blocksDir, cache, json: ( f ) => cache.json( f ), text: ( f ) => cache.text( f ) };
}

function loadRule( file ) {
	return require( path.join( INSPECTOR_DIR, 'rules', file ) );
}

test( '43: a border width after the style keyword counts as reserved', () => {
	const rule = loadRule( '43-colour-only-state-indicator.js' );
	const blocksDir = makeBlocksDir( {
		'style.css': '.t{border-bottom: solid 2px transparent}\n.t.is-active{border-bottom-color: red}\n',
	} );
	const findings = rule.run( ctxFor( blocksDir ), { tail: 'b', slug: 'b' } );
	assert.equal( findings.length, 0 );
} );

test( '43: a zero width after the style keyword still flags a colour-only state', () => {
	const rule = loadRule( '43-colour-only-state-indicator.js' );
	const blocksDir = makeBlocksDir( {
		'style.css': '.t{border-bottom: 0 solid transparent}\n.t.is-active{border-bottom-color: red}\n',
	} );
	const findings = rule.run( ctxFor( blocksDir ), { tail: 'b', slug: 'b' } );
	assert.equal( findings.length, 1 );
} );

test( '43: a statement at-rule ends at its semicolon and does not swallow the next rule', () => {
	const rule = loadRule( '43-colour-only-state-indicator.js' );
	const blocksDir = makeBlocksDir( {
		'style.css': '@charset "UTF-8"; .t.is-active{color:red}\n',
	} );
	const findings = rule.run( ctxFor( blocksDir ), { tail: 'b', slug: 'b' } );
	assert.equal( findings.length, 1 );
} );

test( '20: an empty Post Types header does not capture the next line', () => {
	const rule = loadRule( '20-pattern-template-lock.js' );
	const patternsDir = fs.mkdtempSync( path.join( os.tmpdir(), 'rules-regressions-' ) );
	fs.writeFileSync(
		path.join( patternsDir, 'about-team.php' ),
		'<?php\n/**\n * Title: Team\n * Post Types:\n * Description: general page\n */\n?>\n' +
			'<!-- wp:paragraph --><p>hi</p><!-- /wp:paragraph -->\n'
	);
	const ctx = { patternsDir, text: ( f ) => fs.readFileSync( f, 'utf8' ) };
	assert.equal( rule.run( ctx ).length, 1 );
} );

test( '45: a block declaring __experimentalFontWeight is flagged for native typography', () => {
	const rule = loadRule( '45-typography-full-replacement.js' );
	const blocksDir = makeBlocksDir( {
		'block.json': JSON.stringify( { supports: { typography: { __experimentalFontWeight: true } } } ),
		'edit.js': 'export default function E(){return null;}\n',
		'render.php': '<?php echo 1;\n',
	} );
	const kinds = rule
		.run( ctxFor( blocksDir ), { tail: 'b', slug: 'b' } )
		.map( ( f ) => f.kind );
	assert.deepEqual( kinds, [ 'native-typography-declared' ] );
} );

