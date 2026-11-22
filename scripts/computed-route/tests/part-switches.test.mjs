// The guard over data/part-switches.json: every entry names things that exist. The switch is a boolean attribute of the block,
// the look element a supports.sgs.elements entry of its block.json that maps settings and whose selector is the entry's
// lookSelector, and both selectors are classes the block's PHP prints (render.php and the files it requires). A switch the block
// lost or renamed fails here, never silently in a clone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { allSwitches, switchesFor, switchAttributes } from '../lib/skeleton-part-switch.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const BLOCKS = path.join( REPO, 'plugins/sgs-blocks/src/blocks' );
const PLUGIN = path.join( REPO, 'plugins/sgs-blocks' );

// The PHP the block prints with: render.php and, transitively, every file it requires (`__DIR__ . '/x.php'`, `dirname( __DIR__, n ) . '/x.php'`).
function phpOf( dir ) {
	const seen = new Set();
	const read = ( file ) => {
		if ( seen.has( file ) || ! fs.existsSync( file ) ) {
			return;
		}
		seen.add( file );
		const text = fs.readFileSync( file, 'utf8' );
		for ( const m of text.matchAll( /(?:require|include)(?:_once)?\s*\(?\s*(?:dirname\(\s*__DIR__\s*(?:,\s*(\d+))?\s*\)|__DIR__)\s*\.\s*'([^']+)'/g ) ) {
			let from = path.dirname( file );
			for ( let i = 0; m[ 0 ].includes( 'dirname' ) && i < Number( m[ 1 ] ?? 1 ); i++ ) {
				from = path.dirname( from );
			}
			read( path.join( from, m[ 2 ] ) );
		}
	};
	read( path.join( dir, 'render.php' ) );
	return [ ...seen ].map( ( f ) => fs.readFileSync( f, 'utf8' ) ).join( '\n' );
}

test( 'part-switches.json: every entry names a boolean attribute, a look element and selectors the block has and prints', () => {
	const list = allSwitches();
	assert.ok( list.length >= 1, 'the file lists at least one switch' );
	for ( const sw of list ) {
		const where = `${ sw.block } ${ sw.switch }`;
		const dir = path.join( BLOCKS, sw.block.replace( /^sgs\//, '' ) );
		const json = JSON.parse( fs.readFileSync( path.join( dir, 'block.json' ), 'utf8' ) );
		assert.equal( json.name, sw.block, `${ where }: the block.json is the block's` );
		assert.equal( json.attributes?.[ sw.switch ]?.type, 'boolean', `${ where }: the switch is a boolean attribute` );
		assert.equal( typeof sw.value, 'boolean', `${ where }: the value that turns it on is a boolean` );
		const element = json.supports?.sgs?.elements?.[ sw.lookElement ];
		assert.ok( element, `${ where }: ${ sw.lookElement } is an element of supports.sgs.elements` );
		assert.equal( element.selector, sw.lookSelector, `${ where }: the look element's selector` );
		const mapped = Object.values( element.attrMap ?? {} );
		assert.ok( mapped.length > 0 && mapped.every( ( a ) => json.attributes[ a ] ), `${ where }: the look element maps settings the block has` );
		const php = phpOf( dir );
		for ( const sel of [ sw.lookSelector, sw.targetSelector ] ) {
			assert.match( sel, /^\.[\w-]+$/, `${ where }: ${ sel } is one class` );
			assert.ok( php.includes( sel.slice( 1 ) ), `${ where }: the block's PHP prints ${ sel }` );
		}
		assert.ok( php.includes( sw.switch ), `${ where }: the block's PHP reads the switch` );
	}
} );

test( 'switchesFor and switchAttributes: a block\'s switches, and the attribute a pairing that used one sets', () => {
	assert.deepEqual( switchesFor( 'sgs/nav-drawer-menu' ).map( ( s ) => s.switch ), [ 'caretBoxOnTrailingIcon' ] );
	assert.deepEqual( switchesFor( 'sgs/container' ), [], 'a block with no switch has none' );
	assert.deepEqual( switchAttributes( { switches: [ { switch: 'a', value: true }, { switch: 'a', value: true } ] } ), { a: true } );
	assert.deepEqual( switchAttributes( null ), {} );
	assert.deepEqual( switchAttributes( { switches: [] } ), {} );
} );
