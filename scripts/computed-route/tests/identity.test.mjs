// Route-accuracy R4: exact draft identity. A committed tree's origin comes from the skeleton writer's fresh draft links
// aligned by structure (never from word pairs); the word matcher's element agrees with the identity element only when
// it is that element or a wrapper with its box. The 2026-10-09 header case: the word matcher paired the live header
// root with the draft's inner row, a smaller element inside it, and Solve wrote three wrong settings through it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { alignByName, originFromSkeleton, identityAgrees, mispairWhy } from '../lib/identity.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const BUILD = path.resolve( HERE, '../../../sites/eye-care-ward-end/build' );
const read = ( f ) => JSON.parse( fs.readFileSync( path.join( BUILD, f ), 'utf8' ) );

test( 'alignByName keeps order and skips a block the other side lacks', () => {
	assert.deepEqual( alignByName( [ 'a', 'b', 'c' ], [ 'a', 'x', 'c' ] ), [ [ 0, 0 ], [ 2, 2 ] ] );
	assert.deepEqual( alignByName( [ 'h', 'l' ], [ 'h', 'l', 'l' ] ), [ [ 0, 0 ], [ 1, 1 ] ] );
} );

test( 'the committed footer aligns with its skeleton by structure; a different block or a non-tpl finder is listed, never guessed', () => {
	const { origin, unaligned } = originFromSkeleton( read( 'skeleton/footer.skeleton.json' ), read( 'footer.tree.json' ) );
	assert.equal( origin[ 'cr-ref-footer-0' ].tpl, 'Root/844#0' );
	assert.equal( origin[ 'cr-ref-footer-9' ].tpl, 'Root/872#0' );
	const why = Object.fromEntries( unaligned.map( ( u ) => [ u.ref, u.why ] ) );
	assert.match( why[ 'cr-ref-footer-30' ], /no skeleton node of the same block/ );
	assert.match( why[ 'cr-ref-footer-6' ], /names no tpl finder/ );
	assert.ok( ! origin[ 'cr-ref-footer-30' ] && ! origin[ 'cr-ref-footer-6' ] );
} );

test( 'MUST FAIL (2026-10-09 header: the live root paired with the draft inner row): a word element of another box disagrees with the identity element', () => {
	const r = { tpl: 'Root/4#0', relation: 'id-contains', idBox: { w: 1440, h: 72 }, wordBox: { w: 1200, h: 60 }, idTag: 'header', wordTag: 'div' };
	assert.equal( identityAgrees( r ), false );
	assert.equal( identityAgrees( { ...r, relation: 'apart' } ), false );
	assert.match( mispairWhy( r ), /identity Root\/4#0 is <header> 1440x72; the words chose <div> 1200x60 \(id-contains\)/ );
} );

test( 'negative control: the same element, or a wrapper with the same box, agrees', () => {
	assert.equal( identityAgrees( { relation: 'same', idBox: { w: 10, h: 10 }, wordBox: { w: 10, h: 10 } } ), true );
	assert.equal( identityAgrees( { relation: 'word-contains', idBox: { w: 300, h: 40 }, wordBox: { w: 301, h: 40 } } ), true );
} );

test( 'two zero-size elements never agree (an element not shown proves no pairing)', () => {
	assert.equal( identityAgrees( { relation: 'word-contains', idBox: { w: 0, h: 0 }, wordBox: { w: 0, h: 0 } } ), false );
} );
