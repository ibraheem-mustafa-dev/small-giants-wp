// Universal part pairing (Spec 48 §3.4, FR-48-3; RC1, RC3, RC11): every part a block draws itself is paired with the draft
// element standing there, from the DB's css_element and the calibrated slots, never a rule naming the part; a list item's
// marker reaches its item; a form stands on the card that holds its controls; one draft element is one node's.
// Fixture: a client draft's saved inventories and calibration, reduced (tests/fixtures/universal-part-pairing/reduced.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { pairParts, pairSkeletonParts, partTree, spreads } from '../lib/skeleton-part-pairing.mjs';
import { listMarkerDecisions } from '../lib/fill-list-marker.mjs';
import { formElement } from '../lib/skeleton-form-element.mjs';
import { sharedElementProblems } from '../lib/skeleton-one-node.mjs';

const db = openDb();
const F = JSON.parse( fs.readFileSync( new URL( './fixtures/universal-part-pairing/reduced.json', import.meta.url ), 'utf8' ) );
const finder = ( e ) => ( { tpl: e.key } );
const isMedia = ( e ) => [ 'img', 'image-slot' ].includes( e.tag );
const run = ( block, els, rootKey, extra = () => ( {} ) ) => {
	const m = inventoryModel( { elements: els } );
	const cal = F.cal[ block ];
	return pairParts( { db, block, cal, paint: cal.elements, m, el: m.byKey[ rootKey ], own: () => true, isMedia, finder, ...extra( m ) } );
};
const SPLIT = '.sgs-hero__media > .sgs-hero__split-media';
const SLIDE = ( k ) => `.sgs-testimonial-slider__stage > .sgs-testimonial-slider__track > .sgs-testimonial-slider__list > .sgs-testimonial-slider__slide:nth-of-type(${ k })`;
const ITEM = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k })`;
const listItems = () => F.elements.list.filter( ( e ) => e.key.startsWith( 'Root/706#' ) );

test( 'MUST FAIL (a block-drawn frame no rule names is paired): the hero\'s split media is the picture frame inside the media column, its content the column holding the inner blocks', () => {
	const kids = [ 'Root/206#0', 'Root/207#0', 'Root/208#0', 'Root/211#0' ];
	const r = run( 'sgs/hero', F.elements.hero, 'Root/203#0', ( m ) => ( { own: ( e ) => ! kids.includes( e.key ), children: kids.map( ( k ) => ( { el: m.byKey[ k ], name: 'sgs/heading' } ) ) } ) );
	assert.equal( r.slots[ SPLIT ]?.tpl, 'Root/216#0' );
	assert.equal( r.slots[ '.sgs-hero__media' ]?.tpl, 'Root/215#0' );
	assert.equal( r.slots[ '.sgs-hero__content' ]?.tpl, 'Root/205#0' );
	// With no inner blocks known, the media part still never takes the grid holding another node's element.
	const bare = run( 'sgs/hero', F.elements.hero, 'Root/203#0', () => ( { own: ( e ) => ! kids.includes( e.key ) } ) );
	assert.equal( bare.slots[ '.sgs-hero__media' ]?.tpl, 'Root/215#0' );
	// Two frames that fit equally are no evidence: the media part stays unpaired.
	const twin = F.elements.hero.filter( ( e ) => /\/21[567]#0$/.test( e.key ) ).map( ( e ) => ( { ...e, key: e.key.replace( '#0', '#9' ), parentKey: '/215#0' === e.key.slice( -6 ) ? e.parentKey : e.parentKey.replace( '#0', '#9' ) } ) );
	const two = run( 'sgs/hero', [ ...F.elements.hero, ...twin ], 'Root/203#0', ( m ) => ( { own: ( e ) => ! kids.includes( e.key ), children: kids.map( ( k ) => ( { el: m.byKey[ k ], name: 'sgs/heading' } ) ) } ) );
	assert.ok( ! ( '.sgs-hero__media' in two.slots ) );
	// A setting only a state paints (the linked icon's hover) names no part.
	assert.ok( ! partTree( { db, block: 'sgs/icon', cal: F.cal[ 'sgs/icon' ] } ).targets.includes( '.sgs-icon__link' ) );
	// Negative control: layers the draft does not draw stay unpaired with their reason, never guessed onto the grid.
	assert.ok( ! ( '.sgs-hero__overlay' in r.slots ) && ! ( '.sgs-hero__video-bg' in r.slots ) );
	assert.match( r.unpaired.find( ( u ) => '.sgs-hero__overlay' === u.slot ).reason, /no element of its own/ );
} );

test( 'MUST FAIL (content a draft places out of flow): the hero\'s content is the absolutely placed column holding its inner blocks, while its video layer stays the out-of-flow layer', () => {
	const kids = [ 'Root/120#0', 'Root/121#0', 'Root/122#0', 'Root/123#0' ];
	const r = run( 'sgs/hero', F.elements.layeredHero, 'Root/114#0', ( m ) => ( { own: ( e ) => ! kids.includes( e.key ), children: kids.map( ( k ) => ( { el: m.byKey[ k ], name: 'sgs/text' } ) ) } ) );
	assert.equal( r.slots[ '.sgs-hero__content' ]?.tpl, 'Root/119#0' );
	assert.equal( r.slots[ '.sgs-hero__video-bg' ]?.tpl, 'Root/115#0' );
	// Negative control: the overlay part, which holds no kind, is not matched on the looser test.
	assert.ok( ! ( '.sgs-hero__overlay' in r.slots ) );
} );

test( 'MUST FAIL (a slider\'s slide is paired): the draft draws one card at a time between its arrows, so the first slide is the card and the rest are named', () => {
	const r = run( 'sgs/testimonial-slider', F.elements.slider, 'Root/270#0' );
	assert.equal( r.slots[ SLIDE( 1 ) ]?.tpl, 'Root/274#0' );
	assert.ok( ! ( SLIDE( 2 ) in r.slots ) );
	assert.match( r.unpaired.find( ( u ) => SLIDE( 2 ) === u.slot ).reason, /one copy/ );
	// Negative control: a stage with a child more than the block draws pairs nothing by order.
	const extra = { ...F.elements.slider.find( ( e ) => 'Root/273#0' === e.key ), key: 'Root/999#0', parentKey: 'Root/271#0' };
	assert.ok( ! ( SLIDE( 1 ) in run( 'sgs/testimonial-slider', [ ...F.elements.slider, extra ], 'Root/270#0' ).slots ) );
} );

test( 'MUST FAIL (an icon\'s shape is paired): a block root with no box settings draws its one child part as the box the draft\'s single element is; the glyph the draft lacks is named', () => {
	const r = run( 'sgs/icon', F.elements.icon, 'Root/244#0' );
	assert.equal( r.slots[ '.sgs-icon__shape' ]?.tpl, 'Root/244#0' );
	assert.ok( ! ( '.sgs-icon__shape > .sgs-icon__glyph' in r.slots ) );
} );

test( 'negative control: a block whose root holds its own box settings never pairs a part onto a leaf draft element (a heading\'s link part on a bare h1)', () => {
	const r = run( 'sgs/heading', [ { key: 'Root/1#0', parentKey: null, depth: 0, tag: 'h1', words: 'Title', visible: { 375: true, 768: true, 1440: true } } ], 'Root/1#0' );
	assert.deepEqual( r.slots, {} );
	assert.ok( r.unpaired.length > 0 );
} );

test( 'MUST FAIL (a list\'s items pair with the unit\'s copies): each item is its draft link, its text the link\'s own words and its icon the marker inside it', () => {
	const r = run( 'sgs/icon-list', F.elements.list, 'Root/706#0', () => ( { items: listItems() } ) );
	for ( let k = 1; k <= 6; k++ ) {
		assert.equal( r.slots[ ITEM( k ) ]?.tpl, `Root/706#${ k - 1 }` );
		assert.equal( r.slots[ `${ ITEM( k ) } > .sgs-icon-list__icon` ]?.tpl, `Root/707#${ k - 1 }` );
		assert.equal( r.slots[ `${ ITEM( k ) } > .sgs-icon-list__text` ]?.tpl, `Root/706#${ k - 1 }` );
	}
	assert.ok( ! ( '.sgs-icon-list__heading' in r.slots ) );
} );

