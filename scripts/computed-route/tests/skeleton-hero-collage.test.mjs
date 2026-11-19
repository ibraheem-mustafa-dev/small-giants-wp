// A hero's collage (lib/skeleton-hero-collage.mjs, called from the hero rule and the inside-a-hero rule in lib/skeleton-rules.mjs):
// a positioned wrapper whose absolutely placed children include two or more that hold a picture stays a container, each placed
// child is an sgs/decorative-image layer paired with its draft element, the pictures inside the layers are not the hero's split
// media, and the hero stays a standard hero. Real case: a home hero with three tilted photo frames, a sticker and a tag over one
// another, which the route unwrapped into three absorbed pictures and no layers (2026-11-19). A hero with one picture beside its
// content stays the split hero. Pure: offline fixture inventories, no site. Mutation list: tests/skeleton-hero-collage.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { heroCollage } from '../lib/skeleton-hero-collage.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'fixture-client', repo: REPO } );
const MEDIA = '.sgs-hero__media > .sgs-media-el';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { splitBoxShadow: { slot: MEDIA, slots: [ MEDIA ] } } : {} );
const WIDTHS = [ 375, 768, 1440 ];

// rows: [ id, parent, tag, words, style, { position, w, h } ]; the box and position hold at every width.
function inventory( rows ) {
	const els = [];
	const add = ( id, parent, tag, words = '', style = '', geo = {} ) => {
		const depth = parent ? els.find( ( p ) => p.key === `Root/${ parent }#0` ).depth + 1 : 0;
		els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }"></${ tag }>`,
			box: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { x: 0, y: id * 10, w: geo.w ?? 100, h: geo.h ?? 20 } ] ) ), position: Object.fromEntries( WIDTHS.map( ( w ) => [ w, geo.position ?? 'static' ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
	};
	add( 1, null, 'main' );
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
const run = ( rows ) => proposeSkeleton( { inventory: inventory( rows ), facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } );
const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
const heroOf = ( r ) => all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
const nodeOf = ( r, id ) => all( r.skeleton ).find( ( n ) => n.draftRef?.tpl === `Root/${ id }#0` );
const rowOf = ( r, id ) => r.proposal.rows.find( ( x ) => x.key === `Root/${ id }#0` );
const ABS = { position: 'absolute' };
const REL = { position: 'relative' };
const HERO = { w: 1440, h: 760 };
const FRAME = 'position:absolute;width:46%;border:2px solid #3A2A22;padding:8px;transform:rotate(-9deg)';

// A hero with its copy in a left column and, on the right, a stage holding `pieces`.
const hero = ( stage, pieces ) => [
	[ 2, 1, 'section', '', 'display:grid', HERO ],
	[ 3, 2, 'div', '', 'display:flex;flex-direction:column', { w: 700, h: 400 } ], [ 4, 3, 'h1', 'Made for the mum who needs it most' ], [ 5, 3, 'p', 'Giant, filling cookies baked fresh.' ],
	stage, ...pieces,
];
const STAGE = [ 6, 2, 'div', '', 'position:relative;height:560px', { ...REL, w: 520, h: 560 } ];
// Two photo frames (each an absolute div holding a picture and a caption), a sticker and a tag.
const PILE = [
	[ 7, 6, 'div', '', FRAME, { ...ABS, w: 260, h: 340 } ], [ 8, 7, 'img', '', 'width:100%', { w: 240, h: 300 } ], [ 9, 7, 'div', 'fresh batch!', 'position:absolute;bottom:4px', { ...ABS, w: 200, h: 30 } ],
	[ 10, 6, 'div', '', FRAME, { ...ABS, w: 260, h: 340 } ], [ 11, 10, 'img', '', 'width:100%', { w: 240, h: 300 } ], [ 12, 10, 'div', 'for a new mum', 'position:absolute;bottom:4px', { ...ABS, w: 200, h: 30 } ],
	[ 13, 6, 'div', '', 'position:absolute;right:2%;bottom:14%;border-radius:999px', { ...ABS, w: 120, h: 120 } ], [ 14, 13, 'span', 'Baked with love' ],
];

test( 'MUST FAIL: a hero whose stage pins two photo frames is a standard hero, the stage a container and each placed child a decorative image layer', () => {
	const r = run( hero( STAGE, PILE ) );
	const h = heroOf( r );
	assert.ok( h, 'the section is the hero' );
	assert.notEqual( h.attributes.variant, 'split', JSON.stringify( h.attributes ) );
	assert.equal( h.draftSlots?.[ MEDIA ], undefined, 'no split-media slot is read' );
	assert.equal( rowOf( r, 6 ).block, 'sgs/container', 'the stage stays a container' );
	assert.equal( rowOf( r, 6 ).rule, 'heroCollage' );
	for ( const id of [ 7, 10, 13 ] ) {
		assert.equal( rowOf( r, id ).block, 'sgs/decorative-image', `element ${ id } is a layer` );
		assert.equal( rowOf( r, id ).rule, 'heroCollageLayer' );
	}
	const stage = nodeOf( r, 6 );
	assert.deepEqual( stage.innerBlocks.map( ( n ) => [ n.name, n.draftRef.tpl ] ), [ [ 'sgs/decorative-image', 'Root/7#0' ], [ 'sgs/decorative-image', 'Root/10#0' ], [ 'sgs/decorative-image', 'Root/13#0' ] ], 'the layers sit in the stage, each paired with its draft element, in draft order' );
} );

test( 'MUST FAIL: the pictures and captions inside the layers are blocks of their own, not absorbed into the hero', () => {
	const r = run( hero( STAGE, PILE ) );
	for ( const id of [ 8, 11 ] ) {
		assert.notEqual( rowOf( r, id ).action, 'absorbed', `picture ${ id } is not absorbed` );
		assert.ok( ! [ 'heroInner', 'heroBackdrop' ].includes( rowOf( r, id ).rule ), 'no hero rule claims it' );
		assert.ok( nodeOf( r, id ), `picture ${ id } has its own block` );
	}
	assert.equal( rowOf( r, 8 ).block, 'sgs/media', 'a picture inside a layer is a media block' );
	assert.notEqual( rowOf( r, 8 ).rule, 'heroCollageLayer', 'only the placed child is a layer' );
	assert.equal( nodeOf( r, 9 )?.name, 'sgs/text', 'the caption is its own text' );
	assert.ok( all( [ nodeOf( r, 7 ) ] ).includes( nodeOf( r, 8 ) ), 'the picture sits inside its layer' );
} );

// The wrapper that sets the stage beside the hero's words: the hero holds a collage, so it does not lay out the columns.
const wrapped = ( colHeight ) => [
	[ 2, 1, 'section', '', 'display:block', HERO ], [ 20, 2, 'div', '', 'display:grid', { w: 1240, h: 600 } ],
	[ 3, 20, 'div', '', 'display:flex;flex-direction:column', { w: 700, h: colHeight } ], [ 4, 3, 'h1', 'Made for the mum who needs it most' ], [ 5, 3, 'p', 'Giant, filling cookies baked fresh.' ],
	[ 6, 20, 'div', '', 'position:relative;height:560px', { ...REL, w: 520, h: 560 } ], ...PILE,
];

test( 'MUST FAIL: the wrapper laying the stage beside the words, and the column of words, stay containers in a collage hero', () => {
	const r = run( wrapped( 400 ) );
	for ( const id of [ 20, 3 ] ) {
		assert.equal( rowOf( r, id ).block, 'sgs/container', `element ${ id } stays a container` );
		assert.equal( rowOf( r, id ).rule, 'heroCollageRow' );
	}
	assert.deepEqual( nodeOf( r, 20 ).innerBlocks.map( ( n ) => n.draftRef.tpl ), [ 'Root/3#0', 'Root/6#0' ], 'the grid holds the column then the stage' );
	assert.deepEqual( nodeOf( r, 3 ).innerBlocks.map( ( n ) => n.name ), [ 'sgs/heading', 'sgs/text' ] );
	assert.equal( rowOf( r, 6 ).rule, 'heroCollage' );
	assert.notEqual( heroOf( r ).attributes.variant, 'split' );
} );

test( 'a wrapper that stacks the words above the stage is not a row: it is unwrapped as before', () => {
	const r = run( wrapped( 20 ) );
	assert.notEqual( rowOf( r, 20 ).rule, 'heroCollageRow' );
	assert.equal( rowOf( r, 20 ).action, 'unwrap' );
	assert.equal( rowOf( r, 6 ).rule, 'heroCollage', 'the stage is still a collage' );
} );

// The heading's inline photo (a chip of a picture set among the words) is part of the heading, never the hero's media.
const INLINE = [ 15, 4, 'img', '', 'height:1em', { w: 60, h: 50 } ];

test( 'MUST FAIL: a picture set inline in the hero heading does not make a collage hero split', () => {
	const r = run( hero( STAGE, [ ...PILE, INLINE ] ) );
	assert.notEqual( heroOf( r ).attributes.variant, 'split', JSON.stringify( heroOf( r ).attributes ) );
	assert.equal( heroOf( r ).draftSlots?.[ MEDIA ], undefined );
} );

// Negative controls: what is not a collage keeps its old verdicts.
test( 'a hero with one picture beside its content stays a split hero', () => {
	const r = run( hero( STAGE, [ [ 7, 6, 'img', '', 'width:100%', { w: 520, h: 560 } ] ] ) );
	assert.equal( heroOf( r ).attributes.variant, 'split' );
	assert.equal( rowOf( r, 7 ).action, 'absorbed' );
	assert.equal( rowOf( r, 6 ).rule, 'heroInner' );
} );

test( 'an inline heading picture beside a real column picture leaves the split hero split', () => {
	const r = run( hero( STAGE, [ [ 7, 6, 'img', '', 'width:100%', { w: 520, h: 560 } ], INLINE ] ) );
	assert.equal( heroOf( r ).attributes.variant, 'split' );
} );

test( 'one picture frame with a floating badge on it stays a split hero', () => {
	const r = run( hero( STAGE, [ PILE[ 0 ], PILE[ 1 ], PILE[ 2 ], PILE[ 6 ], PILE[ 7 ] ] ) );
	assert.equal( heroOf( r ).attributes.variant, 'split' );
	assert.notEqual( rowOf( r, 6 ).rule, 'heroCollage' );
	assert.notEqual( rowOf( r, 7 ).rule, 'heroCollageLayer' );
} );

test( 'two framed pictures in a stage that is not positioned, or placed in the flow, are not a collage', () => {
	const flat = run( hero( [ 6, 2, 'div', '', 'display:flex', { w: 520, h: 560 } ], PILE ) );
	assert.notEqual( rowOf( flat, 6 ).rule, 'heroCollage', 'a static stage places nothing over anything' );
	const inFlow = run( hero( STAGE, PILE.map( ( p ) => ( [ 7, 10 ].includes( p[ 0 ] ) ? [ p[ 0 ], p[ 1 ], p[ 2 ], p[ 3 ], 'width:46%', { w: 260, h: 340 } ] : p ) ) ) );
	assert.notEqual( rowOf( inFlow, 6 ).rule, 'heroCollage', 'frames in the flow are a gallery, not a pile' );
} );

test( 'a positioned wrapper that holds the h1 is the content, not a collage stage', () => {
	const r = run( [ [ 2, 1, 'section', '', 'display:grid', HERO ], [ 6, 2, 'div', '', 'position:relative', { ...REL, w: 1200, h: 560 } ], [ 4, 6, 'h1', 'Made for the mum who needs it most' ], ...PILE.slice( 0, 6 ) ] );
	assert.notEqual( rowOf( r, 6 ).rule, 'heroCollage' );
} );

test( 'a pile outside a hero is not read by this rule', () => {
	const r = run( [ [ 2, 1, 'section', '', 'padding:40px', { w: 1440, h: 700 } ], [ 3, 2, 'h2', 'Our story' ], [ 6, 2, 'div', '', 'position:relative', { ...REL, w: 520, h: 560 } ], ...PILE ] );
	assert.ok( ! r.proposal.rows.some( ( x ) => 'heroCollage' === x.rule || 'heroCollageLayer' === x.rule ) );
} );

test( 'heroCollage reads the widest shown box of the hero and finds each stage once, with every element under a layer', () => {
	const inv = inventory( hero( STAGE, PILE ) );
	const byKey = Object.fromEntries( inv.elements.map( ( e ) => [ e.key, e ] ) );
	const m = { byKey, words: ( e ) => e.words, blockKids: ( e ) => inv.elements.filter( ( k ) => k.parentKey === e.key ) };
	const desc = ( e ) => m.blockKids( e ).flatMap( ( k ) => [ k, ...desc( k ) ] );
	const isMedia = ( k ) => 'img' === k.tag;
	const c = heroCollage( { hero: byKey[ 'Root/2#0' ], m, desc, isMedia } );
	assert.deepEqual( [ ...c.stages ], [ [ 'Root/6#0', [ 'Root/7#0', 'Root/10#0', 'Root/13#0' ] ] ] );
	assert.equal( c.layerOf.get( 'Root/8#0' ), 'Root/7#0' );
	assert.equal( c.layerOf.get( 'Root/14#0' ), 'Root/13#0' );
	assert.equal( c.layerOf.has( 'Root/6#0' ), false, 'the stage is not under a layer' );
	assert.equal( c.rows.size, 0, 'no wrapper stands between the stage and the hero' );
	assert.equal( heroCollage( { hero: { ...byKey[ 'Root/2#0' ], visible: {} }, m, desc, isMedia } ).stages.size, 0, 'a hero shown at no width has no box to read' );
	assert.equal( heroCollage( { hero: byKey[ 'Root/2#0' ], m, desc, isMedia, minPictureLayers: 3 } ).stages.size, 0, 'two picture layers are fewer than three' );
} );
