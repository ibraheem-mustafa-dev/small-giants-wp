#!/usr/bin/env node
/**
 * check-import-shadowing.js
 *
 * Fails when an editor file destructures a block attribute whose name is also a
 * module-level import in the same file. The destructured attribute value then
 * shadows the imported binding for the rest of that scope, so a call to the
 * import calls the attribute instead ("TypeError: x is not a function"), and
 * the block's editor shows "This block has encountered an error".
 *
 * A binding counts as destructured from attributes when it comes from:
 *   const { name } = attributes;
 *   const { name } = props.attributes;
 *   function Edit( { attributes: { name } } ) { ... }
 * Renamed bindings (`{ name: other }`) are judged by the local name `other`.
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

// Is this expression `attributes` or `<anything>.attributes`?
function isAttributesExpression( node ) {
	if ( ! node ) {
		return false;
	}
	if ( 'Identifier' === node.type ) {
		return 'attributes' === node.name;
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

// Every ObjectPattern that destructures attributes, wherever it sits.
function attributeDestructurings( node, out ) {
	if ( ! node || 'object' !== typeof node ) {
		return out;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => attributeDestructurings( n, out ) );
		return out;
	}
	if ( 'VariableDeclarator' === node.type && node.id && 'ObjectPattern' === node.id.type && isAttributesExpression( node.init ) ) {
		out.push( node.id );
	}
	// `{ attributes: { a, b } }` inside a parameter or any other pattern.
	if ( 'ObjectProperty' === node.type && ! node.computed && node.key &&
		( ( 'Identifier' === node.key.type && 'attributes' === node.key.name ) ||
			( 'StringLiteral' === node.key.type && 'attributes' === node.key.value ) ) ) {
		const value = 'AssignmentPattern' === node.value?.type ? node.value.left : node.value;
		if ( value && 'ObjectPattern' === value.type ) {
			out.push( value );
		}
	}
	for ( const key of Object.keys( node ) ) {
		if ( 'loc' === key || 'start' === key || 'end' === key || 'leadingComments' === key || 'trailingComments' === key ) {
			continue;
		}
		const child = node[ key ];
		if ( child && 'object' === typeof child ) {
			attributeDestructurings( child, out );
		}
	}
	return out;
}

function scanSource( source ) {
	const ast = parseSource( source );
	const imports = new Map();
	for ( const stmt of ast.program.body ) {
		if ( 'ImportDeclaration' === stmt.type ) {
			for ( const spec of stmt.specifiers ) {
				imports.set( spec.local.name, stmt.source.value );
			}
		}
	}
	if ( ! imports.size ) {
		return [];
	}
	const violations = [];
	for ( const pattern of attributeDestructurings( ast.program, [] ) ) {
		for ( const binding of patternBindings( pattern, [] ) ) {
			if ( imports.has( binding.name ) ) {
				violations.push( { name: binding.name, line: binding.line, from: imports.get( binding.name ) } );
			}
		}
	}
	return violations;
}

function report( file, violations ) {
	for ( const v of violations ) {
		console.log( `  ${ file }:${ v.line }  '${ v.name }' is destructured from attributes and also imported from '${ v.from }'; read it as attributes.${ v.name } or rename the import` );
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
		console.log( `[check-import-shadowing] FAIL: ${ total } attribute binding(s) shadow an import (${ files.length } files scanned).` );
		return 1;
	}
	console.log( `[check-import-shadowing] OK: no attribute binding shadows an import (${ files.length } files scanned).` );
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
