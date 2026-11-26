#!/usr/bin/env node
// Detector (migration-method: survey, fix, check, self-test) for one rule: a calibration or record setting entry holds
// every property it paints in `properties` and its first in `property` (lib/css-families.mjs::paintedProps), so a reader that
// matches `entry.property` against a property sees only the first one of a `height,width` setting. Every reader goes through
// `paintedProps( entry )`. This tool parses each route source file and reports each `.property` read on a value bound from a
// calibration's `settings` (or a variable or parameter named `settings`: a callback over `Object.values|entries( cal.settings )`, a `for ... of` over it, a
// `const c = cal.settings[ attr ]`, a destructured `{ property }`), other than an existence test (`! c.property`, `c.property && ...`).
// A read that is right as it is carries `// painted-props-exempt: <why>` on its line or the line above.
//
//   node tools/check-painted-props.mjs --survey      list every flagged read (exit 0)
//   node tools/check-painted-props.mjs --check       the same list, exit 1 when it is not empty
//   node tools/check-painted-props.mjs --self-test   plant each shape, prove it is flagged and the exemptions are not
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const ITER = new Set( [ 'filter', 'map', 'some', 'every', 'find', 'findIndex', 'flatMap', 'forEach', 'reduce', 'sort' ] );
const MEMBER = new Set( [ 'MemberExpression', 'OptionalMemberExpression' ] );
const FN = new Set( [ 'ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration', 'ObjectMethod', 'ClassMethod' ] );
const EXEMPT = /painted-props-exempt:/;

const strip = ( n ) => ( n && ( 'LogicalExpression' === n.type || 'ParenthesizedExpression' === n.type || 'TSNonNullExpression' === n.type ) ? strip( n.left ?? n.expression ) : n );
// `<anything>.settings`: the map of a calibration's (or record's) settings, by attribute name.
const isSettingsMap = ( n ) => { n = strip( n ); return !! n && MEMBER.has( n.type ) && ! n.computed && 'settings' === n.property?.name; };
// `<settings map>[ attr ]`: one setting's entry.
const isEntry = ( n ) => { n = strip( n ); return !! n && MEMBER.has( n.type ) && n.computed && isSettingsMap( n.object ); };

function mentionsSettings( node, collections ) {
	let hit = false;
	( function walk( n ) {
		if ( hit || ! n || 'object' !== typeof n || FN.has( n.type ) ) {
			return;
		}
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( ( MEMBER.has( n.type ) && isSettingsMap( n ) ) || ( 'Identifier' === n.type && ( 'settings' === n.name || collections.has( n.name ) ) ) ) {
			hit = true;
			return;
		}
		for ( const [ k, v ] of Object.entries( n ) ) {
			'loc' !== k && 'start' !== k && 'end' !== k && walk( v );
		}
	}( node ) );
	return hit;
}

const names = ( pattern, out = [] ) => {
	if ( ! pattern ) {
		return out;
	}
	if ( 'Identifier' === pattern.type ) {
		out.push( pattern.name );
	} else if ( 'ArrayPattern' === pattern.type ) {
		pattern.elements.forEach( ( e ) => names( e, out ) );
	} else if ( 'AssignmentPattern' === pattern.type ) {
		names( pattern.left, out );
	} else if ( 'RestElement' === pattern.type ) {
		names( pattern.argument, out );
	}
	return out;
};

