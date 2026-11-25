// The guard lib/css-equivalence/tolerance.mjs cites (Spec 48 FR-48-36, R-47-5): every px or fractional tolerance in the
// route's lib comes from that module, so no layer holds a tolerance another does not. A literal 0.5 (the px tolerance) or
// 0.011 (the scale tolerance) used as a tolerance (a
// bound a measured difference is compared against, an offset added to or taken from a measured length, a tolerance argument
// to sameValue, a `px` or `tol` field) is refused outside the module; the few 0.5s that are no length (an alpha, a centre) are
// named below with their reason. Read through the syntax tree, so a comment or a string holding "0.5px" is never a hit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';

const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const MODULE = 'lib/css-equivalence/tolerance.mjs';
const TOLERANCES = new Set( [ 0.5, 0.011 ] );
const COMPARE = new Set( [ '<', '>', '<=', '>=' ] );
const OFFSET = new Set( [ '+', '-' ] );
const TOLERANCE_ARGS = new Set( [ 'sameValue', 'samePaint', 'toleranceFor' ] );
const TOLERANCE_FIELDS = new Set( [ 'px', 'tol', 'tolerance', 'box' ] );
const SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments' ] );

// The 0.5s that are no length tolerance: `<file> <how the literal sits>` -> why.
export const NOT_A_LENGTH = {
	'lib/fill-scrollbar.mjs c.a < 0.5': 'an alpha: a colour more than half transparent paints no bar',
	'lib/motion-loops.mjs ( loop.offsets?.[ 1 ] ?? 0.5 ) - 0.5': 'the midpoint offset of a keyframe loop (0 to 1), not a length',
};

// The tolerance literals in one source text: [ { line, how } ].
export function toleranceLiterals( src ) {
	const ast = parse( src, { sourceType: 'module', plugins: [ 'importAttributes' ] } );
	const out = [];
	const visit = ( n, parent, grand ) => {
		if ( ! n || 'object' !== typeof n ) {
			return;
		}
		if ( Array.isArray( n ) ) {
			n.forEach( ( x ) => visit( x, parent, grand ) );
			return;
		}
		if ( 'NumericLiteral' === n.type && TOLERANCES.has( n.value ) ) {
			// A conditional's branch stands for the conditional (`i < 4 ? 1e-3 : 0.5`).
			const up = 'ConditionalExpression' === parent?.type && parent.test !== n ? grand : parent;
			const other = ( p ) => src.slice( ( p.left === n ? p.right : p.left ).start, ( p.left === n ? p.right : p.left ).end );
			let how = null;
			if ( 'BinaryExpression' === up?.type && ! [ up.left, up.right ].every( ( x ) => 'NumericLiteral' === x.type ) ) {
				if ( COMPARE.has( up.operator ) || OFFSET.has( up.operator ) ) {
					how = src.slice( up.start, up.end ).replace( /\s+/g, ' ' );
				} else if ( '*' === up.operator && /^Math\.sqrt\(/.test( other( up ) ) ) {
					how = src.slice( up.start, up.end ).replace( /\s+/g, ' ' );
				}
			} else if ( 'CallExpression' === up?.type && TOLERANCE_ARGS.has( src.slice( up.callee.start, up.callee.end ).split( '.' ).pop() ) ) {
				how = `${ src.slice( up.callee.start, up.callee.end ) }( …, ${ n.value } )`;
			} else if ( 'ObjectProperty' === up?.type && TOLERANCE_FIELDS.has( up.key.name ?? up.key.value ) ) {
				how = `${ up.key.name ?? up.key.value }: ${ n.value }`;
			}
			how && out.push( { line: n.loc.start.line, how } );
		}
		for ( const k of Object.keys( n ) ) {
			SKIP_KEYS.has( k ) || visit( n[ k ], n, parent );
		}
	};
	visit( ast.program, null, null );
	return out;
}

const filesIn = ( dir ) => fs.readdirSync( dir, { withFileTypes: true } ).flatMap( ( e ) => ( e.isDirectory() ? ( 'node_modules' === e.name ? [] : filesIn( path.join( dir, e.name ) ) ) : /\.mjs$/.test( e.name ) ? [ path.join( dir, e.name ) ] : [] ) );
const rel = ( f ) => path.relative( ROOT, f ).split( path.sep ).join( '/' );

test( 'MUST FAIL: the scanner refuses a literal tolerance in a comparison, an offset, a sameValue call, a px field and a root-sum bound, and passes the module\'s own names and a 0.5 that is no tolerance', () => {
	const hits = ( code ) => toleranceLiterals( code ).map( ( h ) => h.how );
	assert.deepEqual( hits( 'if ( a - b > 0.5 ) {}' ), [ 'a - b > 0.5' ] );
	assert.deepEqual( hits( 'ok = Math.abs( a.scale - b.scale ) <= 0.011;' ), [ 'Math.abs( a.scale - b.scale ) <= 0.011' ] );
	assert.deepEqual( hits( 'const c = w < rendered[ w ] - 0.5;' ), [ 'rendered[ w ] - 0.5' ] );
	assert.deepEqual( hits( 'sameValue( key, a, b, 0.5 );' ), [ 'sameValue( …, 0.5 )' ] );
	assert.deepEqual( hits( 'export const T = { box: 1, px: 0.5 };' ), [ 'px: 0.5' ] );
	assert.deepEqual( hits( 'const s = Math.max( tol, 0.5 * Math.sqrt( n ) );' ), [ '0.5 * Math.sqrt( n )' ] );
	assert.equal( hits( 'ok = Math.abs( x - y ) <= ( i < 4 ? 1e-3 : 0.5 );' ).length, 1, 'a conditional bound counts as the comparison it sits in' );
	// negative controls: the module's names, a half as a factor, a comment and a string
	assert.deepEqual( hits( 'if ( a - b > PX_TOL ) {}\nconst x = w - PX_TOL;' ), [] );
	assert.deepEqual( hits( 'const half = size * 0.5;\nconst w = { tag: 0.5 };' ), [] );
	assert.deepEqual( hits( '// within 0.5px\nconst t = "0.5px";\nconst u = `${ n }px 0.5`;' ), [] );
} );

test( 'MUST FAIL: no tolerance literal sits in the route\'s code outside the tolerance module; a 0.5 that is no length is named with its reason', () => {
	const found = [];
	for ( const f of [ ...filesIn( path.join( ROOT, 'lib' ) ), ...fs.readdirSync( ROOT ).filter( ( x ) => /\.mjs$/.test( x ) ).map( ( x ) => path.join( ROOT, x ) ) ] ) {
		if ( rel( f ) === MODULE ) {
			continue;
		}
		const src = fs.readFileSync( f, 'utf8' );
		for ( const h of toleranceLiterals( src ) ) {
			NOT_A_LENGTH[ `${ rel( f ) } ${ h.how }` ] || found.push( `${ rel( f ) }:${ h.line } ${ h.how }` );
		}
	}
	assert.deepEqual( found, [], 'import PX_TOL, BOX_TOL or PCT_TOL from lib/css-equivalence/tolerance.mjs (or name the 0.5 in NOT_A_LENGTH with its reason)' );
} );

test( 'every 0.5 NOT_A_LENGTH names is still in its file, so the list holds no stale entry', () => {
	for ( const key of Object.keys( NOT_A_LENGTH ) ) {
		const [ file, ...how ] = key.split( ' ' );
		const hit = toleranceLiterals( fs.readFileSync( path.join( ROOT, file ), 'utf8' ) ).some( ( h ) => h.how === how.join( ' ' ) );
		assert.ok( hit, `${ key } no longer matches a literal in ${ file }` );
	}
} );
