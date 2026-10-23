// Identity pairing (Spec 48 FR-48-10, register W7 and W8). W7: a header block whose draft element is the <header>
// holding the main bar only, while the top bar sits beside it, was paired with that element and every box, gap and
// ground row compared the main bar with the whole header. W8: a width variant written as its own block shared the
// default's draft element, and both pairs ran at every width, so each compared the draft element with a hidden block.
// FR-48-10: a list block's identity was its first link; a word-based width refusal removed an identity pair; an origin
// from an earlier export was trusted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { fingerprintHolds, childrenOutside, listIdentity, identityAdd, originFromSkeleton } from '../lib/identity.mjs';
import { skeletonPairs, tplSelector, variantScope } from '../lib/origin-pairs.mjs';
import { draftHashOf, stampOrigin, originVerdict, readOrigin } from '../lib/origin-file.mjs';
import { walkerPairs } from '../lib/fill-config.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const fp = ( tag, parentTags ) => ( { tag, cls: '', parentTags } );

// A header whose draft <header> holds the main bar only; the top bar is its sibling. The top bar's two pills share one
// draft element, the second a width variant whose words element is tpl 18.
const HEADER = () => [ { name: 'sgs/site-header', draftRef: { tpl: 'Root/39#0' }, draftFingerprint: fp( 'header', [] ), attributes: {}, innerBlocks: [
	{ name: 'sgs/site-header-row', draftRef: { tpl: 'Root/9#0' }, draftFingerprint: fp( 'div', [] ), attributes: {}, innerBlocks: [
		{ name: 'sgs/button', draftRef: { tpl: 'Root/14#0' }, draftFingerprint: fp( 'a', [ 'div' ] ), widthVariants: [ { key: 'Root/18#0', shown: [ 375 ] } ], attributes: {} },
		{ name: 'sgs/button', draftRef: { tpl: 'Root/14#0' }, draftFingerprint: fp( 'a', [ 'div' ] ), variantKey: 'Root/18#0', widthShown: [ 375 ], attributes: {} },
	] },
	{ name: 'sgs/site-header-row', draftRef: { tpl: 'Root/40#0' }, draftFingerprint: fp( 'div', [ 'header' ] ), attributes: {} },
] } ];
const prepared = () => {
	const skeleton = HEADER();
	const tree = cleanTree( skeleton );
	addRefs( tree, 'hd' );
	return { skeleton, nodes: skeletonNodes( skeleton ), tree };
};

test( 'MUST FAIL (W7): a child whose stamped ancestors do not run through the parent is outside it; no parentTags proves nothing', () => {
	assert.equal( fingerprintHolds( fp( 'header', [] ), fp( 'div', [] ) ), false );
	assert.equal( fingerprintHolds( fp( 'header', [] ), fp( 'div', [ 'header' ] ) ), true );
	assert.equal( fingerprintHolds( fp( 'div', [ 'header' ] ), fp( 'a', [ 'header', 'div', 'div' ] ) ), true );
	assert.equal( fingerprintHolds( fp( 'div', [ 'main' ] ), fp( 'a', [ 'header', 'div' ] ) ), false );
	assert.equal( fingerprintHolds( { tag: 'header' }, fp( 'div', [] ) ), true );
	assert.deepEqual( childrenOutside( HEADER()[ 0 ] ), [ { name: 'sgs/site-header-row', tag: 'div' } ] );
} );

test( 'MUST FAIL (W7): the walker pairs leave out a block whose draft element does not hold its children, and keep the rest', () => {
	const { nodes, tree } = prepared();
	const refs = [];
	const go = ( list ) => list.forEach( ( n ) => {
		refs.push( n.attributes?.className?.match( /cr-ref-\S+/ )?.[ 0 ] );
		go( n.innerBlocks || [] );
	} );
	go( tree );
	const out = skeletonPairs( nodes, refs );
	assert.deepEqual( out.left.map( ( l ) => l.ref ), [ 'cr-ref-hd-0' ] );
	assert.match( out.left[ 0 ].why, /<header> does not hold its child sgs\/site-header-row <div>/ );
	assert.deepEqual( out.pairs.map( ( p ) => p.ref ), [ 'cr-ref-hd-1', 'cr-ref-hd-2', 'cr-ref-hd-3', 'cr-ref-hd-4' ] );
	// Fill's walker config takes the same pairs.
	assert.deepEqual( walkerPairs( nodes, tree ), out.pairs );
} );

test( 'MUST FAIL (W8): a width variant and its default sharing one draft element each resolve only while their own words render', () => {
	const { nodes, tree } = prepared();
	const [ , def, variant ] = walkerPairs( nodes, tree );
	const at = tplSelector( 'Root/14#0' );
	const words = '[data-dc-tpl="18"]:not(.sc-host .sc-host *)';
	assert.equal( at, '.sc-host[data-sc-name="Root"] [data-dc-tpl="14"]:not(.sc-host .sc-host *)' );
	assert.deepEqual( variant.draft, { tpl: 'Root/14#0', within: `${ at }:has(${ words })` } );
	assert.deepEqual( def.draft, { tpl: 'Root/14#0', within: `${ at }:not(:has(${ words }))` } );
	assert.equal( variantScope( 'a.pill', 'Root/18#0' ), `:is(a.pill):has(${ words })` );
} );