// Every flagged read in one source text: [ { file, line, text } ].
export function scanSource( code, file = '<source>' ) {
	const lines = code.split( '\n' );
	const found = [];
	const ast = parse( code, { sourceType: 'module', allowReturnOutsideFunction: true, plugins: [ 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'classStaticBlock' ] } );
	const flag = ( node ) => {
		const line = node.loc.start.line;
		if ( EXEMPT.test( lines[ line - 1 ] ?? '' ) || EXEMPT.test( lines[ line - 2 ] ?? '' ) ) {
			return;
		}
		found.push( { file, line, text: ( lines[ line - 1 ] ?? '' ).trim().slice( 0, 160 ) } );
	};
	// `! c.property`, `c.property && ...`, `c.property || ...`, `if ( c.property )`, `c.property ? a : b`: only whether the entry names a property.
	const existenceTest = ( node, parent ) => ( 'UnaryExpression' === parent?.type && '!' === parent.operator ) || ( 'LogicalExpression' === parent?.type && parent.left === node ) || ( [ 'IfStatement', 'ConditionalExpression' ].includes( parent?.type ) && parent.test === node );
	const hasPropertyKey = ( pattern ) => 'ObjectPattern' === pattern?.type && pattern.properties.some( ( p ) => 'ObjectProperty' === p.type && ! p.computed && 'property' === p.key?.name );

	function visit( node, parent, tainted, collections ) {
		if ( ! node || 'object' !== typeof node ) {
			return;
		}
		if ( Array.isArray( node ) ) {
			node.forEach( ( n ) => visit( n, parent, tainted, collections ) );
			return;
		}
		if ( 'string' !== typeof node.type ) {
			return;
		}
		if ( 'VariableDeclarator' === node.type && node.init ) {
			const init = strip( node.init );
			if ( 'Identifier' === node.id.type ) {
				if ( isEntry( init ) || ( 'Identifier' === init?.type && tainted.has( init.name ) ) ) {
					tainted.add( node.id.name );
				} else if ( mentionsSettings( init, collections ) ) {
					collections.add( node.id.name );
				}
			} else if ( hasPropertyKey( node.id ) && ( isEntry( init ) || ( 'Identifier' === init?.type && tainted.has( init.name ) ) ) ) {
				flag( node );
			}
		}
		if ( 'ForOfStatement' === node.type && mentionsSettings( node.right, collections ) && 'VariableDeclaration' === node.left.type ) {
			node.left.declarations.forEach( ( d ) => names( d.id ).forEach( ( n ) => tainted.add( n ) ) );
		}
		let scope = tainted;
		let reach = collections;
		if ( ( 'CallExpression' === node.type || 'OptionalCallExpression' === node.type ) && MEMBER.has( node.callee.type ) && ! node.callee.computed && ITER.has( node.callee.property?.name ) && mentionsSettings( node.callee.object, collections ) ) {
			const fn = node.arguments[ 0 ];
			if ( fn && FN.has( fn.type ) ) {
				fn.params.forEach( ( p ) => hasPropertyKey( p ) && flag( p ) );
				fn.__bound = fn.params.flatMap( ( p ) => names( p ) );
			}
		}
		if ( FN.has( node.type ) ) {
			scope = new Set( tainted );
			reach = new Set( collections );
			( node.__bound || [] ).forEach( ( n ) => scope.add( n ) );
		}
		if ( MEMBER.has( node.type ) && ! node.computed && 'property' === node.property?.name ) {
			const obj = strip( node.object );
			const own = ( 'Identifier' === obj?.type && tainted.has( obj.name ) ) || isEntry( obj );
			own && ! existenceTest( node, parent ) && flag( node );
		}
		for ( const [ k, v ] of Object.entries( node ) ) {
			'loc' !== k && 'start' !== k && 'end' !== k && '__bound' !== k && 'leadingComments' !== k && 'trailingComments' !== k && visit( v, node, scope, reach );
		}
	}
	visit( ast.program, null, new Set(), new Set() );
	// A reader that calls paintedProps( ... ) without importing it would fail only where it runs.
	if ( /\bpaintedProps\(/.test( code ) && ! /import\s*\{[^}]*\bpaintedProps\b[^}]*\}|export const paintedProps\b/.test( code ) ) {
		found.push( { file, line: 1, text: 'calls paintedProps( ... ) with no import of it' } );
	}
	return found;
}