test( 'a slot an earlier pass gave stands, and another node\'s element is never a part', () => {
	const m = inventoryModel( { elements: F.elements.list } );
	const node = { name: 'sgs/icon-list', draftRef: { tpl: 'Root/706#0' }, draftSlots: { [ ITEM( 1 ) ]: { tpl: 'Root/707#0' } }, innerBlocks: [] };
	const other = { name: 'sgs/icon', draftRef: { tpl: 'Root/707#1' }, innerBlocks: [] };
	const out = pairSkeletonParts( { db, tree: [ node, other ], m, finder, calSettings: ( b ) => F.cal[ b ]?.settings || {}, calPaint: ( b ) => F.cal[ b ]?.elements || {}, unitItems: new Map( [ [ node, listItems() ] ] ) } );
	assert.equal( node.draftSlots[ ITEM( 1 ) ].tpl, 'Root/707#0' );
	assert.equal( node.draftSlots[ ITEM( 3 ) ]?.tpl, 'Root/706#2' );
	assert.ok( ! ( `${ ITEM( 2 ) } > .sgs-icon-list__icon` in node.draftSlots ) );
	assert.ok( out.unpaired.some( ( u ) => `${ ITEM( 2 ) } > .sgs-icon-list__icon` === u.slot ) );
} );

