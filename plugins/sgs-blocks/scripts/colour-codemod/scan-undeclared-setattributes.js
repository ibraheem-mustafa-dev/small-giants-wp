'use strict';

/**
 * scan-undeclared-setattributes.js — tree-wide verification pass, written for
 * the cross-tier-review fix (post-Task-1 critical defect: fix.js could emit a
 * `setAttributes({ X: ... })` write for an attribute X that block.json never
 * declares, which WordPress silently discards).
 *
 * NOT a permanent CI gate (the task asked for a re-check + a report, not a
 * new structural gate) — a standalone script, safe to re-run any time. Scans
 * every block's edit.js for every `setAttributes({ ... })` call, collects the
 * object-key attribute names written, and reports any not present in that
 * block's own block.json `attributes` map.
 *
 * Deliberately conservative — false negatives (missing a dynamic key) are
 * acceptable; false positives are not, so anything not a plain
 * Identifier/StringLiteral key is skipped rather than guessed at. `style` is
 * a WP-native attribute injected by core supports, not a defect — excluded
 * per the task brief.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const babelParser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );

const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
	errorRecovery: false,
};

// Attributes WordPress injects natively via core `supports` (or otherwise
// legitimately absent from a block's own explicit `attributes` map) — not a
// defect. Per the task brief: "`style` also shows as undeclared ... that is a
// WP-native attribute, NOT a defect. Ignore it."
const NATIVE_SUPPORTS_ATTRS = new Set( [ 'style', 'className', 'anchor', 'lock', 'metadata' ] );

function blockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

function keyName( keyNode ) {
	if ( ! keyNode ) return null;
	if ( keyNode.type === 'Identifier' ) return keyNode.name;
	if ( keyNode.type === 'StringLiteral' ) return keyNode.value;
	return null; // computed / template key — skip rather than guess.
}

function scanBlock( dir ) {
	const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
	const blockJsonFile = path.join( BLOCKS_DIR, dir, 'block.json' );
	if ( ! fs.existsSync( editFile ) || ! fs.existsSync( blockJsonFile ) ) return null;

	const blockJson = JSON.parse( fs.readFileSync( blockJsonFile, 'utf8' ) );
	const declared = new Set( Object.keys( blockJson.attributes || {} ) );

	const src = fs.readFileSync( editFile, 'utf8' );
	let ast;
	try {
		ast = babelParser.parse( src, BABEL_PARSE_OPTS );
	} catch ( e ) {
		return { dir, parseError: e.message };
	}

	const written = new Set();
	traverse( ast, {
		CallExpression( p ) {
			const callee = p.node.callee;
			if ( ! callee || callee.type !== 'Identifier' || callee.name !== 'setAttributes' ) return;
			const arg = p.node.arguments[ 0 ];
			if ( ! arg || arg.type !== 'ObjectExpression' ) return;
			for ( const prop of arg.properties ) {
				if ( prop.type !== 'ObjectProperty' ) continue; // skip spreads — can't attribute a name to a spread.
				if ( prop.computed ) continue; // `[dynamicKeyVar]: val` — the identifier is a VARIABLE holding the real name, not a literal attr name; can't resolve statically without over-guessing.
				const name = keyName( prop.key );
				if ( name ) written.add( name );
			}
		},
	} );

	const undeclared = [ ...written ]
		.filter( ( a ) => ! declared.has( a ) && ! NATIVE_SUPPORTS_ATTRS.has( a ) )
		.sort();

	return { dir, undeclared };
}

function main() {
	const results = [];
	let totalUndeclared = 0;
	for ( const dir of blockDirs() ) {
		const r = scanBlock( dir );
		if ( ! r ) continue;
		if ( r.parseError ) {
			console.log( `PARSE ERROR ${ dir }: ${ r.parseError }` );
			continue;
		}
		if ( r.undeclared.length > 0 ) {
			totalUndeclared += r.undeclared.length;
			results.push( r );
			console.log( `UNDECLARED ${ dir }: ${ r.undeclared.join( ', ' ) }` );
		}
	}
	if ( totalUndeclared === 0 ) {
		console.log( 'scan-undeclared-setattributes: CLEAN — 0 undeclared attributes written by setAttributes() across all blocks.' );
		process.exitCode = 0;
	} else {
		console.log( `\nscan-undeclared-setattributes: ${ totalUndeclared } undeclared attribute write(s) across ${ results.length } block(s).` );
		process.exitCode = 1;
	}
}

main();