// The route's own source: every .mjs in the route folder and under lib/ and tools/ (the detector itself plants its shapes as strings, so it holds none; tests hold none).
export function routeSources( root = ROUTE ) {
	const under = ( dir ) => fs.readdirSync( dir, { withFileTypes: true } ).flatMap( ( e ) => e.isDirectory() ? under( path.join( dir, e.name ) ) : e.name.endsWith( '.mjs' ) ? [ path.join( dir, e.name ) ] : [] );
	return [ ...fs.readdirSync( root ).filter( ( f ) => f.endsWith( '.mjs' ) ).map( ( f ) => path.join( root, f ) ), ...under( path.join( root, 'lib' ) ), ...under( path.join( root, 'tools' ) ) ];
}

export function scanRoute( root = ROUTE ) {
	return routeSources( root ).flatMap( ( f ) => scanSource( fs.readFileSync( f, 'utf8' ), path.relative( root, f ).replace( /\\/g, '/' ) ) );
}

const SELF = [
	[ 'a callback over Object.values( cal.settings )', 'Object.values( cal.settings ).filter( ( s ) => "x" === s.property );', 1 ],
	[ 'an entries callback with a destructured pair', 'Object.entries( cal?.settings || {} ).filter( ( [ a, s ] ) => longhands( s.property ).includes( p ) );', 1 ],
	[ 'a collection variable then a callback', 'const settings = Object.entries( cal.settings ); settings.some( ( [ , s ] ) => s.property === p );', 1 ],
	[ 'an entry variable', 'const c = ctx.calibration.settings?.[ r.attr_name ]; return c.property === p;', 1 ],
	[ 'a direct read of one entry', 'const x = cal.settings[ a ].property;', 1 ],
	[ 'a for-of over the settings', 'for ( const [ , s ] of Object.entries( cal.settings ) ) { use( s.property ); }', 1 ],
	[ 'a destructured property', 'Object.values( cal.settings ).map( ( { property } ) => property );', 1 ],
	[ 'an alias of an entry', 'const c = cal.settings[ a ]; const d = c; use( d.property );', 1 ],
	[ 'no flag: paintedProps( entry )', 'import { paintedProps } from "./x.mjs"; Object.values( cal.settings ).filter( ( s ) => paintedProps( s ).includes( p ) );', 0 ],
	[ 'no flag: an existence test', 'const c = cal.settings[ a ]; if ( ! c.property ) { go(); }', 0 ],
	[ 'no flag: the exemption comment', 'Object.values( cal.settings ).map( ( s ) => {\n\t// painted-props-exempt: the first property names the record\n\treturn s.property;\n} );', 0 ],
	[ 'a call of paintedProps with no import of it', 'Object.values( cal.settings ).filter( ( s ) => paintedProps( s ).includes( p ) );', 1 ],
	[ 'no flag: a call of paintedProps with its import', "import { paintedProps } from './css-families.mjs';\nObject.values( cal.settings ).filter( ( s ) => paintedProps( s ).includes( p ) );", 0 ],
	[ 'no flag: .property on something that is not a setting', 'rows.filter( ( r ) => r.property === p ); const m = node.property;', 0 ],
];

export function selfTest() {
	const bad = SELF.filter( ( [ , code, want ] ) => scanSource( code ).length !== want ).map( ( [ what, , want ] ) => `${ what }: expected ${ want } finding(s)` );
	return bad;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const mode = process.argv[ 2 ];
	if ( '--self-test' === mode ) {
		const bad = selfTest();
		bad.forEach( ( b ) => console.log( b ) );
		console.log( bad.length ? `self-test FAILED (${ bad.length })` : `self-test passed (${ SELF.length } plants)` );
		process.exit( bad.length ? 1 : 0 );
	} else if ( '--survey' === mode || '--check' === mode ) {
		const found = scanRoute();
		found.forEach( ( f ) => console.log( `${ f.file }:${ f.line}  ${ f.text }` ) );
		console.log( `${ found.length } read(s) of a setting entry's .property not routed through paintedProps` );
		process.exit( '--check' === mode && found.length ? 1 : 0 );
	} else {
		console.log( 'usage: node tools/check-painted-props.mjs --survey | --check | --self-test' );
		process.exit( 2 );
	}
}
