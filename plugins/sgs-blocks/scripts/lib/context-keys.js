#!/usr/bin/env node
/**
 * context-keys.js — which blocks really read each block-context key, in the editor and on the front end.
 *
 * The one answer to "is this context key consumed?" for check-dead-controls.js, check-editor-render-parity.js
 * and the wiring-fingerprint gate. A key is read by a consumer when the consumer lists it in block.json
 * `usesContext` AND its own source reads it:
 *   - a bracket read: `context['k']`, `context?.['k']`, `$block->context['k']`, `$context['k']`;
 *   - a dot read of a key that is a plain identifier (core's `postId`): `context.postId`, `context?.postId`;
 *   - a destructured read: `const { 'k': v } = context` or a parameter `{ context: { 'k': v } }`;
 *   - on the front end, a read in an `includes/` PHP file when the block's own PHP hands its whole
 *     `$block->context` to a function (the helper reads the key, not the block).
 * Editor files: every .js/.jsx in the block folder except view*.js and save.js. Front-end files: every .php,
 * view*.js and save.js in the block folder. Comments are stripped before matching.
 *
 * Usage: node scripts/lib/context-keys.js [--json]   prints { key: { users, editor, frontend } }
 *        node scripts/lib/context-keys.js --self-test
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const SOURCE_EXT = new Set( [ '.js', '.jsx', '.php' ] );

const esc = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

function stripComments( code ) {
	return code.replace( /\/\*[\s\S]*?\*\//g, ' ' ).replace( /(^|[^:'"\\])\/\/[^\n]*/g, '$1' ).replace( /^\s*#[^\n]*/gm, '' );
}

/**
 * Whether `code` reads context key `key` (bracket or destructured form).
 *
 * @param {string} code Source with comments stripped.
 * @param {string} key  Context key, e.g. 'sgs/formId'.
 * @return {boolean} True when the key is read.
 */
function readsContextKey( code, key ) {
	const k = esc( key );
	const bracket = new RegExp( `(?<![A-Za-z0-9_])context(?:\\?\\.)?\\[\\s*(['"])${ k }\\1\\s*\\]` );
	const destructured = new RegExp( `\\{[^{}]*(['"])${ k }\\1\\s*:\\s*[A-Za-z_$][\\w$]*[^{}]*\\}\\s*=\\s*(?:[\\w$]+\\.)?context\\b` );
	const param = new RegExp( `context\\s*:\\s*\\{[^{}]*(['"])${ k }\\1\\s*:` );
	const dot = /^[A-Za-z_$][\w$]*$/.test( key ) && new RegExp( `(?<![A-Za-z0-9_$])context\\??\\.${ k }(?![\\w$])` ).test( code );
	return bracket.test( code ) || destructured.test( code ) || param.test( code ) || dot;
}

function listFiles( dir ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...listFiles( full ) );
		} else if ( SOURCE_EXT.has( path.extname( entry.name ) ) ) {
			out.push( full );
		}
	}
	return out;
}

const isFrontEnd = ( file ) => '.php' === path.extname( file ) || /^(view[^/\\]*|save)\.jsx?$/.test( path.basename( file ) );
const readCode = ( files ) => files.map( ( f ) => stripComments( fs.readFileSync( f, 'utf8' ) ) ).join( '\n' );

/**
 * Every context key some block lists in usesContext, with the blocks listing it and the blocks reading it.
 *
 * @param {Object}   [opts]
 * @param {string[]} [opts.blockDirs]   Block folders (default: every src/blocks/* with a block.json).
 * @param {string}   [opts.includesDir] Shared PHP helpers folder (default: plugins/sgs-blocks/includes).
 * @return {Map<string, {users: Set<string>, editor: Set<string>, frontend: Set<string>}>} Key → consumers.
 */