test( 'MUST FAIL (W8): a key no selector can name alone stays unscoped and is reported', () => {
	assert.equal( tplSelector( 'Root/14#1' ), null );
	assert.equal( tplSelector( 'Root>Card@7#1/14#0' ), null );
	assert.equal( tplSelector( 'Root>Card@7#0/14#0' ), '.sc-host[data-sc-name="Root"] .sc-host[data-sc-name="Card"][data-dc-tpl="7"] [data-dc-tpl="14"]:not(.sc-host .sc-host .sc-host *)' );
	assert.equal( variantScope( { tpl: 'Root/14#0' }, 'Root>Card@7#0/18#0' ), null );
	const nodes = skeletonNodes( [ { name: 'sgs/button', draftRef: { tpl: 'Root/14#2' }, variantKey: 'Root/18#2', attributes: {} } ] );
	const out = skeletonPairs( nodes, [ 'cr-ref-x-0' ] );
	assert.deepEqual( out.pairs, [ { ref: 'cr-ref-x-0', draft: { tpl: 'Root/14#2' } } ] );
	assert.equal( out.unscoped.length, 1 );
} );

// An inventory: a list column (tpl 70) holding a heading and three links; a loop parent (tpl 80) holding only the sc-for
// copies of its link (tpl 81); a button row (tpl 90) whose three links each have a node.
const loop = [ { kind: 'sc-for', list: '{{ links }}', as: 'l', tpl: '85' } ];
const rec = ( key, parentKey, tag, membership = [] ) => ( { key, parentKey, tag, membership } );
const BY_KEY = Object.fromEntries( [
	rec( 'Root/70#0', 'Root/1#0', 'div' ), rec( 'Root/71#0', 'Root/70#0', 'span' ), rec( 'Root/72#0', 'Root/70#0', 'a' ), rec( 'Root/73#0', 'Root/70#0', 'a' ), rec( 'Root/74#0', 'Root/70#0', 'a' ),
	rec( 'Root/80#0', 'Root/1#0', 'ul' ), rec( 'Root/81#0', 'Root/80#0', 'li', loop ), rec( 'Root/82#0', 'Root/81#0', 'a', loop ), rec( 'Root/81#1', 'Root/80#0', 'li', loop ), rec( 'Root/82#1', 'Root/81#1', 'a', loop ),
	rec( 'Root/90#0', 'Root/1#0', 'div' ), rec( 'Root/91#0', 'Root/90#0', 'a' ), rec( 'Root/92#0', 'Root/90#0', 'a' ),
].map( ( r ) => [ r.key, r ] ) );

test( 'MUST FAIL (FR-48-10.1): a list block pairs on its sc-for loop\'s parent, never on its first link', () => {
	assert.deepEqual( listIdentity( 'Root/82#0', BY_KEY ), { key: 'Root/80#0' } );
	assert.deepEqual( listIdentity( 'Root/81#0', BY_KEY ), { key: 'Root/80#0' } );
	const mixed = listIdentity( 'Root/72#0', BY_KEY );
	assert.equal( mixed.key, null );
	assert.match( mixed.why, /also holds other content/ );
	assert.match( listIdentity( 'Root/82#0', BY_KEY, new Set( [ 'Root/80#0' ] ) ).why, /another block's identity/ );
	// Links that each have a node of their own are not one list's items.
	assert.equal( listIdentity( 'Root/91#0', BY_KEY, new Set( [ 'Root/92#0' ] ) ), null );
} );

test( 'MUST FAIL (FR-48-10.1): the origin gives a list block its run\'s parent, a non-list block keeps its element', () => {
	const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
		{ name: 'sgs/icon-list', draftRef: { tpl: 'Root/82#0' }, draftFingerprint: fp( 'a', [] ) },
		{ name: 'sgs/icon-list', draftRef: { tpl: 'Root/72#0' }, draftFingerprint: fp( 'a', [] ) },
		{ name: 'sgs/button', draftRef: { tpl: 'Root/91#0' }, draftFingerprint: fp( 'a', [] ) },
	] } ];
	const tree = [ { name: 'sgs/container', attributes: { className: 'cr-ref-f-0' }, innerBlocks: [
		{ name: 'sgs/icon-list', attributes: { className: 'cr-ref-f-1' } },
		{ name: 'sgs/icon-list', attributes: { className: 'cr-ref-f-2' } },
		{ name: 'sgs/button', attributes: { className: 'cr-ref-f-3' } },
	] } ];
	const { origin, unaligned } = originFromSkeleton( skeleton, tree, { inventory: { elements: Object.values( BY_KEY ) }, listBlocks: new Set( [ 'sgs/icon-list' ] ) } );
	assert.equal( origin[ 'cr-ref-f-1' ].tpl, 'Root/80#0' );
	assert.equal( origin[ 'cr-ref-f-2' ], undefined );
	assert.match( unaligned.find( ( u ) => 'cr-ref-f-2' === u.ref ).why, /no draft element of its own/ );
	assert.equal( origin[ 'cr-ref-f-3' ].tpl, 'Root/91#0' );
} );