// A wrapper level one side lacks (QC of RC1): the block's boxes the draft does not draw, and a draft box holding several parts.
const TRACK = '.sgs-brand-strip__track > .sgs-brand-strip__set';
const TILE = ( k ) => `${ TRACK } > .sgs-brand-strip__tile:nth-of-type(${ k })`;
test( 'MUST FAIL (boxes only the block draws): the logo strip\'s tiles are the draft\'s copies, each tile\'s item its link and the picture inside it, through the track and set the draft does not draw', () => {
	const r = run( 'sgs/brand-strip', F.elements.strip, 'Root/222#0' );
	for ( const k of [ 1, 2 ] ) {
		assert.equal( r.slots[ `${ TILE( k ) } > .sgs-brand-strip__item` ]?.tpl, `Root/224#${ k - 1 }` );
		assert.equal( r.slots[ `${ TILE( k ) } > .sgs-brand-strip__item > .sgs-media` ]?.tpl, `Root/225#${ k - 1 }` );
	}
	assert.match( r.unpaired.find( ( u ) => '.sgs-brand-strip__track' === u.slot ).reason, /box the draft does not draw/ );
	// Negative controls: the tile's name, which the draft does not draw, and the text items another render draws, stay unpaired.
	assert.match( r.unpaired.find( ( u ) => `${ TILE( 1 ) } > .sgs-brand-strip__name` === u.slot ).reason, /no element of its own/ );
	assert.match( r.unpaired.find( ( u ) => /__item:nth-of-type\(1\) > \.sgs-brand-strip__brand-text$/.test( u.slot ) ).reason, /another render/ );
} );

const ENTRY = ( k ) => `.sgs-timeline__list > .sgs-timeline__entry:nth-of-type(${ k })`;
test( 'MUST FAIL (copies beside a non-repeated sibling): the timeline\'s entries pair with the draft\'s loop beside the progress line, the content with the span holding title and text', () => {
	const r = run( 'sgs/timeline', F.elements.timeline, 'Root/258#0' );
	for ( const k of [ 1, 2 ] ) {
		assert.equal( r.slots[ ENTRY( k ) ]?.tpl, `Root/260#${ k - 1 }` );
		assert.equal( r.slots[ `${ ENTRY( k ) } > .sgs-timeline__date` ]?.tpl, `Root/261#${ k - 1 }` );
		assert.equal( r.slots[ `${ ENTRY( k ) } > .sgs-timeline__content > .sgs-timeline__title` ]?.tpl, `Root/263#${ k - 1 }` );
	}
	// Negative controls: the description's link and the progress fill the draft does not draw stay unpaired.
	assert.ok( r.unpaired.some( ( u ) => u.slot === `${ ENTRY( 1 ) } > .sgs-timeline__content > .sgs-timeline__description > p > a` ) );
	assert.ok( r.unpaired.some( ( u ) => /__progress-fill$/.test( u.slot ) ) );
} );

const STEP = ( k ) => `.sgs-process-steps__step:nth-of-type(${ k })`;
test( 'MUST FAIL (a draft box only the draft draws): a step\'s number, title and description pair with the number and the two elements inside the span the draft wraps them in', () => {
	const r = run( 'sgs/process-steps', F.elements.steps, 'Root/298#0' );
	assert.deepEqual( [ 'number', 'title', 'description' ].map( ( p ) => r.slots[ `${ STEP( 1 ) } > .sgs-process-steps__${ p }` ]?.tpl ), [ 'Root/301#0', 'Root/303#0', 'Root/304#0' ] );
	// Negative control: with the description gone from the draft the numbers no longer meet, and nothing is guessed.
	const short = run( 'sgs/process-steps', F.elements.steps.filter( ( e ) => ! e.key.startsWith( 'Root/304#' ) ), 'Root/298#0' );
	assert.ok( ! ( `${ STEP( 1 ) } > .sgs-process-steps__description` in short.slots ) );
	assert.ok( ! ( `${ STEP( 1 ) } > .sgs-process-steps__title` in short.slots ) );
} );

