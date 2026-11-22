// A split hero clones with the draft's order and reads its picture (Spec 48 FR-48-6, rules.hero.splitOrder and
// rules.heroInner.part, lib/skeleton-hero-order.mjs). Mama's Munches' Contact page draws its words first and a small
// picture below them on a phone; the hero's phone order defaults to the picture first, and the proposal wrote no order,
// so the clone put the picture on top (MUST FAIL). The picture the hero absorbs was read nowhere, so its width (150, 200
// and 240px against a full-column clone) was never compared (MUST FAIL). Negative controls: a draft drawing its picture
// first keeps that order, and a hero with no picture writes no order and no media slot. Pure functions only.
// Mutation list: tests/skeleton-hero-order.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { heroSplitOrder, mediaFirst, heroMediaAlignment } from '../lib/skeleton-hero-order.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'fixture-client', repo: REPO } );
const MEDIA = '.sgs-hero__media > .sgs-media-el';
const CONTENT = '.sgs-hero__content';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { contentGap: { slot: CONTENT, slots: [ CONTENT ] }, splitMaxWidth: { slot: MEDIA, slots: [ MEDIA ] }, splitHeight: { slot: MEDIA, slots: [ MEDIA ] } } : {} );
const W = [ 375, 768, 1440 ];

// main > hero section > grid > [ column > (eyebrow, h1, lead), img ], then a second section. boxes: { key: { width: box } }.
function inventory( boxes, { picture = true } = {} ) {
	const els = [];
	const add = ( id, parent, tag, words = '', style = '' ) => {
		const depth = parent ? els.find( ( p ) => p.key === `Root/${ parent }#0` ).depth + 1 : 0;
		const box = Object.fromEntries( W.map( ( w ) => [ w, boxes[ id ]?.[ w ] || { x: 0, y: id * 30, w: 100, h: 20 } ] ) );
		els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box, visible: { 375: true, 768: true, 1440: true }, display: style.includes( 'grid' ) ? 'grid' : style.includes( 'flex' ) ? 'flex' : 'block', flexDirection: style.includes( 'column' ) ? 'column' : 'row', screenshots: {} } );
	};
	add( 1, null, 'main' );
	add( 2, 1, 'section', '', 'padding:64px 40px' );
	add( 3, 2, 'div', '', 'display:grid;grid-template-columns:1.4fr 1fr;align-items:center' );
	add( 4, 3, 'div', '', 'display:flex;flex-direction:column;gap:14px' );
	add( 5, 4, 'div', 'pop the kettle on' );
	add( 6, 4, 'h1', 'Say hello to Zainab' );
	add( 7, 4, 'p', 'Questions about an order? Get in touch however suits you.' );
	picture && add( 8, 3, 'img', '', 'width:240px;justify-self:center' );
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

// The Contact page as measured (E:/sgs-tmp/general-cloning/hero/shots-before/contact.probe.json): side by side at 768
// and 1440, the picture under the words at 375.
const CONTACT = {
	5: { 375: { x: 19, y: 117, w: 336, h: 42 }, 768: { x: 31, y: 129, w: 473, h: 46 }, 1440: { x: 99, y: 148, w: 952, h: 63 } },
	6: { 375: { x: 20, y: 173, w: 335, h: 92 }, 768: { x: 32, y: 189, w: 472, h: 112 }, 1440: { x: 100, y: 225, w: 952, h: 78 } },
	7: { 375: { x: 20, y: 279, w: 335, h: 79 }, 768: { x: 32, y: 315, w: 472, h: 84 }, 1440: { x: 100, y: 317, w: 520, h: 93 } },
	8: { 375: { x: 103, y: 372, w: 168, h: 162 }, 768: { x: 524, y: 164, w: 225, h: 216 }, 1440: { x: 1085, y: 166, w: 269, h: 260 } },
};
// The mirror image: the picture left of the words, and above them on a phone.
const PICTURE_FIRST = {
	5: { 375: { x: 19, y: 300, w: 336, h: 42 }, 768: { x: 260, y: 129, w: 473, h: 46 }, 1440: { x: 400, y: 148, w: 952, h: 63 } },
	6: { 375: { x: 20, y: 350, w: 335, h: 92 }, 768: { x: 260, y: 189, w: 472, h: 112 }, 1440: { x: 400, y: 225, w: 952, h: 78 } },
	7: { 375: { x: 20, y: 450, w: 335, h: 79 }, 768: { x: 260, y: 315, w: 472, h: 84 }, 1440: { x: 400, y: 317, w: 520, h: 93 } },
	8: { 375: { x: 103, y: 117, w: 168, h: 162 }, 768: { x: 24, y: 164, w: 225, h: 216 }, 1440: { x: 85, y: 166, w: 269, h: 260 } },
};

