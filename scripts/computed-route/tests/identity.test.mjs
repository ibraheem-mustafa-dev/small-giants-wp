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

// QC council findings 1 to 3 on R4 (2026-10-10).
import { innerVerdicts, fingerprintAgrees, unalignedRefs, identityStates } from '../lib/identity.mjs';

test( 'MUST FAIL (council 1): a hand pair inside a block whose draft element lies outside that block\'s identity element is mispaired', () => {
	const handInner = [ { name: 'header-nav-link', ref: 'cr-ref-header-9', draft: '.nav a' } ];
	const rel = [ { ref: 'cr-ref-header-9', tpl: 'Root/40#0', inner: [ { name: 'header-nav-link', resolved: true, inside: false } ] } ];
	const out = innerVerdicts( { handInner, origin: { 'cr-ref-header-9': { tpl: 'Root/40#0' } }, rel } );
	assert.deepEqual( out.mispaired.map( ( m ) => m.ref ), [ 'cr-ref-header-9' ] );
	assert.match( out.mispaired[ 0 ].why, /header-nav-link/ );
} );

test( 'negative control (council 1): an inner hand pair inside the identity element agrees; one on a block with no origin entry is unchecked, never mispaired', () => {
	const handInner = [ { name: 'in', ref: 'cr-ref-header-9', draft: '.a' }, { name: 'orphan', ref: 'cr-ref-header-12', draft: '.b' } ];
	const rel = [ { ref: 'cr-ref-header-9', tpl: 'Root/40#0', inner: [ { name: 'in', resolved: true, inside: true } ] } ];
	const out = innerVerdicts( { handInner, origin: { 'cr-ref-header-9': { tpl: 'Root/40#0' } }, rel } );
	assert.deepEqual( out.mispaired, [] );
	assert.deepEqual( out.uncheckedHand.map( ( u ) => [ u.name, u.ref ] ), [ [ 'orphan', 'cr-ref-header-12' ] ] );
} );

test( 'an inner hand pair whose draft finder resolves to nothing is unchecked, not agreeing', () => {
	const rel = [ { ref: 'r', tpl: 'Root/1#0', inner: [ { name: 'gone', resolved: false, inside: false } ] } ];
	const out = innerVerdicts( { handInner: [ { name: 'gone', ref: 'r', draft: '.x' } ], origin: { r: { tpl: 'Root/1#0' } }, rel } );
	assert.deepEqual( out.mispaired, [] );
	assert.equal( out.uncheckedHand[ 0 ].name, 'gone' );
} );

test( 'MUST FAIL (council 2): an identity element whose tag differs from the skeleton fingerprint is not trusted', () => {
	assert.equal( fingerprintAgrees( { tag: 'header' }, 'div' ), false );
	assert.equal( fingerprintAgrees( { tag: 'header' }, 'header' ), true );
	assert.equal( fingerprintAgrees( null, 'div' ), true );
} );

test( 'MUST FAIL (council 2): a live block with no origin entry is reported unaligned', () => {
	assert.deepEqual( unalignedRefs( [ 'cr-ref-header-1', 'cr-ref-header-2', 'cr-ref-header-3' ], { 'cr-ref-header-1': {}, 'cr-ref-header-3': {} } ), [ 'cr-ref-header-2' ] );
} );

test( 'MUST FAIL (council 3): identity is checked in every pairing state on that state\'s pairs, and adds blocks only in the first', () => {
	const kept = [ { ref: 'a' }, { ref: 'b', scope: 'tab-details' }, { ref: 'c', scope: 'tab-sizing' } ];
	const runs = [ { state: null, scope: null }, { state: { name: 'tab-details' }, scope: 'tab-details' }, { state: { name: 'tab-sizing' }, scope: 'tab-sizing' } ];
	const plan = identityStates( runs, kept );
	assert.equal( plan.length, 3 );
	assert.deepEqual( plan.map( ( p ) => p.kept.map( ( k ) => k.ref ) ), [ [ 'a' ], [ 'b' ], [ 'c' ] ] );
	assert.deepEqual( plan.map( ( p ) => p.add ), [ true, false, false ] );
	assert.ok( plan[ 1 ].kept[ 0 ] === kept[ 1 ] );
} );
