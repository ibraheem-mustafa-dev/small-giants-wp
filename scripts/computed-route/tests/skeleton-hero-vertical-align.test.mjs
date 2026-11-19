// A hero whose content block the draft places absolutely against the hero's bottom (or top) edge takes that side as its
// vertical alignment (lib/skeleton-hero-background.mjs::contentAnchor, rules.hero.verticalAlignment, called from the hero rule in
// lib/skeleton-rules.mjs). Real case: Eye Care Home's hero is a section whose content block is `position: absolute; bottom: 0`
// (words at the bottom left of the photo); no setting of the hero reads an absolute placement, so the clone centred the words.
// An in-flow block is placed by the hero's own alignment, which Fill reads, so it is left alone. Pure: offline fixture inventories.
// Mutation list: tests/skeleton-hero-vertical-align.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { contentAnchor } from '../lib/skeleton-hero-background.mjs';
import { lintSkeleton } from '../lint.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );
const WIDTHS = [ 375, 768, 1440 ];
const MEDIA = '.sgs-hero__media > .sgs-media-el';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { splitBoxShadow: { slot: MEDIA, slots: [ MEDIA ] } } : {} );

// rows: [ id, parent, tag, words, style, geo ]; geo: { w, h, y, position }, each also a function of the width.
function inventory( rows ) {
	const els = [];
	const at = ( v, w, d ) => ( 'function' === typeof v ? v( w ) : v ?? d );
	const add = ( id, parent, tag, words = '', style = '', geo = {} ) => {
		const depth = parent ? els.find( ( p ) => p.key === `Root/${ parent }#0` ).depth + 1 : 0;
		els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }"></${ tag }>`,
			box: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { x: 0, y: at( geo.y, w, id * 10 ), w: at( geo.w, w, 100 ), h: at( geo.h, w, 20 ) } ] ) ), position: Object.fromEntries( WIDTHS.map( ( w ) => [ w, at( geo.position, w, 'static' ) ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
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
const run = ( rows, f = facts() ) => proposeSkeleton( { inventory: inventory( rows ), facts: f, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } );
const heroOf = ( r ) => {
	const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	return all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
};
// The hero (page y 100, 820 tall: its bottom edge is 920) and its content block of 300 at the given top and position.
const hero = ( content, extra = [] ) => [ [ 2, 1, 'section', '', 'position:relative', { w: 1440, h: 820, y: 100 } ], [ 20, 2, 'div', '', 'position:absolute', content ], [ 21, 20, 'h1', 'The same designer shades' ], [ 22, 20, 'p', 'Buying from the same suppliers.' ], ...extra ];
const ABS = { position: 'absolute', w: 1440, h: 300 };

test( 'MUST FAIL: an absolute content block flush with the hero\'s bottom edge makes the hero bottom-aligned, decided by the rule', () => {
	const h = heroOf( run( hero( { ...ABS, y: 620 } ) ) );
	assert.ok( h, 'the section is the hero' );
	assert.equal( h.attributes.verticalAlignment, undefined, 'a setting that paints CSS is no skeleton attribute (R-47-10)' );
	assert.deepEqual( lintSkeleton( run( hero( { ...ABS, y: 620 } ) ).skeleton, db ), [], 'the skeleton passes the style-value lint' );
	assert.deepEqual( h.decided, { verticalAlignment: 'bottom' } );
} );

test( 'MUST FAIL: an absolute content block flush with the hero\'s top edge makes it top-aligned', () => {
	const h = heroOf( run( hero( { ...ABS, y: 100 } ) ) );
	assert.deepEqual( h.decided, { verticalAlignment: 'top' } );
} );

test( 'the block is the outermost holder of the words, however deep the hero\'s wrappers go', () => {
	const rows = [ [ 2, 1, 'section', '', 'position:relative', { w: 1440, h: 820, y: 100 } ], [ 20, 2, 'div', '', 'position:absolute', { ...ABS, y: 620 } ], [ 23, 20, 'div', '', '', { w: 1000, h: 200, y: 640 } ], [ 21, 23, 'h1', 'The same designer shades' ], [ 22, 23, 'p', 'Buying from the same suppliers.' ] ];
	assert.deepEqual( heroOf( run( rows ) ).decided, { verticalAlignment: 'bottom' } );
} );

test( 'negative controls: an in-flow block, one filling the hero, one floating inside it and one that disagrees between widths set no alignment', () => {
	const none = ( content, why ) => {
		const h = heroOf( run( hero( content ) ) );
		assert.ok( h, why );
		assert.equal( h.attributes.verticalAlignment, undefined, why );
		assert.equal( h.decided, undefined, why );
	};
	none( { position: 'static', w: 1440, h: 300, y: 620 }, 'in flow: the hero\'s own alignment places it' );
	none( { ...ABS, h: 820, y: 100 }, 'filling the hero: no side' );
	none( { ...ABS, y: 400 }, 'floating inside the hero: neither edge' );
	none( { ...ABS, y: ( w ) => ( 375 === w ? 100 : 620 ) }, 'top at one width and bottom at another: no single value' );
	none( { ...ABS, position: ( w ) => ( 375 === w ? 'static' : 'absolute' ), y: 620 }, 'absolute at some widths only' );
} );

test( 'a split hero (a picture beside the content) and a hero whose words sit in the hero itself are left alone', () => {
	const split = run( hero( { ...ABS, y: 620 }, [ [ 30, 2, 'img', '', '', { w: 400, h: 400, y: 200 } ] ] ) );
	assert.equal( heroOf( split ).attributes.variant, 'split' );
	assert.equal( heroOf( split ).attributes.verticalAlignment, undefined );
	assert.equal( heroOf( split ).decided, undefined );
	const bare = run( [ [ 2, 1, 'section', '', 'position:relative', { w: 1440, h: 820, y: 100 } ], [ 21, 2, 'h1', 'The same designer shades' ], [ 22, 2, 'p', 'Buying from the same suppliers.' ] ] );
	assert.equal( heroOf( bare ).attributes.verticalAlignment, undefined );
} );

test( 'the rule is data: without rules.hero.verticalAlignment, or with a value the setting does not hold, nothing is set', () => {
	const off = facts();
	off.decisions = structuredClone( off.decisions );
	delete off.decisions.rules.hero.verticalAlignment;
	assert.equal( heroOf( run( hero( { ...ABS, y: 620 } ), off ) ).decided, undefined );
	const odd = facts();
	odd.decisions = structuredClone( odd.decisions );
	odd.decisions.rules.hero.verticalAlignment.values.bottom = 'lowest';
	assert.equal( heroOf( run( hero( { ...ABS, y: 620 } ), odd ) ).decided, undefined );
} );

test( 'contentAnchor reads page-coordinate boxes to a pixel and takes no words as no anchor', () => {
	const mk = ( key, depth, o = {} ) => ( { key, depth, visible: { 375: true, 768: true, 1440: true }, ...o } );
	const box = ( y, h ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { x: 0, y, w: 100, h } ] ) );
	const pos = ( p ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, p ] ) );
	const heroEl = mk( 'h', 1, { box: box( 100, 800 ) } );
	const col = mk( 'c', 2, { box: box( 600.6, 300 ), position: pos( 'absolute' ), words: '' } );
	const word = mk( 'w', 3, { words: 'Words', box: box( 700, 20 ), position: pos( 'static' ) } );
	const m = { words: ( k ) => k.words || '' };
	const desc = ( k ) => ( 'h' === k.key ? [ col, word ] : 'c' === k.key ? [ word ] : [] );
	const isMedia = () => false;
	assert.equal( contentAnchor( { hero: heroEl, m, desc, isMedia } ), 'bottom', 'a block 0.4px off the edge is flush' );
	col.box = box( 603, 300 );
	assert.equal( contentAnchor( { hero: heroEl, m, desc, isMedia } ), null, 'three pixels off the edge is not flush' );
	col.box = box( 600.6, 300 );
	assert.equal( contentAnchor( { hero: heroEl, m: { words: () => '' }, desc, isMedia } ), null, 'no worded element: no content block to anchor' );
} );