const run = ( boxes, o ) => proposeSkeleton( { inventory: inventory( boxes, o ), facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } );
const heroOf = ( r ) => {
	const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	return all( r.skeleton ).find( ( n ) => 'sgs/hero' === n.name );
};

test( 'MUST FAIL: a hero drawing its words first on a phone and beside its picture wider up writes content first at tablet and phone', () => {
	const hero = heroOf( run( CONTACT ) );
	assert.equal( hero.attributes.variant, 'split' );
	assert.deepEqual( hero.attributes.splitContentOrder, { tablet: 'content-first', mobile: 'content-first' } );
} );

test( 'MUST FAIL: a picture the draft centres in its column (justify-self) is centred by the split media alignment', () => {
	assert.deepEqual( heroOf( run( CONTACT ) ).attributes.splitAlignment, { desktop: 'center' } );
} );

test( 'the alignment comes from justify-self or auto side margins; a picture with neither writes none', () => {
	const rule = { setting: 'splitAlignment', keywords: { center: 'center', end: 'end', right: 'end', start: 'start' } };
	assert.deepEqual( heroMediaAlignment( { style: { 'justify-self': 'end' }, rule } ), { desktop: 'end' } );
	assert.deepEqual( heroMediaAlignment( { style: { margin: '0 auto' }, rule } ), { desktop: 'center' } );
	assert.deepEqual( heroMediaAlignment( { style: { 'margin-left': 'auto', 'margin-right': 'auto' }, rule } ), { desktop: 'center' } );
	assert.equal( heroMediaAlignment( { style: { margin: '0 auto 0 0' }, rule } ), null, 'one auto side is not centring' );
	assert.equal( heroMediaAlignment( { style: { width: '240px' }, rule } ), null );
	assert.equal( heroMediaAlignment( { style: { 'justify-self': 'stretch' }, rule } ), null, 'a keyword the setting has no value for writes none' );
} );

test( 'MUST FAIL: the picture the hero absorbs is the draft element of its split media slot', () => {
	assert.deepEqual( heroOf( run( CONTACT ) ).draftSlots?.[ MEDIA ], { tpl: 'Root/8#0' } );
	assert.deepEqual( heroOf( run( CONTACT ) ).draftSlots?.[ CONTENT ], { tpl: 'Root/4#0' }, 'the content column keeps its own slot' );
} );

test( 'negative control: a hero drawing its picture first keeps the picture first at every device', () => {
	assert.deepEqual( heroOf( run( PICTURE_FIRST ) ).attributes.splitContentOrder, { desktop: 'media-first', tablet: 'media-first', mobile: 'media-first' } );
} );

test( 'negative control: a hero with no picture writes no order and no media slot', () => {
	const hero = heroOf( run( CONTACT, { picture: false } ) );
	assert.equal( hero.attributes.variant, undefined );
	assert.equal( hero.attributes.splitContentOrder, undefined );
	assert.equal( hero.attributes.splitAlignment, undefined );
	assert.equal( hero.draftSlots?.[ MEDIA ], undefined );
} );