test( 'MUST FAIL (the glyph box only the block draws): an icon drawn as a button holding its svg gives the shape the button and the glyph\'s svg the svg', () => {
	const key = 'Root>Frame Card@139#0/10#0';
	const r = run( 'sgs/icon', F.elements.svgIcon, key );
	assert.equal( r.slots[ '.sgs-icon__shape' ]?.tpl, key );
	assert.equal( r.slots[ '.sgs-icon__shape > .sgs-icon__glyph > svg' ]?.tpl, 'Root>Frame Card@139#0/11#0' );
	assert.ok( ! ( '.sgs-icon__shape > .sgs-icon__glyph' in r.slots ), 'the svg is never the glyph box' );
	// A draft that draws the icon as the bare svg: the svg part is that svg, never the path inside it.
	const bare = run( 'sgs/icon', F.elements.svgIcon.filter( ( e ) => 'button' !== e.tag ).map( ( e ) => ( 'svg' === e.tag ? { ...e, parentKey: null } : e ) ), 'Root>Frame Card@139#0/11#0' );
	assert.equal( bare.slots[ '.sgs-icon__shape > .sgs-icon__glyph > svg' ]?.tpl, 'Root>Frame Card@139#0/11#0' );
} );

test( 'a draft box is read as its children only for content parts and only when one reading fits', () => {
	const y = ( k, kids = [] ) => ( { k, kids } );
	const below = ( e ) => e.kids;
	const a = y( 'a' ), b = y( 'b', [ y( 'b1' ), y( 'b2' ) ] ), c = y( 'c', [ y( 'c1' ), y( 'c2' ) ] );
	assert.deepEqual( spreads( [ a, b ], [ 1, 2, 3 ], below ).map( ( e ) => e.k ), [ 'a', 'b1', 'b2' ] );
	assert.equal( spreads( [ b, c ], [ 1, 2, 3 ], below ), null, 'two readings fit: no evidence' );
	assert.equal( spreads( [ a, b ], [ 1, 2, 3 ], below, ( p ) => 2 === p ), null, 'a part holding parts never takes a child of a spread box' );
	assert.deepEqual( spreads( [ a, b ], [ 1, 2 ], below, () => true ), [ a, b ], 'equal numbers need no reading' );
} );

const LUCIDE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MARK = ( k ) => `${ ITEM( k ) } > .sgs-icon-list__icon`;
const items = [ { text: 'Certifications', url: '/certifications/' }, { text: 'Careers', url: '/careers/' } ];
const marker = ( reads, block = 'sgs/icon-list' ) => listMarkerDecisions( { db, block, cal: F.cal[ block ], attributes: { items }, reads } );

test( 'MUST FAIL (an item\'s own glyph reaches its item): an svg marker at each paired marker part is read by the icon reader and written to that item', () => {
	const r = marker( { [ MARK( 1 ) ]: { svg: { markup: LUCIDE } }, [ MARK( 2 ) ]: { svg: { markup: LUCIDE } } } );
	const w = r.writes.find( ( x ) => 'items' === x.attr );
	assert.deepEqual( w.value.map( ( i ) => [ i.iconSource, i.iconName, i.text ] ), [ [ 'lucide', 'check', 'Certifications' ], [ 'lucide', 'check', 'Careers' ] ] );
} );

test( 'MUST FAIL (the marker type follows the draft, read through the DB): a painted dot at every item is a bullet, written only where the DB lists it', () => {
	const r = marker( { [ MARK( 1 ) ]: { words: '' }, [ MARK( 2 ) ]: { words: '' } } );
	assert.ok( ! r.writes.some( ( x ) => 'items' === x.attr ) );
	const row = r.unmapped.find( ( u ) => 'marker' === u.property );
	assert.ok( row ? 'bullet' === row.value : r.writes.some( ( x ) => 'bullet' === x.value ), 'a bullet is written where the DB lists it, else a named row' );
	assert.equal( marker( {} ).unmapped.find( ( u ) => 'marker' === u.property )?.value ?? marker( {} ).writes.find( ( x ) => 'none' === x.value )?.value, 'none' );
} );