function contextKeyConsumers( opts = {} ) {
	const blocksRoot = path.join( PLUGIN, 'src', 'blocks' );
	const dirs = opts.blockDirs || fs.readdirSync( blocksRoot ).map( ( d ) => path.join( blocksRoot, d ) ).filter( ( d ) => fs.existsSync( path.join( d, 'block.json' ) ) );
	const includesDir = undefined === opts.includesDir ? path.join( PLUGIN, 'includes' ) : opts.includesDir;
	let includesCode = null;
	const helpers = () => {
		if ( null === includesCode ) {
			includesCode = includesDir && fs.existsSync( includesDir ) ? readCode( listFiles( includesDir ).filter( ( f ) => f.endsWith( '.php' ) ) ) : '';
		}
		return includesCode;
	};
	const out = new Map();
	for ( const dir of dirs ) {
		let meta;
		try {
			meta = JSON.parse( fs.readFileSync( path.join( dir, 'block.json' ), 'utf8' ) );
		} catch ( e ) {
			continue;
		}
		const used = Array.isArray( meta.usesContext ) ? meta.usesContext : [];
		if ( ! used.length ) {
			continue;
		}
		const files = listFiles( dir );
		const front = readCode( files.filter( isFrontEnd ) );
		const editor = readCode( files.filter( ( f ) => ! isFrontEnd( f ) ) );
		// The block hands its whole context to a helper: `fn( ..., $block->context )`.
		const delegates = /\(\s*[^()]*\$block->context\s*[,)]/.test( front );
		const name = meta.name || path.basename( dir );
		for ( const key of used ) {
			const entry = out.get( key ) || { users: new Set(), editor: new Set(), frontend: new Set() };
			entry.users.add( name );
			if ( readsContextKey( editor, key ) ) {
				entry.editor.add( name );
			}
			if ( readsContextKey( front, key ) || ( delegates && readsContextKey( helpers(), key ) ) ) {
				entry.frontend.add( name );
			}
			out.set( key, entry );
		}
	}
	return out;
}

/**
 * Context keys with at least one real consumer (read in the editor or on the front end).
 *
 * @param {Object} [opts] As contextKeyConsumers().
 * @return {Set<string>} Consumed keys.
 */
function consumedContextKeys( opts ) {
	const out = new Set();
	for ( const [ key, e ] of contextKeyConsumers( opts ) ) {
		if ( e.editor.size || e.frontend.size ) {
			out.add( key );
		}
	}
	return out;
}

function selfTest() {
	const cases = [
		[ "const x = context['sgs/a'];", 'sgs/a', true ],
		[ "$v = $block->context['sgs/a'] ?? '';", 'sgs/a', true ],
		[ "const x = context?.[ 'sgs/a' ];", 'sgs/a', true ],
		[ "const { 'sgs/a': a, other } = props.context;", 'sgs/a', true ],
		[ "function Edit( { context: { 'sgs/a': a } } ) {}", 'sgs/a', true ],
		[ "const x = mycontext['sgs/a'];", 'sgs/a', false ],
		[ "\"usesContext\": [ \"sgs/a\" ]", 'sgs/a', false ],
		[ stripComments( "// context['sgs/a']\nconst y = 1;" ), 'sgs/a', false ],
		[ "const x = context['sgs/ab'];", 'sgs/a', false ],
		[ 'const id = context && context.postId;', 'postId', true ],
		[ 'const id = context?.postId;', 'postId', true ],
		[ 'const id = context.postIdentity;', 'postId', false ],
	];
	const fails = cases.filter( ( [ code, key, want ] ) => readsContextKey( code, key ) !== want );
	fails.forEach( ( [ code, key, want ] ) => process.stdout.write( `FAIL ${ key } in ${ JSON.stringify( code ) } expected ${ want }\n` ) );
	process.stdout.write( `[context-keys] self-test ${ fails.length ? 'FAILED' : 'OK' } (${ cases.length } cases)\n` );
	return fails.length ? 1 : 0;
}

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		process.exit( selfTest() );
	}
	const json = {};
	for ( const [ key, e ] of [ ...contextKeyConsumers() ].sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ) {
		json[ key ] = { users: [ ...e.users ].sort(), editor: [ ...e.editor ].sort(), frontend: [ ...e.frontend ].sort() };
	}
	process.stdout.write( JSON.stringify( json, null, process.argv.includes( '--json' ) ? 0 : 1 ) + '\n' );
}

module.exports = { readsContextKey, contextKeyConsumers, consumedContextKeys, stripComments };
