// lib/catalogue-read.mjs::VARIESBY_WORDS and VARIESBY_VALUES restate what SGS's PHP decides: the axis word map in
// plugins/sgs-blocks/includes/class-product-provisioning.php::map_axis_to_variesby, and Google's closed variesBy enum in
// class-configurator-meta.php::Configurator_Meta::VARIESBY_ENUM (and class-product-templates-validators.php's
// $variesby_enum). The catalogue predicts which products the product preflight will publish, so a word or value the PHP
// does not share is a wrong prediction. Each case reads the PHP source; no WordPress, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIESBY_WORDS, VARIESBY_VALUES } from '../lib/catalogue-read.mjs';

const INCLUDES = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../plugins/sgs-blocks/includes' );
const read = ( f ) => fs.readFileSync( path.join( INCLUDES, f ), 'utf8' );

// The body of a PHP function by name, up to its closing brace at the function's own indent; null when absent.
function phpFunction( src, name ) {
	const m = new RegExp( `^([\\t ]*)(?:(?:private|public|protected|static)\\s+)*function\\s+${ name }\\s*\\(`, 'm' ).exec( src );
	if ( ! m ) {
		return null;
	}
	const end = src.indexOf( `\n${ m[ 1 ] }}`, m.index );
	return src.slice( m.index, end < 0 ? undefined : end );
}
// The string pairs of the first `$map = array( 'a' => 'b', ... )` in a function body: { a: 'b' }; null when absent.
function phpMap( body, variable ) {
	const m = new RegExp( `\\$${ variable }\\s*=\\s*array\\(([\\s\\S]*?)\\);` ).exec( body || '' );
	return m ? Object.fromEntries( [ ...m[ 1 ].matchAll( /'([^']*)'\s*=>\s*'([^']*)'/g ) ].map( ( x ) => [ x[ 1 ], x[ 2 ] ] ) ) : null;
}
// The strings of a list assignment (`const NAME = array( 'a', 'b' );` or `$name = array( ... );`); null when absent.
function phpList( src, assign ) {
	const m = new RegExp( `${ assign.replace( /\$/g, '\\$' ) }\\s*=\\s*array\\(([^)]*)\\)` ).exec( src );
	return m ? [ ...m[ 1 ].matchAll( /'([^']*)'/g ) ].map( ( x ) => x[ 1 ] ) : null;
}

test( 'MUST FAIL: VARIESBY_WORDS is exactly map_axis_to_variesby\'s axis map', () => {
	const map = phpMap( phpFunction( read( 'class-product-provisioning.php' ), 'map_axis_to_variesby' ), 'map' );
	assert.ok( map && Object.keys( map ).length, 'map_axis_to_variesby or its $map = array( ... ) was not found in class-product-provisioning.php' );
	assert.deepEqual( VARIESBY_WORDS, map );
} );

test( 'MUST FAIL: VARIESBY_VALUES is exactly Configurator_Meta::VARIESBY_ENUM and the templates validator\'s enum, and every word maps into it', () => {
	const meta = phpList( read( 'class-configurator-meta.php' ), 'const VARIESBY_ENUM' );
	const validators = phpList( read( 'class-product-templates-validators.php' ), '$variesby_enum' );
	assert.ok( meta && validators, 'an enum was not found in the PHP source' );
	assert.deepEqual( [ ...VARIESBY_VALUES ].sort(), [ ...meta ].sort() );
	assert.deepEqual( [ ...VARIESBY_VALUES ].sort(), [ ...validators ].sort() );
	assert.deepEqual( Object.values( VARIESBY_WORDS ).filter( ( v ) => ! VARIESBY_VALUES.includes( v ) ), [] );
} );

test( 'the PHP readers see a divergence: a changed, added or missing pair or value differs', () => {
	const src = "class X {\n\tprivate static function map_axis_to_variesby( string $a ): string {\n\t\t$map = array(\n\t\t\t'size' => 'size',\n\t\t\t'colour' => 'color',\n\t\t);\n\t\treturn '';\n\t}\n\tconst VARIESBY_ENUM = array( 'color', 'size' );\n}\n";
	const map = phpMap( phpFunction( src, 'map_axis_to_variesby' ), 'map' );
	assert.deepEqual( map, { size: 'size', colour: 'color' } );
	assert.notDeepEqual( { size: 'size', colour: 'colour' }, map, 'a changed value' );
	assert.notDeepEqual( { size: 'size', colour: 'color', shade: 'color' }, map, 'an added word' );
	assert.deepEqual( phpList( src, 'const VARIESBY_ENUM' ), [ 'color', 'size' ] );
	assert.equal( phpMap( phpFunction( src, 'no_such_function' ), 'map' ), null, 'a renamed function is reported, not read as empty' );
	assert.equal( phpList( src, '$variesby_enum' ), null );
} );