// The DB as the marker setting's allowed values will read once the seeder holds them (icon, emoji, bullet, none).
const listed = { prepare: ( sql ) => ( /css_property IS NULL AND enum_values IS NOT NULL/.test( sql ) ? { all: () => [ { attr_name: 'markerType', enum_values: '["icon","emoji","bullet","none"]' } ] } : db.prepare( sql ) ) };
test( 'MUST FAIL (a marker type the DB lists is written, one it does not list is a named row)', () => {
	const dots = listMarkerDecisions( { db: listed, block: 'sgs/icon-list', cal: F.cal[ 'sgs/icon-list' ], attributes: { items }, reads: { [ MARK( 1 ) ]: { words: '' }, [ MARK( 2 ) ]: { words: '' } } } );
	assert.deepEqual( dots.writes, [ { attr: 'markerType', value: 'bullet', merge: 'replace' } ] );
	const numbers = listMarkerDecisions( { db: listed, block: 'sgs/icon-list', cal: F.cal[ 'sgs/icon-list' ], attributes: { items }, reads: { [ MARK( 1 ) ]: { words: '1' }, [ MARK( 2 ) ]: { words: '2' } } } );
	assert.deepEqual( [ numbers.writes, numbers.unmapped.map( ( u ) => u.value ) ], [ [], [ 'numbered' ] ] );
} );

test( 'negative control: items whose markers differ choose no marker type, and a block with no icon item keeps its settings', () => {
	assert.match( marker( { [ MARK( 1 ) ]: { svg: { markup: LUCIDE } }, [ MARK( 2 ) ]: { words: '' } } ).notes.join(), /differ/ );
	assert.deepEqual( marker( {}, 'sgs/heading' ), { writes: [], unmapped: [], notes: [] } );
} );

test( 'MUST FAIL (a form stands on its card): a form root holding the controls in one child beside an aside is the page\'s grid, the form is the card', () => {
	const m = inventoryModel( { elements: F.elements.form } );
	const root = m.els.find( ( e ) => 0 === e.depth );
	assert.equal( formElement( m, root ).key, 'Root>TradeApplication@466#0/7#0' );
	// A control standing straight in the root, beside an aside, leaves the root the form.
	const loose = inventoryModel( { elements: F.elements.form.filter( ( e ) => e.depth <= 1 || 'Root>TradeApplication@466#0/39#0' === e.key ).map( ( e ) => ( 'Root>TradeApplication@466#0/7#0' === e.key ? { ...e, tag: 'input' } : e ) ) } );
	assert.equal( formElement( loose, loose.els.find( ( e ) => 0 === e.depth ) ).key, root.key );
	// Negative control: a root whose controls sit with nothing beside them is the form itself.
	const card = inventoryModel( { elements: F.elements.form.filter( ( e ) => ! /\/(86|103)#0$/.test( e.key ) ) } );
	assert.equal( formElement( card, card.els.find( ( e ) => 0 === e.depth ) ).key, root.key );
} );

test( 'MUST FAIL (one draft element is one node\'s): a node and a node inside it on one draft element are refused, naming both; copies in parallel branches stand', () => {
	const at = ( tpl, name, innerBlocks = [] ) => ( { name, draftRef: { tpl }, innerBlocks } );
	const nested = [ at( 'Root/6#0', 'sgs/container', [ at( 'Root/6#0', 'sgs/form' ) ] ) ];
	assert.deepEqual( sharedElementProblems( nested ), [ 'draft element Root/6#0 is written to two nodes, sgs/container[0] and sgs/container[0] > sgs/form[0]: one draft element is one node\'s' ] );
	const twins = [ at( 'Root/6#0', 'sgs/container' ), at( 'Root/6#0', 'sgs/form' ) ];
	assert.equal( sharedElementProblems( twins ).length, 1 );
	const steps = [ { name: 'sgs/form', innerBlocks: [ { name: 'sgs/form-step', innerBlocks: [ at( 'Root/23#0', 'sgs/heading' ) ] }, { name: 'sgs/form-step', innerBlocks: [ at( 'Root/23#0', 'sgs/heading' ) ] } ] } ];
	assert.deepEqual( sharedElementProblems( steps ), [] );
	assert.deepEqual( sharedElementProblems( [ at( 'Root/14#0', 'sgs/button' ), { ...at( 'Root/14#0', 'sgs/button' ), variantKey: 'Root/18#0' } ] ), [] );
} );
