// Which wrapper is the hero's content column (Spec 48 FR-48-6, lib/skeleton-rules.mjs heroInner, lib/skeleton-write-slots.mjs::hostSlot):
// only the wrapper holding the hero's heading and every worded element of the hero outside its media. A sub-list inside the hero
// (a stacked run of ticks under the lead, an eyebrow and heading pair above it) holds part of the words, so it never gives the
// hero's content gap its slot (MUST FAIL). Pure functions only. Mutation list: tests/skeleton-hero-column.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'fixture-client', repo: REPO } );
const CONTENT = '.sgs-hero__content';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { contentGap: { slot: CONTENT, slots: [ CONTENT ] } } : {} );

// main > [ hero section > rows, a second section ]. rows: [ id, parent, tag, words, style ], depth from the parent chain.
function inventory( rows ) {
	const els = [];
	const add = ( id, parent, tag, words = '', style = '' ) => {
		const depth = parent ? els.find( ( p ) => p.key === `Root/${ parent }#0` ).depth + 1 : 0;
		els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 30, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: style.includes( 'flex' ) ? 'flex' : 'block', flexDirection: style.includes( 'column' ) ? 'column' : 'row', screenshots: {} } );
	};
	add( 1, null, 'main' );
	add( 2, 1, 'section', '', 'padding:64px 40px' );
	rows.forEach( ( r ) => add( ...r ) );
	add( 90, 1, 'section', '', 'padding:72px 40px' );
	add( 91, 90, 'div', '', 'display:flex;flex-direction:column;gap:24px' );
	add( 92, 91, 'h2', 'Write to us' );
	add( 93, 91, 'p', 'We reply within a day.' );
	for ( const e of [ ...els ].reverse() ) {
		const parent = els.find( ( p ) => p.key === e.parentKey );
		parent && ( parent.allText = [ parent.allText, e.allText ].filter( Boolean ).join( ' ' ).trim() );
	}
	return { checks: {}, source: 'fixture', root: 'main', generated: 'fixture', elements: els };
}
const COL = 'display:flex;flex-direction:column;gap:12px';
const run = ( rows ) => proposeSkeleton( { inventory: inventory( rows ), facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } );
const heroOf = ( r ) => {
	const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	return all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
};

test( 'MUST FAIL: a stacked run of ticks under the hero\'s lead is not the hero\'s content column', () => {
	const r = run( [ [ 3, 2, 'h1', 'Say hello' ], [ 4, 2, 'p', 'Questions about an order? Get in touch.' ], [ 5, 2, 'div', '', COL ], [ 6, 5, 'p', 'Baked fresh' ], [ 7, 5, 'p', 'Sent next day' ] ] );
	assert.ok( heroOf( r ), 'the first section is the hero' );
	assert.equal( heroOf( r ).draftSlots?.[ CONTENT ], undefined, 'the ticks never give the content gap its slot' );
} );

test( 'MUST FAIL: an eyebrow and heading pair above the lead is not the hero\'s content column', () => {
	const r = run( [ [ 3, 2, 'div', '', COL ], [ 4, 3, 'p', 'pop the kettle on' ], [ 5, 3, 'h1', 'Say hello' ], [ 6, 2, 'p', 'Questions about an order? Get in touch.' ] ] );
	assert.equal( heroOf( r ).draftSlots?.[ CONTENT ], undefined );
} );

test( 'negative control: the column holding the heading and every worded element, ticks included, is the content column', () => {
	const r = run( [ [ 3, 2, 'div', '', COL ], [ 4, 3, 'p', 'pop the kettle on' ], [ 5, 3, 'h1', 'Say hello' ], [ 6, 3, 'p', 'Questions about an order?' ], [ 7, 3, 'div', '', COL ], [ 8, 7, 'p', 'Baked fresh' ], [ 9, 7, 'p', 'Sent next day' ], [ 10, 2, 'img' ] ] );
	assert.deepEqual( heroOf( r ).draftSlots?.[ CONTENT ], { tpl: 'Root/3#0' } );
	const caption = run( [ [ 3, 2, 'div', '', 'display:grid;grid-template-columns:1fr 1fr' ], [ 4, 3, 'div', '', COL ], [ 5, 4, 'h1', 'Say hello' ], [ 6, 4, 'p', 'Questions about an order?' ], [ 7, 3, 'image-slot' ], [ 8, 7, 'span', 'Photo to come' ] ] );
	assert.deepEqual( heroOf( caption ).draftSlots?.[ CONTENT ], { tpl: 'Root/4#0' }, 'words inside the hero\'s media (a placeholder\'s caption) belong to the media, not the content' );
} );
