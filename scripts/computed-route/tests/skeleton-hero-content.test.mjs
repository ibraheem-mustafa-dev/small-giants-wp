// The hero's content column (Spec 48 FR-48-6, lib/skeleton-rules.mjs heroInner, lib/skeleton-write-slots.mjs::hostSlot): the
// wrapper inside a hero that holds its words and no picture is the hero's content part, so it is the node's draftSlots entry
// at the calibrated slot of the rule's `contentSetting` and Fill reads its gap, padding and ground there. Real case: Mama's
// Munches Contact (2026-11-19 run): the text column (`display:flex; flex-direction:column; gap:14px`) was unwrapped with no
// slot, fill-report.md listed contentPadding, contentBackground, contentGap as "Not read", and the clone's label, heading and
// lead sat with no gap between them, so the hero's text column was 28px shorter than the draft's.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = ( drop = false ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	drop && delete f.decisions.rules.heroInner.contentSetting;
	return f;
};
const CONTENT = '.sgs-hero__content';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { contentGap: { slot: CONTENT, slots: [ CONTENT ] }, contentPadding: { slot: CONTENT, slots: [ CONTENT ] } } : {} );

// main > section(hero) > grid div > [ text column div > [ div, h1, p ], img? ]
function inventory( withImage = true ) {
	const els = [];
	const add = ( id, parent, depth, tag, words = '', style = '' ) => els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 30, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: style.includes( 'grid' ) ? 'grid' : style.includes( 'flex' ) ? 'flex' : 'block', flexDirection: style.includes( 'column' ) ? 'column' : 'row', screenshots: {} } );
	add( 1, null, 0, 'main' );
	add( 2, 1, 1, 'section', '', 'background:#F5C2C8;padding:64px 40px 72px' );
	add( 3, 2, 2, 'div', '', 'display:grid;grid-template-columns:1fr auto;gap:48px' );
	add( 4, 3, 3, 'div', '', 'display:flex;flex-direction:column;gap:14px' );
	add( 5, 4, 4, 'div', 'pop the kettle on' );
	add( 6, 4, 4, 'h1', 'Say hello' );
	add( 7, 4, 4, 'p', 'Questions about an order? Get in touch.' );
	withImage && add( 8, 3, 3, 'img' );
	add( 9, 1, 1, 'section', '', 'padding:72px 40px' );
	add( 10, 9, 2, 'div', '', 'display:flex;flex-direction:column;gap:24px' );
	add( 11, 10, 3, 'h2', 'Write to us' );
	add( 12, 10, 3, 'p', 'We reply within a day.' );
	for ( const e of [ ...els ].reverse() ) {
		const parent = els.find( ( p ) => p.key === e.parentKey );
		parent && ( parent.allText = [ parent.words, e.allText, parent.allText === parent.words ? '' : parent.allText.slice( parent.words.length ) ].filter( Boolean ).join( ' ' ).trim() );
	}
	return { checks: {}, source: 'fixture', root: 'main', generated: 'fixture', elements: els };
}
const run = ( o = {} ) => proposeSkeleton( { inventory: inventory( o.image ?? true ), facts: o.facts || facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings: o.calSettings || calSettings } );
const heroOf = ( r ) => {
	const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	return all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
};

test( 'MUST FAIL: the hero\'s text column is the draft element of the hero\'s content part, never the grid holding the picture', () => {
	const r = run();
	const hero = heroOf( r );
	assert.ok( hero, 'the first section is the hero' );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/4#0' === x.key )?.rule, 'heroInner', 'the text column is unwrapped by the hero rule' );
	assert.deepEqual( hero.draftSlots?.[ CONTENT ], { tpl: 'Root/4#0' }, 'the text column is read at the content slot' );
} );

test( 'negative control: a hero with no picture, a rule naming no content setting, or no calibrated slot gives no content slot from the grid', () => {
	// With no picture the grid holds one item, the text column: the column stacking the words is still the content.
	assert.deepEqual( heroOf( run( { image: false } ) ).draftSlots?.[ CONTENT ], { tpl: 'Root/4#0' } );
	assert.equal( heroOf( run( { facts: facts( true ) } ) ).draftSlots?.[ CONTENT ], undefined, 'no contentSetting, no slot' );
	assert.equal( heroOf( run( { calSettings: () => ( {} ) } ) ).draftSlots?.[ CONTENT ], undefined, 'no calibrated slot, no slot' );
} );
