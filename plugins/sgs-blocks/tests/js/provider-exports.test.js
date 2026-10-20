/**
 * Every name the Tier G provider (`@sgs/motion-provider`) re-exports resolves to a function.
 *
 * Effects import their helpers only from the provider, so a re-export whose source module never exports the name
 * reaches the effect as `undefined` and throws when called (the image-sequence pin reads `chromeOffsetPx()`). The
 * names are read from the provider's own `export { … } from` lists, so a new re-export is covered too.
 */

/* global jest, describe, test, expect */

const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( 'gsap', () => ( {
	gsap: { defaults: jest.fn(), registerPlugin: jest.fn() },
} ) );

const SOURCE = path.join( __dirname, '..', '..', 'src', 'shared', 'effects', 'gsap', 'provider.js' );
const provider = require( SOURCE );

/**
 * @param {string} src Module source.
 * @return {string[]} Every name in its `export { … } from '…'` lists.
 */
function reexported( src ) {
	const names = [];
	for ( const m of src.matchAll( /export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g ) ) {
		names.push( ...m[ 1 ].split( ',' ).map( ( n ) => n.trim().split( /\s+as\s+/ ).pop() ).filter( Boolean ) );
	}
	return names;
}

describe( 'the motion provider re-exports', () => {
	test( 'each re-exported name is a function', () => {
		const names = reexported( fs.readFileSync( SOURCE, 'utf8' ) );
		expect( names ).toContain( 'chromeOffsetPx' );
		expect( names.filter( ( n ) => 'function' !== typeof provider[ n ] ) ).toEqual( [] );
	} );

	test( 'negative control: a re-export list is read from source', () => {
		expect( reexported( "export { a, b as c } from './x.js';" ) ).toEqual( [ 'a', 'c' ] );
	} );
} );
