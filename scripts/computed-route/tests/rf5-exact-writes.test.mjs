// RF5 (clone root fixes 2026-11-25): a stated value is written unless it equals the default exactly; the tolerance is only for
// comparing measured renders and lives in one module; a length takes a token only when equal; an unstated initial value and a
// property that does not apply are not written; a setting that owns a property keeps a Custom CSS rule off it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactPaint, samePaint, PX_TOL } from '../lib/css-equivalence/tolerance.mjs';
import { tiersDiffering, undeclaredInitial } from '../lib/fill-prop.mjs';
import { snapLength } from '../lib/normalise.mjs';
import { ownedBySetting } from '../lib/fill-residual-owned.mjs';

const LIB = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'lib' );
const TOLERANCE_MODULE = path.join( 'css-equivalence', 'tolerance.mjs' );

const files = ( dir ) => fs.readdirSync( dir, { withFileTypes: true } ).flatMap( ( e ) => ( e.isDirectory() ? files( path.join( dir, e.name ) ) : e.name.endsWith( '.mjs' ) ? [ path.join( dir, e.name ) ] : [] ) );
// A tolerance literal: a *TOL* constant or a tol option given 0.5, a px difference compared to 0.5, a scale pose compared to 0.011.
const LITERALS = [
	/\b\w*TOL\w*\s*[=:]\s*0\.5\b/,
	/\btol(?:Px)?\s*[=:]\s*0\.5\b/,
	/Math\.abs\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\s*(?:<=|<|>=|>)\s*(?:0\.5|0\.011)\b/,
	/\bTOL \+ 0\.5\b/,
];

test( 'MUST FAIL if a tolerance literal returns outside lib/css-equivalence/tolerance.mjs', () => {
	const found = files( LIB ).filter( ( f ) => ! f.endsWith( TOLERANCE_MODULE ) ).flatMap( ( f ) => fs.readFileSync( f, 'utf8' ).split( '\n' ).flatMap( ( line, i ) => ( LITERALS.some( ( re ) => re.test( line ) ) ? [ `${ path.relative( LIB, f ) }:${ i + 1 }: ${ line.trim().slice( 0, 100 ) }` ] : [] ) ) );
	assert.deepEqual( found, [], 'import PX_TOL, SCALE_TOL or READ_EPSILON from lib/css-equivalence/tolerance.mjs' );
} );

test( 'negative control: the lint patterns catch each literal form', () => {
	for ( const line of [ 'const TOL = 0.5;', 'function f( a, tol = 0.5 ) {}', 'Math.abs( a - b ) <= 0.5', 'Math.abs( a.scale - b.scale ) <= 0.011', 'x > TOL + 0.5' ] ) {
		assert.ok( LITERALS.some( ( re ) => re.test( line ) ), line );
	}
	assert.ok( ! LITERALS.some( ( re ) => re.test( 'Math.abs( a - b ) <= PX_TOL' ) ) );
} );

test( 'a 1.5px stated bar is not the 2px default; 2px is; the measured-render tolerance still holds a 0.4px difference', () => {
	assert.equal( exactPaint( 'height', '1.5px', '2px' ), false );
	assert.equal( exactPaint( 'height', '2.5px', '2px' ), false );
	assert.equal( exactPaint( 'height', '2px', '2px' ), true );
	assert.equal( samePaint( 'height', '2.4px', '2px' ), true );
	assert.equal( samePaint( 'height', '2.6px', '2px' ), false );
	assert.equal( PX_TOL, 0.5 );
} );

test( 'a colour within the ΔE rule still matches exactly-written equals', () => {
	assert.equal( exactPaint( 'background-color', 'rgb(250, 250, 250)', 'rgb(250, 250, 250)' ), true );
	assert.equal( exactPaint( 'background-color', 'rgb(250, 250, 250)', 'rgb(10, 10, 10)' ), false );
} );

test( 'tiersDiffering writes the 1.5px and 2.5px bars over a 2px default, and holds an equal 2px', () => {
	assert.deepEqual( tiersDiffering( 'height', { 1440: '1.5px' }, () => '2px' ), { 1440: '1.5px' } );
	assert.deepEqual( tiersDiffering( 'height', { 1440: '2.5px' }, () => '2px' ), { 1440: '2.5px' } );
	assert.deepEqual( tiersDiffering( 'height', { 1440: '2px' }, () => '2px' ), {} );
} );

test( 'a length takes a token only when its px equals the token\'s', () => {
	const tokens = [ { slug: 'sm', px: 8 }, { slug: 'md', px: 16 } ];
	assert.equal( snapLength( 8.3, tokens )?.slug ?? null, null );
	assert.equal( snapLength( 16.5, tokens )?.slug ?? null, null );
	assert.equal( snapLength( 16, tokens )?.slug, 'md' );
} );

test( 'an initial layout value no code declares is not written; a declared one, or another property, is', () => {
	assert.equal( undeclaredInitial( 'grid-template-columns', 'none', {} ), true );
	assert.equal( undeclaredInitial( 'flex-grow', '0', {} ), true );
	assert.equal( undeclaredInitial( 'flex-grow', '0', { 'flex-grow': '0' } ), false, 'the code states it' );
	assert.equal( undeclaredInitial( 'flex-grow', '0', { flex: '0 0 auto' } ), false, 'the shorthand states it' );
	assert.equal( undeclaredInitial( 'grid-template-columns', '1fr 1fr', {} ), false, 'not the initial value' );
	assert.equal( undeclaredInitial( 'grid-template-columns', 'none', null ), false, 'a failed declared read judges nothing' );
	assert.equal( undeclaredInitial( 'margin-top', '0px', {} ), false, 'only the layout properties' );
} );

test( 'a property of a setting the node holds is owned: list-style against markerType', () => {
	assert.equal( ownedBySetting( 'list-style', { markerType: 'check' } ), 'markerType' );
	assert.equal( ownedBySetting( 'list-style-type', { markerType: 'check' } ), 'markerType' );
	assert.equal( ownedBySetting( 'list-style', { markerType: '' } ), null );
	assert.equal( ownedBySetting( 'list-style', {} ), null );
	assert.equal( ownedBySetting( 'margin', { markerType: 'check' } ), null );
} );
