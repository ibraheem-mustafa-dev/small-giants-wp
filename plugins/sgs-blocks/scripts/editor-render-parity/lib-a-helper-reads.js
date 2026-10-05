/**
 * CHECK A signal 6 — an attribute the editor canvas reads through a helper.
 *
 * edit.js passes the whole `attributes` object to an imported preview helper outside the control panels
 * (`boxPreview( attributes, tier )`, `typographyPreviewStyle( attributes, 'title', tier )`, a block's own
 * `preview-style.js`). The helper, not edit.js, reads the attribute, so CHECK A's own-file scan never sees it.
 * The attribute counts as read when a file the helper's module reaches (relative imports, two steps) names it, or
 * builds it from a prefix the call passes and a quoted suffix in the helper (`prefix + 'FontSize'`,
 * `attrKey( 'FontSize' )`, a suffix table), the same convention the shared typography helpers use.
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const traverse = require( '@babel/traverse' ).default;
const { isInsideExcludedRanges } = require( './lib-a-destructure' );

const resolveFile = ( from, spec ) => {
	if ( ! spec.startsWith( '.' ) ) {
		return null;
	}
	const base = path.resolve( path.dirname( from ), spec );
	for ( const c of [ base, `${ base }.js`, path.join( base, 'index.js' ) ] ) {
		if ( fs.existsSync( c ) && fs.statSync( c ).isFile() ) {
			return c;
		}
	}
	return null;
};

// The files a module reaches through relative imports and re-exports, `depth` steps deep.
function reachedFiles( file, depth, seen = new Set() ) {
	if ( ! file || seen.has( file ) ) {
		return seen;
	}
	seen.add( file );
	if ( depth <= 0 ) {
		return seen;
	}
	const src = fs.readFileSync( file, 'utf8' );
	for ( const m of src.matchAll( /\bfrom\s+['"](\.[^'"]+)['"]/g ) ) {
		reachedFiles( resolveFile( file, m[ 1 ] ), depth - 1, seen );
	}
	return seen;
}

// A barrel (`export * from` / `export { x } from`): the files that declare `name`, else every re-exported file.
function declaringFiles( file, name ) {
	const src = fs.readFileSync( file, 'utf8' );
	const declares = new RegExp( `export\\s+(?:default\\s+)?(?:async\\s+)?(?:function\\*?|const|let|class)\\s+${ name }\\b` );
	if ( declares.test( src ) || new RegExp( `export\\s+default\\s+${ name }\\b` ).test( src ) ) {
		return [ file ];
	}
	const targets = [ ...src.matchAll( /export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.[^'"]+)['"]/g ) ].map( ( m ) => resolveFile( file, m[ 1 ] ) ).filter( Boolean );
	const hit = targets.filter( ( t ) => declares.test( fs.readFileSync( t, 'utf8' ) ) );
	return hit.length ? hit : [ file ];
}

const passesAttributes = ( arg ) =>
	( 'Identifier' === arg.type && 'attributes' === arg.name ) ||
	( 'MemberExpression' === arg.type && ! arg.computed && 'attributes' === arg.property.name ) ||
	( 'ObjectExpression' === arg.type && arg.properties.some( ( p ) => 'SpreadElement' === p.type && passesAttributes( p.argument ) ) );

/**
 * Calls outside the control panels that hand the whole attributes object to an imported helper.
 *
 * @param {Object} ast            edit.js AST.
 * @param {string} editPath       edit.js path (resolves relative imports).
 * @param {Array}  excludedRanges Control-panel source ranges (lib-a-destructure.js::collectExcludedRanges).
 * @return {{files: Set<string>, prefixes: Set<string>}[]} Per call: the helper's reached files and literal prefixes.
 */
function collectHelperCalls( ast, editPath, excludedRanges ) {
	const imports = new Map();
	for ( const node of ast.program.body ) {
		if ( 'ImportDeclaration' === node.type ) {
			const file = resolveFile( editPath, node.source.value );
			for ( const s of node.specifiers ) {
				if ( file ) {
					imports.set( s.local.name, { file, name: s.imported ? s.imported.name || s.imported.value : s.local.name } );
				}
			}
		}
	}
	const calls = [];
	traverse( ast, {
		CallExpression( p ) {
			const callee = p.node.callee;
			if ( 'Identifier' !== callee.type || ! imports.has( callee.name ) || isInsideExcludedRanges( p.node.start, excludedRanges ) ) {
				return;
			}
			if ( ! p.node.arguments.some( passesAttributes ) ) {
				return;
			}
			const { file, name } = imports.get( callee.name );
			const files = new Set();
			for ( const f of declaringFiles( file, name ) ) {
				reachedFiles( f, 2, files );
			}
			const prefixes = new Set( [ '' ] );
			p.node.arguments.forEach( ( a ) => 'StringLiteral' === a.type && prefixes.add( a.value ) );
			calls.push( { files, prefixes } );
		},
	} );
	return calls;
}

const lowerFirst = ( s ) => s.charAt( 0 ).toLowerCase() + s.slice( 1 );

/**
 * Whether one of the helper calls reads `attr`.
 *
 * @param {string} attr  Attribute name.
 * @param {Array}  calls collectHelperCalls() output.
 * @return {boolean} True when a helper names the attribute or builds it from a passed prefix and a quoted suffix.
 */
function helperReadsAttr( attr, calls ) {
	for ( const { files, prefixes } of calls ) {
		const text = [ ...files ].map( ( f ) => fs.readFileSync( f, 'utf8' ) ).join( '\n' );
		if ( new RegExp( `\\b${ attr }\\b` ).test( text ) ) {
			return true;
		}
		for ( const m of text.matchAll( /['"]([A-Z][A-Za-z0-9]*)['"]/g ) ) {
			for ( const p of prefixes ) {
				if ( ( p ? p + m[ 1 ] : lowerFirst( m[ 1 ] ) ) === attr ) {
					return true;
				}
			}
		}
	}
	return false;
}

module.exports = { collectHelperCalls, helperReadsAttr };
