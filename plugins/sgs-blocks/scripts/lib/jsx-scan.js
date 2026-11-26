'use strict';
/*
 * Shared reader for the editor-inspector detectors (Stage E2 codemods): parse one source file with @babel/parser, walk
 * its JSX with the chain of enclosing nodes, read a prop as string / true / false / expression, and follow a block's
 * `edit.js` imports to every component file it reaches inside `src/`.
 *
 * Used by check-panel-initial-open.js, check-reset-only-menus.js, check-spacing-panel.js, check-colour-count.js,
 * check-focus-switch-home.js and check-background-panel-mount.js.
 *
 * Self-test: node scripts/lib/jsx-scan.js --self-test
 */
const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const SRC = path.join( PLUGIN, 'src' );
const SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments', 'innerComments', 'extra' ] );

/** Plugin-relative forward-slash path. */
const rel = ( file ) => path.relative( PLUGIN, file ).split( path.sep ).join( '/' );

/** Every `.js` file under `dir` (recursive), sorted. */
function jsFiles( dir = SRC ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...jsFiles( full ) );
		} else if ( entry.name.endsWith( '.js' ) ) {
			out.push( full );
		}
	}
	return out.sort();
}

/** Parse source text to an AST (module, JSX). */
function parse( text ) {
	return parser.parse( text, { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: false } );
}

/** Element name: `PanelBody`, or `Foo.Bar` for a member. */
function jsxName( el ) {
	const n = el.openingElement ? el.openingElement.name : el.name;
	if ( ! n ) {
		return '';
	}
	if ( 'JSXIdentifier' === n.type ) {
		return n.name;
	}
	if ( 'JSXMemberExpression' === n.type ) {
		return `${ n.object.name || '' }.${ n.property.name }`;
	}
	return '';
}

/**
 * Read one prop of a JSX element.
 *
 * @param {Object} el   JSXElement.
 * @param {string} name Prop name.
 * @return {{present: boolean, kind: string, value: *, node: Object|null}} kind is one of 'absent', 'string', 'true'
 *   (bare prop or `{ true }`), 'false' (`{ false }`), 'number', 'expr'.
 */
function prop( el, name ) {
	const found = el.openingElement.attributes.find( ( a ) => 'JSXAttribute' === a.type && a.name && a.name.name === name );
	if ( ! found ) {
		return { present: false, kind: 'absent', value: undefined, node: null };
	}
	const v = found.value;
	if ( null === v ) {
		return { present: true, kind: 'true', value: true, node: found };
	}
	if ( 'StringLiteral' === v.type ) {
		return { present: true, kind: 'string', value: v.value, node: found };
	}
	if ( 'JSXExpressionContainer' === v.type ) {
		const e = v.expression;
		if ( 'BooleanLiteral' === e.type ) {
			return { present: true, kind: e.value ? 'true' : 'false', value: e.value, node: found };
		}
		if ( 'StringLiteral' === e.type ) {
			return { present: true, kind: 'string', value: e.value, node: found };
		}
		if ( 'TemplateLiteral' === e.type && 0 === e.expressions.length ) {
			return { present: true, kind: 'string', value: e.quasis[ 0 ].value.cooked, node: found };
		}
		if ( 'NumericLiteral' === e.type ) {
			return { present: true, kind: 'number', value: e.value, node: found };
		}
		return { present: true, kind: 'expr', value: undefined, node: found };
	}
	return { present: true, kind: 'expr', value: undefined, node: found };
}

/** True when the opening tag carries a `{ ...spread }`. */
const hasSpread = ( el ) => el.openingElement.attributes.some( ( a ) => 'JSXSpreadAttribute' === a.type );

/**
 * Walk every node; `visit( node, ancestors )` runs for each JSXElement with the ancestors (outermost first, all node
 * types).
 *
 * @param {Object}   ast   Babel File.
 * @param {Function} visit Visitor.
 */
