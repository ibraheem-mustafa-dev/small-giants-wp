// The footer's grid of link groups held one wrapper down (Spec 48 §3.4, rules.footerSlots): Mama's real footer draft has
// three bands, an Instagram section (its padding insets the photo strip, whose bleed margin reaches the screen edge), a
// marquee and a section whose only child is a centring width wrapper holding the link columns side by side. The section
// holding the grid is the columns row; the bands above it are the top row, each keeping its own draft element, so the
// Instagram section's padding is read and the strip's bleed stays inside the page. Tests marked MUST FAIL fail before an
// element whose only in-flow child holds the grid is read as that grid's holder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { footerPlan } from '../lib/skeleton-footer-slots.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const INV = JSON.parse( fs.readFileSync( path.join( REPO, 'sites/mamas-munches-redesign/build/skeleton/footer.inventory.json' ), 'utf8' ) );
const K = ( n ) => `Root>SiteFooter@250#0/${ n }#0`;
const planOf = ( inventory ) => {
	const m = inventoryModel( inventory );
	const subtree = ( x ) => [ x, ...m.blockKids( x ).flatMap( subtree ) ];
	const p = footerPlan( m.blockKids( m.root ), { subtree, kidsOf: m.blockKids } );
	return { mode: p.mode, top: p.top.map( ( x ) => x.key ), columns: p.columns.map( ( x ) => x.key ), bottom: p.bottom.map( ( x ) => x.key ) };
};
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );

test( 'MUST FAIL: the section whose width wrapper holds the link columns is the columns row; the bands above it are the top row', () => {
	assert.deepEqual( planOf( INV ), { mode: 'grid', top: [ K( 3 ), K( 18 ) ], columns: [ K( 19 ) ], bottom: [] } );
} );

test( 'MUST FAIL: every band keeps its draft element, so the Instagram section\'s padding is read around the photo strip', () => {
	const facts = loadFacts( { db, client: 'mamas-munches-redesign', repo: REPO, siteName: 'Acme' } );
	const { skeleton } = proposeSkeleton( { inventory: INV, facts, surface: 'footer', surfaceKind: 'footer', surfaceName: 'Footer', db } );
	const rows = skeleton[ 0 ].innerBlocks;
	assert.deepEqual( rows.map( ( r ) => r.attributes.rowSlot ), [ 'top', 'columns', 'bottom' ] );
	const all = flat( skeleton );
	for ( const n of [ 3, 18, 19 ] ) {
		assert.ok( all.some( ( x ) => x.draftRef?.tpl === K( n ) ), `${ K( n ) } is a node read from its own draft element` );
	}
	const section = all.find( ( x ) => x.draftRef?.tpl === K( 3 ) );
	assert.ok( flat( section.innerBlocks ).some( ( x ) => x.draftRef?.tpl === K( 14 ) ), 'the photo strip sits inside the Instagram section' );
	assert.equal( rows[ 1 ].draftRef?.tpl, K( 19 ), 'the columns row is the section holding the grid' );
} );

test( 'negative control: a wrapper holding one band that is no grid is still no grid; a footer with no grid keeps every band in the columns row', () => {
	// With every element inside the main band stacked under the last (no two side by side), no grid exists anywhere.
	let y = 0;
	const inMain = ( e ) => !! e && ( K( 20 ) === e.parentKey || inMain( INV.elements.find( ( p ) => p.key === e.parentKey ) ) );
	const stacked = INV.elements.map( ( e ) => ( inMain( e ) ? { ...e, box: Object.fromEntries( Object.entries( e.box ).map( ( [ w, b ] ) => [ w, b && { ...b, x: 0, y: ( y += 1000 ), w: 100 } ] ) ) } : e ) );
	const p = planOf( { ...INV, elements: stacked } );
	assert.equal( p.mode, 'none' );
	assert.deepEqual( p.columns, [ K( 3 ), K( 18 ), K( 19 ) ] );
} );

test( 'MUST FAIL: a band holding the grid as its only child is its holder; a band whose children sit side by side (the grid beside a text block) is not', () => {
	const b = ( x, y, w, h ) => ( { 375: { x, y, w, h }, 768: { x, y, w, h }, 1440: { x, y, w, h } } );
	const vis = { 375: true, 768: true, 1440: true };
	const el = ( n, parent, tag, words, box, attrs = {} ) => ( { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: 0, tag, attrs, words, allText: words, box, visible: vis } );
	const els = [
		el( 1, null, 'footer', '', b( 0, 0, 1000, 400 ) ),
		el( 2, 1, 'div', '', b( 0, 0, 1000, 300 ) ),
		el( 3, 2, 'div', '', b( 0, 0, 600, 300 ) ),
		el( 4, 3, 'div', '', b( 0, 0, 200, 300 ) ), el( 5, 4, 'h4', 'Shop', b( 0, 0, 200, 20 ) ), el( 6, 4, 'a', 'Cakes', b( 0, 30, 200, 20 ), { href: '/cakes' } ),
		el( 7, 3, 'div', '', b( 300, 0, 200, 300 ) ), el( 8, 7, 'h4', 'Help', b( 300, 0, 200, 20 ) ), el( 9, 7, 'a', 'Contact', b( 300, 30, 200, 20 ), { href: '/contact' } ),
		el( 10, 2, 'p', 'Baked fresh every morning', b( 700, 0, 300, 300 ) ),
		el( 11, 1, 'p', 'Copyright', b( 0, 320, 1000, 40 ) ),
	];
	const kidsOf = ( x ) => els.filter( ( e ) => e.parentKey === x.key );
	const subtree = ( x ) => [ x, ...kidsOf( x ).flatMap( subtree ) ];
	const p = footerPlan( kidsOf( els[ 0 ] ), { subtree, kidsOf } );
	assert.equal( p.mode, 'none', 'the band of two side-by-side children is not read as the grid\'s holder' );
	const solo = els.filter( ( e ) => 'Root/10#0' !== e.key );
	const kidsOf2 = ( x ) => solo.filter( ( e ) => e.parentKey === x.key );
	const subtree2 = ( x ) => [ x, ...kidsOf2( x ).flatMap( subtree2 ) ];
	const q = footerPlan( kidsOf2( solo[ 0 ] ), { subtree: subtree2, kidsOf: kidsOf2 } );
	assert.deepEqual( [ q.mode, q.columns.map( ( x ) => x.key ), q.bottom.map( ( x ) => x.key ) ], [ 'grid', [ 'Root/2#0' ], [ 'Root/11#0' ] ], 'the same band holding the grid alone is its holder' );
} );
