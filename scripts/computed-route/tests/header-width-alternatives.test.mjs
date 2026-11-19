// A header's main bar drawn as width alternatives (one bar below a width, another above it) is one row block whose draft element is
// the widest bar; Fill reads the row's layout at each width from the bar the draft shows there, so the row's per-device settings
// follow the phone bar, not only the desktop bar that exists at 1440 (a compact bar's own grid: a burger, a logo and the icons).
// Skeleton side: lib/skeleton-write-slots.mjs::buildHeaderRows records the other bars as the row's `widthAlternatives`. Read side:
// lib/fill-read-alternates.mjs (alternateJobs, mergeAlternates) through lib/fill-read.mjs::readDraft, in a real browser over a
// planted draft. Two shapes (a compact bar plus a desktop bar; a phone, a tablet and a desktop bar) and the bar drawn at every
// width, which has no alternative.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { skeletonProblems, skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { alternateJobs, mergeAlternates } from '../lib/fill-read-alternates.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

// ---- skeleton side: synthetic inventories in the reader's shape ----
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: { x: 0, y: 100, w: 100, h: 20 }, 768: { x: 0, y: 100, w: 100, h: 20 }, 1440: { x: 0, y: 100, w: 100, h: 20 } }, visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
const only = ( e, widths ) => {
	e.visible = { 375: widths.includes( 375 ), 768: widths.includes( 768 ), 1440: widths.includes( 1440 ) };
	e.box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, widths.includes( w ) ? { x: 0, y: 100, w: 100, h: 20 } : { x: 0, y: 0, w: 0, h: 0 } ] ) );
	return e;
};
// One bar: a div holding a nav of two links.
const bar = ( n, widths, words ) => [ only( el( `Root/${ n }#0`, 'Root/1#0', 'div', '', { depth: 1, display: 'grid' } ), widths ), only( el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'nav', '', { depth: 2 } ), widths ), only( el( `Root/${ n + 2 }#0`, `Root/${ n + 1 }#0`, 'a', words[ 0 ], { depth: 3, attrs: { href: `/${ words[ 0 ] }` } } ), widths ), only( el( `Root/${ n + 3 }#0`, `Root/${ n + 1 }#0`, 'a', words[ 1 ], { depth: 3, attrs: { href: `/${ words[ 1 ] }` } } ), widths ) ];
const root = () => el( 'Root/1#0', null, 'header', '', { depth: 0 } );
const inv = ( elements ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements } );
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const middle = ( r ) => r.skeleton[ 0 ].innerBlocks[ 1 ];

test( 'MUST FAIL: a compact bar plus a desktop bar: the row keeps the desktop bar and lists the compact bar with the widths it is drawn at', () => {
	const r = run( [ root(), ...bar( 2, [ 1440 ], [ 'Shop', 'Help' ] ), ...bar( 6, [ 375, 768 ], [ 'Menu', 'Bag' ] ) ] );
	assert.equal( middle( r ).draftRef.tpl, 'Root/2#0' );
	assert.deepEqual( middle( r ).widthAlternatives, [ { key: 'Root/6#0', shown: [ 375, 768 ] } ] );
	assert.deepEqual( skeletonProblems( r.skeleton ), [] );
	const nodes = skeletonNodes( r.skeleton );
	assert.deepEqual( alternateJobs( nodes ).map( ( j ) => [ j.finder.tpl, j.alt.of ] ), [ [ 'Root/6#0', `${ nodes.find( ( n ) => n.node === middle( r ) ).index }:` ] ] );
} );

test( 'MUST FAIL: a phone bar, a tablet bar and a desktop bar: each of the other two is listed', () => {
	const r = run( [ root(), ...bar( 2, [ 1440 ], [ 'Shop', 'Help' ] ), ...bar( 6, [ 768 ], [ 'Menu', 'Bag' ] ), ...bar( 10, [ 375 ], [ 'Open', 'Cart' ] ) ] );
	assert.equal( middle( r ).draftRef.tpl, 'Root/2#0' );
	assert.deepEqual( middle( r ).widthAlternatives.map( ( a ) => [ a.key, a.shown ] ).sort(), [ [ 'Root/10#0', [ 375 ] ], [ 'Root/6#0', [ 768 ] ] ] );
} );