function walkJsx( ast, visit ) {
	const seen = new Set();
	const walk = ( node, ancestors ) => {
		if ( ! node || 'object' !== typeof node ) {
			return;
		}
		if ( Array.isArray( node ) ) {
			node.forEach( ( n ) => walk( n, ancestors ) );
			return;
		}
		if ( seen.has( node ) ) {
			return;
		}
		seen.add( node );
		if ( 'JSXElement' === node.type ) {
			visit( node, ancestors );
		}
		const next = node.type ? ancestors.concat( [ node ] ) : ancestors;
		for ( const key of Object.keys( node ) ) {
			if ( ! SKIP_KEYS.has( key ) ) {
				walk( node[ key ], next );
			}
		}
	};
	walk( ast.program.body, [] );
}

/** Name of the function or const that encloses a node, from its ancestors; '' at module level. */
function enclosingSymbol( ancestors ) {
	for ( let i = ancestors.length - 1; i >= 0; i-- ) {
		const a = ancestors[ i ];
		if ( 'FunctionDeclaration' === a.type && a.id ) {
			return a.id.name;
		}
		if ( 'VariableDeclarator' === a.type && a.id && 'Identifier' === a.id.type ) {
			return a.id.name;
		}
		if ( 'ClassMethod' === a.type && a.key ) {
			return a.key.name;
		}
	}
	return '';
}

/** Nearest enclosing JSX element satisfying `pred`, or null. */
function closestJsx( ancestors, pred ) {
	for ( let i = ancestors.length - 1; i >= 0; i-- ) {
		if ( 'JSXElement' === ancestors[ i ].type && pred( ancestors[ i ] ) ) {
			return ancestors[ i ];
		}
	}
	return null;
}

/**
 * The block slug a source file belongs to: `src/blocks/<slug>/...` or `src/commerce-blocks/<slug>/...`; '' for shared
 * code.
 */
