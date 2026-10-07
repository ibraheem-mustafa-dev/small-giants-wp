#!/usr/bin/env node
/**
 * check-import-shadowing.js
 *
 * Fails when an editor file destructures a block attribute whose name is also a
 * module-level binding in the same file: an import, or a top-level function,
 * class or variable. The destructured attribute value then shadows that binding
 * for the rest of its scope, so a call to the helper calls the attribute instead
 * ("TypeError: x is not a function"), and the block's editor shows "This block
 * has encountered an error".
 *
 * A binding counts as destructured from attributes when it comes from:
 *   const { name } = attributes;
 *   const { name } = props.attributes;
 *   function Edit( { attributes: { name } } ) { ... }
 *   function Edit( { attributes: attrs } ) { const { name } = attrs; }
 * Renamed bindings (`{ name: other }`) are judged by the local name `other`. A
 * renamed attributes object counts only inside the function that renames it (and
 * the functions nested in it); a reassignment (`let attrs = attributes;`) is not
 * followed.
 *
 * Usage:
 *   node scripts/check-import-shadowing.js --check         exit 1 on any violation
 *   node scripts/check-import-shadowing.js --file <path>   scan one file (any path)
 *   node scripts/check-import-shadowing.js --self-test     fixtures that must fire and must not
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { parse } = require( '@babel/parser' );

const SRC = path.join( __dirname, '..', 'src' );
const SKIP_DIRS = new Set( [ 'node_modules', 'build', '__tests__', 'test', 'tests' ] );

function listJsFiles( dir ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		if ( entry.isDirectory() ) {
			if ( ! SKIP_DIRS.has( entry.name ) ) {
				out.push( ...listJsFiles( path.join( dir, entry.name ) ) );
			}
		} else if ( /\.(js|jsx|mjs)$/.test( entry.name ) && ! /\.(test|spec)\./.test( entry.name ) ) {
			out.push( path.join( dir, entry.name ) );
		}
	}
	return out;
}

function parseSource( source ) {
	return parse( source, {
		sourceType: 'module',
		errorRecovery: true,
		plugins: [ 'jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport' ],
	} );
}

// Is this expression `attributes` (or a local renamed from it) or `<anything>.attributes`?
function isAttributesExpression( node, aliases ) {
	if ( ! node ) {
		return false;
	}
	if ( 'Identifier' === node.type ) {
		return 'attributes' === node.name || aliases.has( node.name );
	}
	return 'MemberExpression' === node.type && ! node.computed &&
		'Identifier' === node.property.type && 'attributes' === node.property.name;
}

// Local names bound by an ObjectPattern (one level; nested patterns bind their own names too).
function patternBindings( pattern, out ) {
	if ( ! pattern ) {
		return out;
	}
	if ( 'Identifier' === pattern.type ) {
		out.push( { name: pattern.name, line: pattern.loc.start.line } );
	} else if ( 'AssignmentPattern' === pattern.type ) {
		patternBindings( pattern.left, out );
	} else if ( 'ObjectPattern' === pattern.type ) {
		for ( const prop of pattern.properties ) {
			patternBindings( 'RestElement' === prop.type ? prop.argument : prop.value, out );
		}
	} else if ( 'ArrayPattern' === pattern.type ) {
		pattern.elements.forEach( ( el ) => patternBindings( el, out ) );
	}
	return out;
}

const SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'leadingComments', 'trailingComments', 'innerComments' ] );
const FUNCTION_TYPES = new Set( [ 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod' ] );

function children( node ) {
	const out = [];
	for ( const key of Object.keys( node ) ) {
		const child = node[ key ];
		if ( SKIP_KEYS.has( key ) || ! child || 'object' !== typeof child ) {
			continue;
		}
		if ( Array.isArray( child ) ) {
			out.push( ...child.filter( ( c ) => c && 'object' === typeof c ) );
		} else {
			out.push( child );
		}
	}
	return out;
}

const isAttributesKey = ( node ) => 'ObjectProperty' === node.type && ! node.computed && node.key &&
	( ( 'Identifier' === node.key.type && 'attributes' === node.key.name ) ||
		( 'StringLiteral' === node.key.type && 'attributes' === node.key.value ) );

const propertyValue = ( node ) => ( 'AssignmentPattern' === node.value?.type ? node.value.left : node.value );

// Locals a function renames the attributes object to (`{ attributes: attrs }` in its
// parameters or its own body), not counting nested functions, which have their own.
function aliasesDeclaredIn( fn ) {
	const aliases = new Set();
	const stack = [ ...fn.params, fn.body ];
	while ( stack.length ) {
		const node = stack.pop();
		if ( ! node || 'object' !== typeof node || FUNCTION_TYPES.has( node.type ) ) {
			continue;
		}
		if ( isAttributesKey( node ) ) {
			const value = propertyValue( node );
			if ( value && 'Identifier' === value.type && 'attributes' !== value.name ) {
				aliases.add( value.name );
			}
		}
		stack.push( ...children( node ) );
	}
	return aliases;
}

// Every ObjectPattern that destructures attributes. An alias counts only inside the
// function that declares it and the functions nested in it. A reassignment
// (`let attrs = attributes;`) is not followed.
function attributeDestructurings( node, aliases, out ) {
	if ( FUNCTION_TYPES.has( node.type ) ) {
		const own = aliasesDeclaredIn( node );
		if ( own.size ) {
			aliases = new Set( [ ...aliases, ...own ] );
		}
	}
	if ( 'VariableDeclarator' === node.type && node.id && 'ObjectPattern' === node.id.type && isAttributesExpression( node.init, aliases ) ) {
		out.push( node.id );
	}
	// `{ attributes: { a, b } }` inside a parameter or any other pattern.
	if ( isAttributesKey( node ) ) {
		const value = propertyValue( node );
		if ( value && 'ObjectPattern' === value.type ) {
			out.push( value );
		}
	}
	for ( const child of children( node ) ) {
		attributeDestructurings( child, aliases, out );
	}
	return out;
}

// Module-level names a destructured attribute can shadow: imports, and top-level
// function, class and variable declarations (exported or not).
function moduleBindings( program ) {
	const names = new Map();
	for ( let stmt of program.body ) {
		if ( 'ImportDeclaration' === stmt.type ) {
			for ( const spec of stmt.specifiers ) {
				names.set( spec.local.name, `imported from '${ stmt.source.value }'` );
			}
			continue;
		}
		if ( ( 'ExportNamedDeclaration' === stmt.type || 'ExportDefaultDeclaration' === stmt.type ) && stmt.declaration ) {
			stmt = stmt.declaration;
		}
		if ( ( 'FunctionDeclaration' === stmt.type || 'ClassDeclaration' === stmt.type ) && stmt.id ) {
			names.set( stmt.id.name, 'declared at module level' );
		} else if ( 'VariableDeclaration' === stmt.type ) {
			for ( const decl of stmt.declarations ) {
				for ( const b of patternBindings( decl.id, [] ) ) {
					names.set( b.name, 'declared at module level' );
				}
			}
		}
	}
	return names;
}

function scanSource( source ) {
	const ast = parseSource( source );
	const bindings = moduleBindings( ast.program );
	if ( ! bindings.size ) {
		return [];
	}
	const violations = [];
	for ( const pattern of attributeDestructurings( ast.program, new Set(), [] ) ) {
		for ( const binding of patternBindings( pattern, [] ) ) {
			if ( bindings.has( binding.name ) ) {
				violations.push( { name: binding.name, line: binding.line, from: bindings.get( binding.name ) } );
			}
		}
	}
	return violations;
}

function report( file, violations ) {
	for ( const v of violations ) {
		console.log( `  ${ file }:${ v.line }  '${ v.name }' is destructured from attributes and also ${ v.from }; read it as attributes.${ v.name } or rename the other binding` );
	}
}

function runCheck() {
	let total = 0;
	const files = listJsFiles( SRC );
	for ( const file of files ) {
		const violations = scanSource( fs.readFileSync( file, 'utf8' ) );
		if ( violations.length ) {
			report( path.relative( path.join( __dirname, '..' ), file ), violations );
			total += violations.length;
		}
	}
	if ( total ) {
		console.log( `[check-import-shadowing] FAIL: ${ total } attribute binding(s) shadow a module-level binding (${ files.length } files scanned).` );
		return 1;
	}
	console.log( `[check-import-shadowing] OK: no attribute binding shadows a module-level binding (${ files.length } files scanned).` );
	return 0;
}

const FIXTURES = [
	{
		name: 'plain destructure shadowing a named import fires',
		src: "import { labelText } from './x';\nexport default function Edit( { attributes } ) {\n\tconst { labelText, size } = attributes;\n\treturn labelText( size );\n}",
		expect: [ 'labelText' ],
	},
	{
		name: 'parameter destructure shadowing a default import fires',
		src: "import helper from './h';\nexport default function Edit( { attributes: { helper, other } } ) { return helper; }",
		expect: [ 'helper' ],
	},
	{
		name: 'props.attributes destructure with a rename fires on the local name',
		src: "import { pick } from './p';\nfunction Edit( props ) { const { choice: pick } = props.attributes; return pick; }",
		expect: [ 'pick' ],
	},
	{
		name: 'a renamed attributes object is followed',
		src: "import { pick } from './p';\nfunction Edit( { attributes: attrs } ) { const { pick } = attrs; return pick; }",
		expect: [ 'pick' ],
	},
	{
		name: 'shadowing a module-level function fires',
		src: "function formatPrice( v ) { return v; }\nexport default function Edit( { attributes } ) { const { formatPrice } = attributes; return formatPrice( 1 ); }",
		expect: [ 'formatPrice' ],
	},
	{
		name: 'an alias in one function does not capture a same-named object in another',
		src: "import { items } from './i';\nfunction A( { attributes: settings } ) { return settings; }\nfunction C( { settings } ) { const { items } = settings; return items; }",
		expect: [],
	},
	{
		name: 'reading attributes.name does not fire',
		src: "import { labelText } from './x';\nfunction Edit( { attributes } ) { const v = attributes.labelText; return labelText( v ); }",
		expect: [],
	},
	{
		name: 'destructuring a non-attributes object does not fire',
		src: "import { labelText } from './x';\nfunction Edit( { context } ) { const { labelText } = context; return labelText; }",
		expect: [],
	},
	{
		name: 'a renamed binding that no longer collides does not fire',
		src: "import { labelText } from './x';\nfunction Edit( { attributes } ) { const { labelText: labelTextValue } = attributes; return labelText( labelTextValue ); }",
		expect: [],
	},
];

function runSelfTest() {
	let failed = 0;
	for ( const fx of FIXTURES ) {
		const got = scanSource( fx.src ).map( ( v ) => v.name ).sort();
		const ok = JSON.stringify( got ) === JSON.stringify( [ ...fx.expect ].sort() );
		if ( ! ok ) {
			failed++;
		}
		console.log( `  ${ ok ? 'PASS' : 'FAIL' }  ${ fx.name }${ ok ? '' : ` (got ${ JSON.stringify( got ) })` }` );
	}
	console.log( `${ FIXTURES.length - failed }/${ FIXTURES.length } checks passed` );
	return failed ? 1 : 0;
}

if ( require.main === module ) {
	const args = process.argv.slice( 2 );
	if ( args.includes( '--self-test' ) ) {
		process.exit( runSelfTest() );
	}
	const fileIdx = args.indexOf( '--file' );
	if ( -1 !== fileIdx ) {
		const file = args[ fileIdx + 1 ];
		const violations = scanSource( fs.readFileSync( file, 'utf8' ) );
		report( file, violations );
		console.log( `[check-import-shadowing] ${ violations.length } violation(s) in ${ file }` );
		process.exit( violations.length ? 1 : 0 );
	}
	process.exit( runCheck() );
}

module.exports = { scanSource };
