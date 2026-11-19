// The wrapper that frames a hero's picture is the draft element of the hero's split-media slot (Spec 48 FR-48-6,
// rules.heroInner.frame in data/skeleton-decisions.json, lib/skeleton-rules.mjs hero rule, lib/skeleton-propose.mjs framePending).
// A draft frames its hero picture with a wrapper (`border: 5px solid white; border-radius: 22px; overflow: hidden; aspect-ratio:
// 3 / 2`) around an image placeholder. The hero's rule absorbed the picture and unwrapped the wrapper, so the split media part
// read the placeholder (no border, no corners) and the clone's hero photo lost its white frame and rounded corners (2026-11-19).
// The frame is the outermost wrapper above the picture that holds the picture alone and declares a paint. Pure: offline
// fixture inventories, no site. Mutation list: tests/skeleton-hero-frame.mutations.json.
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
const MEDIA = '.sgs-hero__media > .sgs-media-el';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { splitBoxShadow: { slot: MEDIA, slots: [ MEDIA ] }, splitBackground: { slot: MEDIA, slots: [ MEDIA ] }, splitFit: { slot: MEDIA, slots: [ MEDIA ] } } : {} );

function inventory( rows ) {
	const els = [];
	const add = ( id, parent, tag, words = '', style = '' ) => {
		const depth = parent ? els.find( ( p ) => p.key === `Root/${ parent }#0` ).depth + 1 : 0;
		els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 10, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
	};
	add( 1, null, 'main' );
	add( 2, 1, 'section', '', 'padding:64px 40px' );
	rows.forEach( ( r ) => add( ...r ) );
	add( 90, 1, 'section', '', 'padding:72px 40px' );
	add( 91, 90, 'h2', 'Write to us' );
	add( 92, 90, 'p', 'We reply within a day.' );
	for ( const e of [ ...els ].reverse() ) {
		const parent = els.find( ( p ) => p.key === e.parentKey );
		parent && ( parent.allText = [ parent.allText, e.allText ].filter( Boolean ).join( ' ' ).trim() );
	}
	return { checks: {}, source: 'fixture', root: 'main', generated: 'fixture', elements: els };
}
const FRAME = 'border:5px solid #FFFFFF;border-radius:22px;overflow:hidden;aspect-ratio:3 / 2;box-shadow:0 34px 60px -30px rgba(44,62,80,.7)';
const COL = 'display:flex;flex-direction:column;gap:12px';
const GRID = 'display:grid;grid-template-columns:1fr 1fr';
const run = ( rows, o = {} ) => proposeSkeleton( { inventory: inventory( rows ), facts: o.facts || facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } );
const heroOf = ( r ) => {
	const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	return all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
};
// The hero's content column, then the picture's wrapper chain: outer (no paint) > frame (paints) > image placeholder.
const rowsWith = ( outer, frame ) => [ [ 3, 2, 'div', '', GRID ], [ 4, 3, 'div', '', COL ], [ 5, 4, 'h1', 'Say hello' ], [ 6, 4, 'p', 'Questions about an order?' ], [ 7, 3, 'div', '', outer ], [ 8, 7, 'div', '', frame ], [ 9, 8, 'image-slot' ] ];

test( 'MUST FAIL: the wrapper that frames the hero picture is the draft element of the split-media slot', () => {
	const r = run( rowsWith( 'position:relative;min-width:0', FRAME ) );
	assert.equal( heroOf( r ).attributes.variant, 'split' );
	assert.deepEqual( heroOf( r ).draftSlots?.[ MEDIA ], { tpl: 'Root/8#0' }, JSON.stringify( heroOf( r ).draftSlots ) );
	assert.match( r.proposal.rows.find( ( x ) => 'Root/2#0' === x.key ).slots[ MEDIA ].tpl, /^Root\/8#0$/ );
} );

test( 'MUST FAIL: the outermost painting wrapper is the frame, and a wrapper holding more than the picture is not', () => {
	const outerPaints = run( rowsWith( 'overflow:hidden', 'position:relative' ) );
	assert.deepEqual( heroOf( outerPaints ).draftSlots?.[ MEDIA ], { tpl: 'Root/7#0' } );
	// A caption beside the picture in the wrapper makes it a column of the hero, not the picture's frame.
	const withCaption = run( [ ...rowsWith( 'position:relative', FRAME ), [ 10, 8, 'p', 'Photo of the shop' ] ] );
	assert.notDeepEqual( heroOf( withCaption ).draftSlots?.[ MEDIA ], { tpl: 'Root/8#0' } );
} );

test( 'negative control: a picture with no painting wrapper keeps the slot it had (the picture itself), and the rule is off with its entry', () => {
	const bare = run( rowsWith( 'position:relative', 'position:relative' ) );
	assert.deepEqual( heroOf( bare ).draftSlots?.[ MEDIA ], { tpl: 'Root/9#0' } );
	const off = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	off.decisions = structuredClone( off.decisions );
	delete off.decisions.rules.heroInner.frame;
	const r = run( rowsWith( 'position:relative;min-width:0', FRAME ), { facts: off } );
	assert.deepEqual( heroOf( r ).draftSlots?.[ MEDIA ], { tpl: 'Root/9#0' } );
} );