test( 'a bar drawn at every width has no alternative, and the other keys stay what they were', () => {
	const r = run( [ root(), ...bar( 2, [ 375, 768, 1440 ], [ 'Shop', 'Help' ] ) ] );
	assert.equal( middle( r ).draftRef.tpl, 'Root/2#0' );
	assert.equal( middle( r ).widthAlternatives, undefined );
	assert.deepEqual( alternateJobs( skeletonNodes( r.skeleton ) ), [] );
} );

test( 'the alternatives key is a draft key: the block tree Fill writes never carries it', () => {
	const r = run( [ root(), ...bar( 2, [ 1440 ], [ 'Shop', 'Help' ] ), ...bar( 6, [ 375, 768 ], [ 'Menu', 'Bag' ] ) ] );
	assert.ok( ! JSON.stringify( cleanTree( structuredClone( r.skeleton ) ) ).includes( 'widthAlternatives' ) );
} );

test( 'skeletonProblems refuses an alternative that is not a draft key with widths', () => {
	const sk = [ { name: 'sgs/site-header-row', attributes: {}, draftRef: { tpl: 'Root/2#0' }, widthAlternatives: [ { key: 'not a key', shown: [ 375 ] } ] } ];
	assert.ok( skeletonProblems( sk ).some( ( p ) => /widthAlternatives/.test( p ) ) );
	sk[ 0 ].widthAlternatives = [ { key: 'Root/6#0', shown: [] } ];
	assert.ok( skeletonProblems( sk ).some( ( p ) => /widthAlternatives/.test( p ) ) );
	sk[ 0 ].widthAlternatives = [ { key: 'Root/6#0', shown: [ 375 ] } ];
	assert.deepEqual( skeletonProblems( sk ), [] );
} );

