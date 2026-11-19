// A picture the draft lays behind a hero's content is the hero's background, never its split media (lib/skeleton-hero-background.mjs::behindContent,
// called from the hero rule in lib/skeleton-rules.mjs). Real case: Eye Care Home's hero is one section holding a parallax wrapper (absolute,
// inset -9% 0, taller than the hero) around the photo, two absolute gradient layers and an absolute content block; the rule took the photo
// for the split media, so the clone was a black column beside a bright photo (2026-11-19 run). A picture beside the content (Indus's hero:
// a framed column narrower than the hero, in flow) stays the split media. Pure: offline fixture inventories, no site.
// Mutation list: tests/skeleton-hero-background.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { behindContent } from '../lib/skeleton-hero-background.mjs';

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
const heroOf = ( r ) => {
	const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	return all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
};
const HERO = { w: 1440, h: 820 };
const ABS = { position: 'absolute' };
// A hero with a content block over a picture; `layer` is the picture's chain: [ [ id, parent, tag, words, style, geo ], ... ].
const hero = ( layer ) => [ [ 2, 1, 'section', '', 'position:relative', HERO ], ...layer, [ 20, 2, 'div', '', 'position:absolute;bottom:0', { ...ABS, w: 1440, h: 300 } ], [ 21, 20, 'h1', 'The same designer shades' ], [ 22, 20, 'p', 'Buying from the same suppliers.' ] ];

test( 'MUST FAIL: a picture under an absolute wrapper that covers the hero is the hero background, not its split media', () => {
	const r = run( hero( [ [ 3, 2, 'div', '', 'position:absolute;inset:-9% 0', { ...ABS, w: 1440, h: 968 } ], [ 4, 3, 'img', '', '', { w: 1440, h: 968 } ] ] ) );
	const h = heroOf( r );
	assert.ok( h, 'the section is the hero' );
	assert.notEqual( h.attributes.variant, 'split', JSON.stringify( h.attributes ) );
	assert.equal( h.draftSlots?.[ MEDIA ], undefined, 'no split-media slot is read' );
	assert.match( JSON.stringify( h.handover ), /background setting/ );
} );

test( 'MUST FAIL: a picture that is itself the absolute full-cover layer is the background too', () => {
	const h = heroOf( run( hero( [ [ 3, 2, 'img', '', 'position:absolute;inset:0', { ...ABS, w: 1440, h: 820 } ] ] ) ) );
	assert.notEqual( h.attributes.variant, 'split' );
} );

// Negative controls: a picture beside the content stays the split media.
test( 'a picture in a column narrower than the hero stays the split media', () => {
	const h = heroOf( run( [ [ 2, 1, 'section', '', 'display:grid', HERO ], [ 3, 2, 'div', '', 'display:flex', { w: 720, h: 820 } ], [ 4, 3, 'h1', 'Say hello' ], [ 5, 3, 'p', 'Questions about an order?' ], [ 6, 2, 'div', '', 'position:relative', { w: 720, h: 820 } ], [ 7, 6, 'img', '', '', { w: 720, h: 820 } ] ] ) );
	assert.equal( h.attributes.variant, 'split' );
	assert.match( JSON.stringify( h.handover ), /split media setting/ );
} );

test( 'an absolute picture that does not cover the hero, and a covering wrapper that holds words, stay the split media', () => {
	const small = heroOf( run( hero( [ [ 3, 2, 'div', '', 'position:absolute;right:0', { ...ABS, w: 600, h: 820 } ], [ 4, 3, 'img', '', '', { w: 600, h: 820 } ] ] ) ) );
	assert.equal( small.attributes.variant, 'split', 'a right-hand panel is beside the content' );
	const words = heroOf( run( hero( [ [ 3, 2, 'div', '', 'position:absolute;inset:0', { ...ABS, w: 1440, h: 820 } ], [ 4, 3, 'img', '', '', { w: 1440, h: 820 } ], [ 5, 3, 'p', 'A caption on the photo' ] ] ) ) );
	assert.equal( words.attributes.variant, 'split', 'a wrapper with words of its own is content, not a backdrop' );
} );

test( 'a picture in the page flow, even as wide as the hero, is not laid behind the content', () => {
	const h = heroOf( run( hero( [ [ 3, 2, 'img', '', '', { w: 1440, h: 820 } ] ] ) ) );
	assert.equal( h.attributes.variant, 'split' );
} );

test( 'behindContent reads the widest shown box of the hero and the ancestors of the picture only', () => {
	const inv = inventory( hero( [ [ 3, 2, 'div', '', 'position:absolute', { ...ABS, w: 1440, h: 820 } ], [ 4, 3, 'img', '', '', { w: 1440, h: 820 } ] ] ) );
	const byKey = Object.fromEntries( inv.elements.map( ( e ) => [ e.key, e ] ) );
	const m = { byKey, words: ( e ) => e.words };
	const desc = ( e ) => inv.elements.filter( ( k ) => k.parentKey === e.key ).flatMap( ( k ) => [ k, ...desc( k ) ] );
	assert.equal( behindContent( { hero: byKey[ 'Root/2#0' ], picture: byKey[ 'Root/4#0' ], m, desc } ), true );
	assert.equal( behindContent( { hero: { ...byKey[ 'Root/2#0' ], visible: {} }, picture: byKey[ 'Root/4#0' ], m, desc } ), false, 'a hero shown at no width has no box to cover' );
	assert.equal( behindContent( { hero: byKey[ 'Root/3#0' ], picture: byKey[ 'Root/4#0' ], m, desc } ), false, 'the wrapper is not above itself: nothing between the picture and its hero' );
} );
