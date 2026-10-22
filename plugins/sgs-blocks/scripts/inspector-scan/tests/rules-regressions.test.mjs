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

test( '39: atoms that together cover every offered type raise no coverage gap', () => {
	const rule = loadRule( '39-media-control-coverage.js' );
	const blocksDir = makeBlocksDir( {
		'block.json': JSON.stringify( {
			attributes: { mediaType: { type: 'string', enum: [ 'image', 'svg' ], default: 'image' } },
			supports: { sgs: { mediaElements: [ { prefix: '', atoms: [ 'intrinsic', 'svg-presentation' ] } ] } },
		} ),
		'edit.js': 'export default function E(){return null;}\n',
	} );
	const findings = rule.run( ctxFor( blocksDir ), { tail: 'b', slug: 'b' } );
	assert.equal( findings.filter( ( f ) => f.kind === 'type-coverage-gap' ).length, 0 );
} );

test( '39: a type no declared atom supports is still a coverage gap', () => {
	const rule = loadRule( '39-media-control-coverage.js' );
	const blocksDir = makeBlocksDir( {
		'block.json': JSON.stringify( {
			attributes: { mediaType: { type: 'string', enum: [ 'image', 'svg' ], default: 'image' } },
			supports: { sgs: { mediaElements: [ { prefix: '', atoms: [ 'intrinsic' ] } ] } },
		} ),
		'edit.js': 'export default function E(){return null;}\n',
	} );
	const findings = rule.run( ctxFor( blocksDir ), { tail: 'b', slug: 'b' } );
	assert.equal( findings.filter( ( f ) => f.kind === 'type-coverage-gap' ).length, 1 );
} );

test( '39: a missing php binary yields an error finding instead of throwing', () => {
	// Run in a child process with PATH set to the node directory only, so `php`
	// cannot be found and the rule's module-level caches start empty.
	const nodeDir = path.dirname( process.execPath );
	const script = `
		const path = require( 'path' );
		const fs = require( 'fs' );
		const os = require( 'os' );
		const rule = require( ${ JSON.stringify( path.join( INSPECTOR_DIR, 'rules', '39-media-control-coverage.js' ) ) } );
		const { SourceCache } = require( ${ JSON.stringify( path.join( INSPECTOR_DIR, 'core', 'sources.js' ) ) } );
		const cache = new SourceCache();
		const root = fs.mkdtempSync( path.join( os.tmpdir(), 'rules-regressions-php-' ) );
		fs.mkdirSync( path.join( root, 'b' ) );
		fs.writeFileSync( path.join( root, 'b', 'block.json' ), JSON.stringify( {
			attributes: { mediaType: { type: 'string', enum: [ 'image' ], default: 'image' } },
			supports: { sgs: { mediaElements: [ { prefix: '', atoms: [ 'intrinsic' ] } ] } },
		} ) );
		fs.writeFileSync( path.join( root, 'b', 'edit.js' ), 'export default function E(){return null;}\\n' );
		const findings = rule.run(
			{ blocksDir: root, cache, json: ( f ) => cache.json( f ), text: ( f ) => cache.text( f ) },
			{ tail: 'b', slug: 'b' }
		);
		process.stdout.write( JSON.stringify( findings.map( ( f ) => f.kind ) ) );
	`;
	const out = execFileSync( process.execPath, [ '-e', script ], {
		encoding: 'utf8',
		env: { ...process.env, PATH: nodeDir },
	} );
	assert.ok( JSON.parse( out ).includes( 'stored-names-resolve-failed' ) );
} );