// ---- read side: a real browser over a planted draft ----
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 }
.desk { display: grid; grid-template-columns: 200px 1fr 200px; column-gap: 40px; padding: 0 30px }
.comp { display: none; grid-template-columns: 1fr auto 1fr; column-gap: 8px; padding: 0 7px }
@media (max-width: 1023px) { .desk { display: none } .comp { display: grid } }
.alone { display: grid; grid-template-columns: 1fr 1fr; column-gap: 3px }
</style></head><body><div class="sc-host" data-sc-name="Root">
<header><div class="desk" data-dc-tpl="8"><span>One</span><nav>Two</nav><span>Three</span></div><div class="comp" data-dc-tpl="9"><span>A</span><span>B</span><span>C</span></div></header>
<div class="alone" data-dc-tpl="10"><span>x</span><span>y</span></div>
</div></body></html>`;
const TREE = [ { name: 'sgs/site-header-row', draftRef: { tpl: 'Root/8#0' }, widthAlternatives: [ { key: 'Root/9#0', shown: [ 375, 768 ] } ], attributes: {}, innerBlocks: [] },
	{ name: 'sgs/site-header-row', draftRef: { tpl: 'Root/10#0' }, attributes: {}, innerBlocks: [] } ];
let served;
let read;
let plain;
let nodes;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'hdr-alt-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	nodes = skeletonNodes( TREE );
	read = await readDraft( { url: served.url, nodes, headless: true, sweep: true } );
	plain = await readDraft( { url: served.url, nodes: skeletonNodes( [ { ...TREE[ 0 ], widthAlternatives: undefined } ] ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const rootId = ( list, i ) => list[ i ].targets.find( ( t ) => '' === t.slot ).id;
const cols = ( r, w, id ) => r.widths[ w ][ id ]?.styles?.[ 'grid-template-columns' ];

test( 'MUST FAIL: the row reads the compact bar at the widths only it is drawn at, and its own bar at the others', () => {
	const id = rootId( nodes, 0 );
	assert.ok( ! read.widths[ 375 ][ id ].missing, '375 is read from the compact bar' );
	assert.ok( ! read.widths[ 768 ][ id ].missing );
		assert.equal( cols( read, 1440, id ).split( ' ' )[ 0 ], '200px' );
	assert.equal( cols( read, 375, id ).split( ' ' ).length, 3 );
	assert.notEqual( cols( read, 375, id ).split( ' ' )[ 0 ], '200px', 'the phone tier is not the desktop bar\'s tracks' );
	assert.equal( read.widths[ 375 ][ id ].styles[ 'column-gap' ], '8px' );
	assert.equal( read.widths[ 1440 ][ id ].styles[ 'column-gap' ], '40px' );
	assert.equal( read.widths[ 375 ][ id ].styles[ 'padding-left' ], '7px' );
	assert.ok( read.declared[ 375 ][ id ], 'its declared values are the compact bar\'s' );
	assert.match( String( read.declared[ 375 ][ id ][ 'grid-template-columns' ] ), /1fr auto 1fr/ );
	assert.match( String( read.declared[ 1440 ][ id ][ 'grid-template-columns' ] ), /200px/ );
} );

test( 'the alternatives\' own ids are gone from every part of the result', () => {
	const ids = JSON.stringify( [ read.widths, read.declared, read.sweep, read.failures ] );
	assert.ok( ! ids.includes( '>alt:' ), 'an alternative id is left in the read' );
	assert.deepEqual( Object.keys( read.widths[ 375 ] ).sort(), nodes.flatMap( ( n ) => n.targets.map( ( t ) => t.id ) ).sort() );
} );

test( 'the read of the row at 375 and 768 is a drawn grid, where the same row without alternatives reads display none', () => {
	const id = rootId( nodes, 0 );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => read.widths[ w ][ id ].styles.display ), [ 'grid', 'grid', 'grid' ] );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => plain.widths[ w ][ id ].styles.display ), [ 'none', 'none', 'grid' ] );
} );

test( 'negative controls: the same row with no alternatives still reads its own hidden bar at 375, and a bar drawn at every width is read as before', () => {
	const id = rootId( skeletonNodes( [ { ...TREE[ 0 ], widthAlternatives: undefined } ] ), 0 );
	assert.notEqual( plain.widths[ 375 ][ id ].styles[ 'column-gap' ], '8px', 'the compact gap is read only with the alternative' );
	assert.equal( plain.widths[ 375 ][ id ].styles.display, 'none' );
	const alone = rootId( nodes, 1 );
	assert.equal( cols( read, 375, alone ).split( ' ' ).length, 2 );
	assert.equal( read.widths[ 375 ][ alone ].styles[ 'column-gap' ], '3px' );
} );

test( 'mergeAlternates takes the alternative at the widths the root is missing only, and carries declared values and the swept series', () => {
	const job = { id: '0:>alt:0', alt: { of: '0:' } };
	const result = {
		widths: { 375: { '0:': { styles: { display: 'none' } }, '0:>alt:0': { styles: { a: 'compact' } } }, 1440: { '0:': { styles: { a: 'desk' } }, '0:>alt:0': { styles: { a: 'compact-at-1440' } } } },
		declared: { 375: { '0:>alt:0': { a: 'dc' } }, 1440: { '0:': { a: 'dd' } } }, declaredWritten: {}, states: {}, failures: [ { id: '0:>alt:0', owner: 0 } ],
		sweep: { '0:': { '(rendered)': [ { width: 600, value: 'absent' }, { width: 1200, value: 'present' } ], a: [ { width: 600, value: undefined }, { width: 1200, value: 'desk' } ] }, '0:>alt:0': { '(rendered)': [ { width: 600, value: 'present' }, { width: 1200, value: 'present' } ], a: [ { width: 600, value: 'compact' }, { width: 1200, value: 'compact-at-1200' } ] } },
	};
	mergeAlternates( result, [ job ] );
	assert.equal( result.widths[ 375 ][ '0:' ].styles.a, 'compact' );
	assert.equal( result.widths[ 1440 ][ '0:' ].styles.a, 'desk', 'a width the root is drawn at keeps the root\'s own read' );
	assert.deepEqual( result.declared[ 375 ][ '0:' ], { a: 'dc' } );
	assert.deepEqual( result.declared[ 1440 ][ '0:' ], { a: 'dd' } );
	assert.deepEqual( result.sweep[ '0:' ][ '(rendered)' ].map( ( e ) => e.value ), [ 'present', 'present' ] );
	assert.deepEqual( result.sweep[ '0:' ].a.map( ( e ) => e.value ), [ 'compact', 'desk' ] );
	assert.deepEqual( result.failures, [ { id: '0:', owner: 0 } ] );
	assert.ok( ! JSON.stringify( result ).includes( '>alt:' ) );
} );
