// The hovered read of located draft parts (lib/part-look-hover.mjs). The browser half (the pointer on the element, the computed read)
// is proved on the live draft by the lab run; here the pure half is: an instance key becomes the selector of its element, and each
// located instance gains its hovered look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectorOfKey, readHover } from '../lib/part-look-hover.mjs';

test( 'MUST FAIL: an instance key is the selector of its element, from the body down', () => {
	assert.equal( selectorOfKey( 'div:0>main:2>button:1' ), 'body > div:nth-child(1) > main:nth-child(3) > button:nth-child(2)' );
	assert.equal( selectorOfKey( 'button:0' ), 'body > button:nth-child(1)' );
} );

test( 'a key that is not tag:index steps gives no selector (negative control)', () => {
	assert.equal( selectorOfKey( '' ), null );
	assert.equal( selectorOfKey( 'div:0>#text' ), null );
	assert.equal( selectorOfKey( 'div:x' ), null );
} );

test( 'MUST FAIL: each instance gains its hovered look and its resting transform; an element the pointer cannot reach keeps none', async () => {
	const evaluated = [];
	const page = {
		evaluate: async ( fn, [ selector, props ] ) => ( evaluated.push( [ selector, props ] ), 'transform' === props[ 0 ] && 1 === props.length ? { transform: 'none' } : { 'background-color': 'rgb(42, 42, 42)' } ),
		locator: ( selector ) => ( { first: () => ( { hover: async () => {
			if ( selector.includes( 'button:nth-child(9)' ) ) {
				throw new Error( 'element is covered' );
			}
		} } ) } ),
		waitForTimeout: async () => {},
		mouse: { move: async () => {} },
	};
	const found = { 'flow-opener': [ { key: 'div:0>button:0', styles: {} }, { key: 'div:0>button:8', styles: {} } ] };
	const logged = [];
	await readHover( { page, found, parts: [ 'flow-opener' ], settleMs: 0, log: ( m ) => logged.push( m ) } );
	assert.equal( found[ 'flow-opener' ][ 0 ].hover[ 'background-color' ], 'rgb(42, 42, 42)' );
	assert.equal( found[ 'flow-opener' ][ 0 ].styles.transform, 'none' );
	assert.equal( found[ 'flow-opener' ][ 1 ].hover, undefined );
	assert.match( logged.join( '\n' ), /not read: element is covered/ );
} );