test( 'MUST FAIL (W7): the origin gives no identity to a block whose draft element does not hold its children', () => {
	const tree = cleanTree( HEADER() );
	addRefs( tree, 'hd' );
	const { origin, unaligned } = originFromSkeleton( HEADER(), tree );
	assert.equal( origin[ 'cr-ref-hd-0' ], undefined );
	assert.match( unaligned.find( ( u ) => 'cr-ref-hd-0' === u.ref ).why, /does not hold its child/ );
	assert.equal( origin[ 'cr-ref-hd-4' ].tpl, 'Root/40#0' );
} );

test( 'MUST FAIL (FR-48-10.2): a word-based width refusal never removes an identity pair, it is kept as a cross-check', () => {
	assert.deepEqual( identityAdd( { wordRefusal: 'no partner at 375' } ), { add: true, crossCheck: 'no partner at 375' } );
	assert.deepEqual( identityAdd( { wordRefusal: 'its width is 40px on the draft against 300px live' } ), { add: true, crossCheck: 'its width is 40px on the draft against 300px live' } );
	assert.equal( identityAdd( { hand: true } ).add, false );
	assert.equal( identityAdd( { covered: true } ).add, false );
	assert.equal( identityAdd( { add: false } ).add, false );
	const src = fs.readFileSync( path.join( HERE, '../pairs.mjs' ), 'utf8' );
	const pass = src.slice( src.indexOf( 'export async function identityPass' ), src.indexOf( 'if ( process.argv[ 1 ]' ) );
	assert.match( pass, /identityAdd\( \{ add, hand: /, 'identityPass decides each added identity pair through identityAdd' );
	assert.doesNotMatch( pass, /no partner at/, 'identityPass reads no word refusal as a reason to drop' );
} );

const MANIFEST = ( sha ) => ( { files: [ { path: 'Site.dc.html', sha256: sha }, { path: 'README.md', sha256: 'r' } ] } );

test( 'MUST FAIL (FR-48-10.3): an origin from an earlier export is refused against the current MANIFEST.json', () => {
	const now = draftHashOf( MANIFEST( 'b' ) );
	assert.notEqual( draftHashOf( MANIFEST( 'a' ) ), now );
	assert.equal( draftHashOf( { files: [ { path: 'Site.dc.html', sha256: 'b' }, { path: 'README.md', sha256: 'changed' } ] } ), now );
	const origin = { 'cr-ref-x-0': { tpl: 'Root/1#0', fingerprint: null } };
	assert.equal( originVerdict( stampOrigin( origin, draftHashOf( MANIFEST( 'a' ) ) ), now ).ok, false );
	assert.deepEqual( originVerdict( stampOrigin( origin, now ), now ), { ok: true, stamped: true, why: null } );
	assert.equal( originVerdict( origin, now ).ok, true );
	assert.equal( originVerdict( origin, now ).stamped, false );
	assert.equal( originVerdict( stampOrigin( origin, now ), null ).ok, false );
	assert.deepEqual( origin, { 'cr-ref-x-0': { tpl: 'Root/1#0', fingerprint: null } } );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'origin-file-' ) );
	fs.writeFileSync( path.join( dir, 'MANIFEST.json' ), JSON.stringify( MANIFEST( 'b' ) ) );
	fs.writeFileSync( path.join( dir, 'old.origin.json' ), JSON.stringify( stampOrigin( origin, draftHashOf( MANIFEST( 'a' ) ) ) ) );
	fs.writeFileSync( path.join( dir, 'new.origin.json' ), JSON.stringify( stampOrigin( origin, now ) ) );
	assert.throws( () => readOrigin( path.join( dir, 'old.origin.json' ), path.join( dir, 'MANIFEST.json' ) ), /another export/ );
	assert.equal( readOrigin( path.join( dir, 'new.origin.json' ), path.join( dir, 'MANIFEST.json' ) ).origin[ 'cr-ref-x-0' ].tpl, 'Root/1#0' );
	fs.rmSync( dir, { recursive: true, force: true } );
	const src = fs.readFileSync( path.join( HERE, '../pairs.mjs' ), 'utf8' );
	assert.match( src, /readOrigin\( originFile, / , 'pairs.mjs reads the origin through readOrigin' );
	assert.match( fs.readFileSync( path.join( HERE, '../origin.mjs' ), 'utf8' ), /stampOrigin\( origin, hash \)/, 'origin.mjs stamps what it writes' );
} );