test( 'side by side the picture is first when its centre is left of the words; stacked, when it is higher up', () => {
	assert.equal( mediaFirst( { x: 500, y: 0, w: 200, h: 200 }, { x: 0, y: 20, w: 400, h: 100 } ), false );
	assert.equal( mediaFirst( { x: 0, y: 0, w: 200, h: 200 }, { x: 300, y: 20, w: 400, h: 100 } ), true );
	assert.equal( mediaFirst( { x: 100, y: 300, w: 150, h: 150 }, { x: 0, y: 0, w: 375, h: 280 } ), false );
	assert.equal( mediaFirst( { x: 100, y: 0, w: 150, h: 150 }, { x: 0, y: 170, w: 375, h: 280 } ), true );
} );

test( 'a value the setting does not store is not written and is named; a tier where the picture is hidden is left out', () => {
	const rule = { setting: 'splitContentOrder', contentFirst: { desktop: '', tablet: 'content-first', mobile: 'content-first' }, mediaFirst: { desktop: 'media-first', tablet: 'media-first', mobile: 'media-first' } };
	const box = ( b ) => ( { box: { 375: b, 768: b, 1440: b }, visible: { 375: true, 768: true, 1440: true } } );
	const words = [ box( { x: 0, y: 0, w: 300, h: 100 } ) ];
	const below = box( { x: 0, y: 200, w: 100, h: 100 } );
	const refused = heroSplitOrder( { media: below, words, rule, allowed: [ '', 'media-first' ] } );
	assert.equal( refused.value, null );
	assert.equal( refused.problems.length, 2 );
	assert.match( refused.problems[ 0 ], /content-first/ );
	const hiddenOnPhone = { ...below, visible: { 375: false, 768: true, 1440: true } };
	assert.deepEqual( heroSplitOrder( { media: hiddenOnPhone, words, rule } ).value, { tablet: 'content-first' } );
} );

// rules.hero.splitMedia: a picture too small to fill a column (an icon in an advice card, a thumbnail) and one inside a link
// or button (a control's own mark) are no split media: the hero stays plain and does not absorb them.
const SMALL = { ...CONTACT, 8: { 375: { x: 19, y: 117, w: 20, h: 20 }, 768: { x: 524, y: 164, w: 20, h: 20 }, 1440: { x: 1085, y: 166, w: 20, h: 20 } } };
const linked = ( boxes ) => {
	const inv = inventory( boxes );
	const img = inv.elements.find( ( e ) => 'Root/8#0' === e.key );
	const wrap = { ...inv.elements.find( ( e ) => 'Root/7#0' ), key: 'Root/9#0', tpl: 9, tag: 'a', srcTag: 'a', words: '', allText: '', attrs: { href: '/x' }, parentKey: 'Root/3#0', depth: 3, snippet: '<a data-dc-tpl="9"></a>' };
	img.parentKey = 'Root/9#0';
	img.depth = 4;
	inv.elements.splice( inv.elements.indexOf( img ), 0, wrap );
	return proposeSkeleton( { inventory: inv, facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } );
};
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );

test( 'MUST FAIL: a 20px icon in a hero is no split picture: the hero is plain and the icon is not absorbed into it', () => {
	const r = run( SMALL );
	assert.equal( heroOf( r ).attributes.variant, undefined );
	assert.equal( heroOf( r ).draftSlots?.[ MEDIA ], undefined );
	assert.notEqual( rowOf( r, 'Root/8#0' ).rule, 'heroInner', 'the icon is built, not dropped into the hero' );
	// Negative control: the same hero with its real picture is the split hero.
	assert.equal( heroOf( run( CONTACT ) ).attributes.variant, 'split' );
} );

test( 'MUST FAIL: a picture inside a link is no split picture even when it is wide', () => {
	const r = linked( CONTACT );
	assert.equal( heroOf( r ).attributes.variant, undefined );
	// Negative control: the same picture outside a link is the split hero.
	assert.equal( heroOf( run( CONTACT ) ).attributes.variant, 'split' );
} );