function blockOf( file ) {
	const m = rel( file ).match( /^src\/(?:blocks|commerce-blocks)\/([^/]+)\// );
	return m && 'extensions' !== m[ 1 ] ? m[ 1 ] : '';
}

/** Relative import specifiers of one file's AST (static imports and `import()` calls). */
function importSources( ast ) {
	const out = [];
	const seen = new Set();
	const walk = ( node ) => {
		if ( ! node || 'object' !== typeof node || seen.has( node ) ) {
			return;
		}
		seen.add( node );
		if ( Array.isArray( node ) ) {
			node.forEach( walk );
			return;
		}
		if ( ( 'ImportDeclaration' === node.type || 'ExportNamedDeclaration' === node.type || 'ExportAllDeclaration' === node.type ) && node.source ) {
			out.push( node.source.value );
		}
		if ( 'CallExpression' === node.type && 'Import' === node.callee.type && node.arguments[ 0 ] && 'StringLiteral' === node.arguments[ 0 ].type ) {
			out.push( node.arguments[ 0 ].value );
		}
		for ( const key of Object.keys( node ) ) {
			if ( ! SKIP_KEYS.has( key ) ) {
				walk( node[ key ] );
			}
		}
	};
	walk( ast.program.body );
	return out;
}

/** Resolve a relative import from `fromFile` to a file under SRC, or null. */
function resolveImport( spec, fromFile ) {
	if ( ! spec.startsWith( '.' ) ) {
		return null;
	}
	const base = path.resolve( path.dirname( fromFile ), spec );
	for ( const cand of [ base, `${ base }.js`, path.join( base, 'index.js' ) ] ) {
		try {
			if ( fs.statSync( cand ).isFile() && cand.endsWith( '.js' ) ) {
				return cand;
			}
		} catch ( e ) {
			// Not a file: try the next form.
		}
	}
	return null;
}

const astCache = new Map();
/** Parsed AST of a file, cached; null on a parse error. */
function astOf( file ) {
	if ( ! astCache.has( file ) ) {
		try {
			astCache.set( file, parse( fs.readFileSync( file, 'utf8' ) ) );
		} catch ( e ) {
			astCache.set( file, null );
		}
	}
	return astCache.get( file );
}

/**
 * Every file under SRC an entry file reaches through relative imports (the entry included).
 *
 * @param {string} entry Absolute path.
 * @return {string[]} Absolute paths, sorted.
 */
function importClosure( entry ) {
	const out = new Set( [ entry ] );
	const queue = [ entry ];
	while ( queue.length ) {
		const f = queue.pop();
		const ast = astOf( f );
		if ( ! ast ) {
			continue;
		}
		for ( const spec of importSources( ast ) ) {
			const t = resolveImport( spec, f );
			if ( t && ! out.has( t ) ) {
				out.add( t );
				queue.push( t );
			}
		}
	}
	return [ ...out ].sort();
}

/** Every block slug directory with an `edit.js`, as `{ slug, dir, edit }`. */
function blocks() {
	const out = [];
	for ( const group of [ 'blocks', 'commerce-blocks' ] ) {
		const root = path.join( SRC, group );
		if ( ! fs.existsSync( root ) ) {
			continue;
		}
		for ( const entry of fs.readdirSync( root, { withFileTypes: true } ) ) {
			const dir = path.join( root, entry.name );
			const edit = path.join( dir, 'edit.js' );
			if ( entry.isDirectory() && fs.existsSync( edit ) ) {
				out.push( { slug: entry.name, dir, edit } );
			}
		}
	}
	return out.sort( ( a, b ) => a.slug.localeCompare( b.slug ) );
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	const ast = parse( 'const A = () => (<PanelBody title="T" initialOpen={ false } a b={ x } {...r}><X.Y /></PanelBody>);' );
	let el = null;
	let inner = null;
	walkJsx( ast, ( n, anc ) => {
		if ( 'PanelBody' === jsxName( n ) ) {
			el = n;
		} else {
			inner = { n, anc };
		}
	} );
	ok( 'reads a string prop', 'T' === prop( el, 'title' ).value );
	ok( 'reads { false }', 'false' === prop( el, 'initialOpen' ).kind );
	ok( 'reads a bare prop as true', 'true' === prop( el, 'a' ).kind );
	ok( 'reads an expression prop', 'expr' === prop( el, 'b' ).kind );
	ok( 'reports an absent prop', 'absent' === prop( el, 'zzz' ).kind );
	ok( 'sees a spread', hasSpread( el ) );
	ok( 'names a member element', 'X.Y' === jsxName( inner.n ) );
	ok( 'gives the enclosing symbol', 'A' === enclosingSymbol( inner.anc ) );
	ok( 'finds the closest JSX ancestor', closestJsx( inner.anc, ( e ) => 'PanelBody' === jsxName( e ) ) === el );
	ok( 'blockOf maps a block file', 'hero' === blockOf( path.join( SRC, 'blocks', 'hero', 'edit.js' ) ) );
	ok( 'blockOf leaves shared files blank', '' === blockOf( path.join( SRC, 'components', 'SgsColourPanel.js' ) ) );
	const closure = importClosure( path.join( SRC, 'blocks', 'hero', 'edit.js' ) );
	ok( 'the import closure of a block reaches a shared component', closure.some( ( f ) => f.endsWith( 'SgsColourPanel.js' ) ) );
	process.stdout.write( 0 === failures.length ? '\n[jsx-scan --self-test] ALL ASSERTIONS PASS.\n' : `\n[jsx-scan --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

module.exports = { PLUGIN, SRC, rel, jsFiles, parse, jsxName, prop, hasSpread, walkJsx, enclosingSymbol, closestJsx, blockOf, importSources, resolveImport, astOf, importClosure, blocks };

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		selfTest();
	} else {
		process.stdout.write( 'usage: node scripts/lib/jsx-scan.js --self-test\n' );
		process.exit( 2 );
	}
}
